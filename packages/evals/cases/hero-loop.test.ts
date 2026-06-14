import { describe, expect, it } from "vitest";
import { compileWorkflow, type GenerateFn } from "@cogwork/builder";
import { getToolCatalog } from "@cogwork/connectors";
import {
  createRun,
  createWorkflow,
  getRunSteps,
  listRunApprovals,
  resolveApproval,
  upsertUserByEmail,
} from "@cogwork/db";
import { createTestDb } from "@cogwork/db/test-utils";
import { executeRun } from "@cogwork/engine";
import type { WorkflowSpec } from "@cogwork/spec";

/**
 * The full hero loop as a single regression: a prompt compiles (mocked LLM) into
 * a real, validated spec, which then runs deterministically through the engine
 * against fixture connectors — pausing on the gated draft step, then resuming to
 * success after approval. Generation, the §4.4 validator, and the §10 engine are
 * all exercised; none is stubbed.
 */
const heroSpec: WorkflowSpec = {
  version: 1,
  name: "Morning briefing",
  trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "America/Los_Angeles" },
  steps: [
    { id: "fetch_emails", tool: "gmail.list_messages", params: { query: "is:unread newer_than:1d", max: 5 }, outputs: ["messages"] },
    {
      id: "brief",
      tool: "ai.generate",
      params: { instructions: "Summarize and draft replies", input: "{{ fetch_emails.messages }}" },
      outputs: ["summary", "drafts"],
    },
    {
      id: "draft_replies",
      tool: "gmail.create_draft",
      forEach: "{{ brief.drafts }}",
      params: { to: "{{ item.to }}", subject: "{{ item.subject }}", body: "{{ item.body }}" },
      approval: "required",
    },
    {
      id: "post_brief",
      tool: "slack.post_message",
      params: { channel: "@me", text: "{{ brief.summary }}" },
      approval: "auto",
    },
  ],
};

describe("hero loop: generate → validate → run → approve → trace", () => {
  it("compiles a runnable spec and runs it to success through the approval gate", async () => {
    const catalog = getToolCatalog();
    // 1) generation (mocked LLM, real validator + repair loop)
    const generate: GenerateFn = async () => ({ spec: heroSpec, usage: { input: 0, output: 0 } });
    const compiled = await compileWorkflow({
      prompt: "Every weekday at 8am summarize my unread email, draft replies, and DM me on Slack.",
      catalog,
      generate,
    });
    expect(compiled.valid).toBe(true);
    expect(compiled.spec!.steps.map((s) => s.tool)).toEqual(
      expect.arrayContaining(["gmail.list_messages", "ai.generate", "gmail.create_draft", "slack.post_message"]),
    );

    // 2) run the GENERATED spec through the real engine against fixtures
    const { db, close } = await createTestDb();
    try {
      const user = await upsertUserByEmail(db, "hero@cogwork.test");
      const wf = await createWorkflow(db, {
        userId: user.id,
        name: compiled.spec!.name,
        spec: compiled.spec!,
        triggerType: compiled.spec!.trigger.type,
        status: "active",
        version: 1,
      });
      const run = await createRun(db, {
        workflowId: wf.id,
        workflowVersion: 1,
        triggerSource: "manual",
        status: "queued",
      });

      // first pass → pauses on the gated draft step
      const r1 = await executeRun({ runId: run.id, spec: compiled.spec!, db, sleep: async () => {} });
      expect(r1.status).toBe("awaiting_approval");
      const steps1 = await getRunSteps(db, run.id);
      expect(steps1.find((s) => s.stepId === "fetch_emails")!.status).toBe("succeeded");
      expect(steps1.find((s) => s.stepId === "brief")!.status).toBe("succeeded");

      // approve every pending draft until the run finishes (forEach side-effect)
      let outcome = r1.status as string;
      for (let i = 0; i < 10 && outcome === "awaiting_approval"; i++) {
        const pending = (await listRunApprovals(db, run.id)).filter((a) => a.status === "pending");
        for (const a of pending) await resolveApproval(db, a.id, "approved", user.id);
        outcome = (await executeRun({ runId: run.id, spec: compiled.spec!, db, sleep: async () => {} })).status;
      }
      expect(outcome).toBe("succeeded");

      // the trace records every step succeeded
      const steps = await getRunSteps(db, run.id);
      expect(steps.find((s) => s.stepId === "post_brief")!.status).toBe("succeeded");
      expect(steps.filter((s) => s.stepId === "draft_replies").every((s) => s.status === "succeeded")).toBe(true);
    } finally {
      await close();
    }
  });
});
