import { describe, expect, it } from "vitest";
import { getToolCatalog, runAction, type AnyConnectorAction } from "@cogwork/connectors";
import {
  createRun,
  createWorkflow,
  getRun,
  getRunSteps,
  listRunApprovals,
  resolveApproval,
  upsertUserByEmail,
} from "@cogwork/db";
import { createTestDb } from "@cogwork/db/test-utils";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { executeRun } from "./run";

function brief(approval: "auto" | "required" = "auto"): WorkflowSpec {
  return {
    version: 1,
    name: "Morning briefing",
    trigger: { type: "manual" },
    steps: [
      {
        id: "fetch_emails",
        tool: "gmail.list_messages",
        params: { query: "is:unread newer_than:1d", max: 3 },
        outputs: ["messages"],
      },
      {
        id: "brief",
        tool: "ai.generate",
        params: { instructions: "Summarize", input: "{{ fetch_emails.messages }}" },
        outputs: ["summary", "drafts"],
      },
      {
        id: "notify",
        tool: "slack.post_message",
        params: { channel: "@me", text: "{{ brief.summary }}" },
        approval,
      },
    ],
  };
}

async function setup(specInput: WorkflowSpec) {
  const { db, close } = await createTestDb();
  const user = await upsertUserByEmail(db, "dev@cogwork.test");
  const v = validateSpec(specInput, getToolCatalog());
  expect(v.ok, v.errors.join("; ")).toBe(true);
  const spec = v.spec!;
  const wf = await createWorkflow(db, {
    userId: user.id,
    name: spec.name,
    spec,
    triggerType: spec.trigger.type,
    status: "active",
    version: 1,
  });
  const run = await createRun(db, {
    workflowId: wf.id,
    workflowVersion: 1,
    triggerSource: "manual",
    status: "queued",
  });
  return { db, close, spec, runId: run.id, userId: user.id };
}

describe("executeRun — end to end (fixture connectors)", () => {
  it("runs a multi-step spec, resolving bindings across steps", async () => {
    const { db, close, spec, runId } = await setup(brief("auto"));
    try {
      const result = await executeRun({ runId, spec, db });
      expect(result.status).toBe("succeeded");

      const steps = await getRunSteps(db, runId);
      const byId = Object.fromEntries(steps.map((s) => [s.stepId, s]));
      expect(byId.fetch_emails!.status).toBe("succeeded");
      expect(byId.brief!.status).toBe("succeeded");
      expect(byId.notify!.status).toBe("succeeded");

      // binding flowed: notify.text was set from brief.summary at runtime
      const notifyInput = byId.notify!.input as { text: string };
      expect(notifyInput.text).toContain("item(s) summarized");

      // forEach/aggregation not used here; brief produced a summary
      const briefOut = byId.brief!.output as { summary: string };
      expect(briefOut.summary).toContain("3 item(s) summarized");

      const run = await getRun(db, runId);
      expect(run!.status).toBe("succeeded");
    } finally {
      await close();
    }
  });

  it("redacts secret/PII fields before persisting step I/O", async () => {
    const { db, close, spec, runId } = await setup(brief("auto"));
    try {
      await executeRun({ runId, spec, db });
      const steps = await getRunSteps(db, runId);
      const fetch = steps.find((s) => s.stepId === "fetch_emails")!;
      const out = fetch.output as { messages: { from: string }[] };
      // emails masked (PII redaction) — local part hidden, domain kept
      expect(out.messages[0]!.from).toMatch(/\*\*\*@/);
      expect(out.messages[0]!.from).not.toContain("priya@");
    } finally {
      await close();
    }
  });
});

describe("executeRun — approval gate", () => {
  it("pauses (awaiting_approval) on a side-effect step and records an approval", async () => {
    const { db, close, spec, runId } = await setup(brief("required"));
    try {
      const result = await executeRun({ runId, spec, db });
      expect(result.status).toBe("awaiting_approval");

      const steps = await getRunSteps(db, runId);
      const byId = Object.fromEntries(steps.map((s) => [s.stepId, s]));
      expect(byId.fetch_emails!.status).toBe("succeeded");
      expect(byId.brief!.status).toBe("succeeded");
      expect(byId.notify!.status).toBe("pending");

      const approvals = await listRunApprovals(db, runId);
      expect(approvals).toHaveLength(1);
      expect(approvals[0]!.stepId).toBe("notify");
      expect(approvals[0]!.status).toBe("pending");
      const preview = approvals[0]!.preview as { tool: string };
      expect(preview.tool).toBe("slack.post_message");

      const run = await getRun(db, runId);
      expect(run!.status).toBe("awaiting_approval");
    } finally {
      await close();
    }
  });

  it("resumes after approval and does not re-invoke completed steps", async () => {
    const { db, close, spec, runId } = await setup(brief("required"));
    try {
      const counts: Record<string, number> = {};
      const counting = (
        action: AnyConnectorAction,
        input: unknown,
        ctx: Parameters<typeof runAction>[2],
        key: string,
      ) => {
        counts[action.name] = (counts[action.name] ?? 0) + 1;
        return runAction(action, input, ctx, key);
      };

      // first pass → pauses at notify
      const r1 = await executeRun({ runId, spec, db, invoke: counting });
      expect(r1.status).toBe("awaiting_approval");
      expect(counts["gmail.list_messages"]).toBe(1);
      expect(counts["ai.generate"]).toBe(1);
      expect(counts["slack.post_message"]).toBeUndefined();

      // approve
      const [approval] = await listRunApprovals(db, runId);
      await resolveApproval(db, approval!.id, "approved", null);

      // resume → completes; fetch + brief are NOT re-invoked
      const r2 = await executeRun({ runId, spec, db, invoke: counting });
      expect(r2.status).toBe("succeeded");
      expect(counts["gmail.list_messages"]).toBe(1); // unchanged → no double-invoke
      expect(counts["ai.generate"]).toBe(1);
      expect(counts["slack.post_message"]).toBe(1);

      const steps = await getRunSteps(db, runId);
      expect(steps.find((s) => s.stepId === "notify")!.status).toBe("succeeded");
    } finally {
      await close();
    }
  });
});
