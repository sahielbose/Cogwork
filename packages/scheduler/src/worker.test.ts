import { describe, expect, it } from "vitest";
import { createWorkflow, getRunSteps, listRuns, upsertUserByEmail } from "@cogwork/db";
import { createTestDb } from "@cogwork/db/test-utils";
import { getToolCatalog } from "@cogwork/connectors";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { runWorkflowJob } from "./worker";

const spec: WorkflowSpec = {
  version: 1,
  name: "Scheduled brief",
  trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "UTC" },
  steps: [
    { id: "fetch", tool: "gmail.list_messages", params: { query: "x", max: 1 }, outputs: ["messages"] },
    {
      id: "brief",
      tool: "ai.generate",
      params: { instructions: "x", input: "{{ fetch.messages }}" },
      outputs: ["summary"],
    },
  ],
};

describe("runWorkflowJob (the cron/queue handler)", () => {
  it("creates and runs a fresh run for an active scheduled workflow", async () => {
    const { db, close } = await createTestDb();
    try {
      const user = await upsertUserByEmail(db, "sched@cogwork.test");
      const v = validateSpec(spec, getToolCatalog());
      const wf = await createWorkflow(db, {
        userId: user.id,
        name: spec.name,
        spec: v.spec!,
        triggerType: "schedule",
        scheduleCron: "0 8 * * 1-5",
        timezone: "UTC",
        status: "active",
        version: 1,
      });

      const out = await runWorkflowJob(db, wf.id, "schedule");
      expect("runId" in out).toBe(true);
      if ("runId" in out) {
        expect(out.result.status).toBe("succeeded");
        const steps = await getRunSteps(db, out.runId);
        expect(steps.every((s) => s.status === "succeeded")).toBe(true);
      }
      const runs = await listRuns(db, wf.id);
      expect(runs).toHaveLength(1);
      expect(runs[0]!.triggerSource).toBe("schedule");
    } finally {
      await close();
    }
  });

  it("skips a non-active workflow on a scheduled fire (no run created)", async () => {
    const { db, close } = await createTestDb();
    try {
      const user = await upsertUserByEmail(db, "sched2@cogwork.test");
      const v = validateSpec(spec, getToolCatalog());
      const wf = await createWorkflow(db, {
        userId: user.id,
        name: spec.name,
        spec: v.spec!,
        triggerType: "schedule",
        scheduleCron: "0 8 * * 1-5",
        timezone: "UTC",
        status: "paused",
        version: 1,
      });
      const out = await runWorkflowJob(db, wf.id, "schedule");
      expect(out).toEqual({ skipped: true });
      expect(await listRuns(db, wf.id)).toHaveLength(0);
    } finally {
      await close();
    }
  });
});
