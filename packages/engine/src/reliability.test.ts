import { describe, expect, it } from "vitest";
import { getToolCatalog, runAction, type AnyConnectorAction } from "@cogwork/connectors";
import {
  createRun,
  createWorkflow,
  getRun,
  getRunSteps,
  upsertUserByEmail,
} from "@cogwork/db";
import { createTestDb } from "@cogwork/db/test-utils";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { executeRun } from "./run";

async function setup(specInput: WorkflowSpec) {
  const { db, close } = await createTestDb();
  const user = await upsertUserByEmail(db, "rel@cogwork.test");
  const v = validateSpec(specInput, getToolCatalog());
  expect(v.ok, v.errors.join("; ")).toBe(true);
  const wf = await createWorkflow(db, {
    userId: user.id,
    name: v.spec!.name,
    spec: v.spec!,
    triggerType: v.spec!.trigger.type,
    status: "active",
    version: 1,
  });
  const run = await createRun(db, {
    workflowId: wf.id,
    workflowVersion: 1,
    triggerSource: "manual",
    status: "queued",
  });
  return { db, close, spec: v.spec!, runId: run.id };
}

const noSleep = async () => {};

describe("retries with backoff", () => {
  it("retries a transient failure and then succeeds", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Retry",
      trigger: { type: "manual" },
      steps: [
        {
          id: "gen",
          tool: "ai.generate",
          params: { instructions: "x" },
          retry: { max: 2, backoffMs: 5 },
          outputs: ["summary"],
        },
      ],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      let calls = 0;
      const invoke = async (
        action: AnyConnectorAction,
        input: unknown,
        ctx: Parameters<typeof runAction>[2],
        key: string,
      ) => {
        calls += 1;
        if (calls === 1) throw new Error("transient 503");
        return runAction(action, input, ctx, key);
      };
      const r = await executeRun({ runId, spec: norm, db, invoke, sleep: noSleep });
      expect(r.status).toBe("succeeded");
      expect(calls).toBe(2); // failed once, retried, succeeded
      const steps = await getRunSteps(db, runId);
      expect(steps[0]!.status).toBe("succeeded");
      expect(steps[0]!.attempt).toBe(2);
    } finally {
      await close();
    }
  });

  it("fails when retries are exhausted", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Always fails",
      trigger: { type: "manual" },
      steps: [
        { id: "gen", tool: "ai.generate", params: { instructions: "x" }, retry: { max: 1, backoffMs: 1 } },
      ],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      let calls = 0;
      const invoke = async () => {
        calls += 1;
        throw new Error("permanent failure");
      };
      const r = await executeRun({ runId, spec: norm, db, invoke, sleep: noSleep });
      expect(r.status).toBe("failed");
      expect(calls).toBe(2); // initial + 1 retry
      const run = await getRun(db, runId);
      expect(run!.status).toBe("failed");
      expect(run!.error).toMatch(/permanent failure/);
    } finally {
      await close();
    }
  });
});

describe("partial-failure resume", () => {
  it("injects a failure at step N, then resume skips 1..N-1 with no re-call", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Three step",
      trigger: { type: "manual" },
      steps: [
        { id: "fetch", tool: "gmail.list_messages", params: { query: "x", max: 2 }, outputs: ["messages"] },
        { id: "brief", tool: "ai.generate", params: { instructions: "x", input: "{{ fetch.messages }}" }, outputs: ["summary"] },
        { id: "notify", tool: "slack.post_message", params: { channel: "@me", text: "{{ brief.summary }}" }, approval: "auto" },
      ],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      const counts: Record<string, number> = {};
      let failBrief = true;
      const invoke = async (
        action: AnyConnectorAction,
        input: unknown,
        ctx: Parameters<typeof runAction>[2],
        key: string,
      ) => {
        counts[action.name] = (counts[action.name] ?? 0) + 1;
        if (action.name === "ai.generate" && failBrief) throw new Error("brief blew up");
        return runAction(action, input, ctx, key);
      };

      const r1 = await executeRun({ runId, spec: norm, db, invoke, sleep: noSleep });
      expect(r1.status).toBe("failed");
      expect(counts["gmail.list_messages"]).toBe(1);
      expect(counts["ai.generate"]).toBe(1);
      expect(counts["slack.post_message"]).toBeUndefined();

      // fix the transient condition and resume the SAME run
      failBrief = false;
      const r2 = await executeRun({ runId, spec: norm, db, invoke, sleep: noSleep });
      expect(r2.status).toBe("succeeded");
      // fetch (step before failure) is NOT re-invoked
      expect(counts["gmail.list_messages"]).toBe(1);
      expect(counts["ai.generate"]).toBe(2); // failed once, then succeeded on resume
      expect(counts["slack.post_message"]).toBe(1);
    } finally {
      await close();
    }
  });
});

describe("cost/token tracking", () => {
  it("accumulates usage from AI steps onto the run", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Cost",
      trigger: { type: "manual" },
      steps: [{ id: "gen", tool: "ai.generate", params: { instructions: "x" }, outputs: ["summary"] }],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      const invoke = async () => ({
        text: "ok",
        summary: "ok",
        usage: { input: 1200, output: 350 },
      });
      const r = await executeRun({ runId, spec: norm, db, invoke, sleep: noSleep });
      expect(r.status).toBe("succeeded");
      expect(r.tokenInput).toBe(1200);
      expect(r.tokenOutput).toBe(350);
      expect(r.costUsd).toBeGreaterThan(0);
      const run = await getRun(db, runId);
      expect(run!.tokenInput).toBe(1200);
      expect(run!.tokenOutput).toBe(350);
      expect(Number(run!.costUsd)).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });
});

describe("trigger payload (webhook context)", () => {
  it("resolves {{ trigger.payload.* }} into step params", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Webhook echo",
      trigger: { type: "webhook", path: "incoming" },
      steps: [
        {
          id: "gen",
          tool: "ai.generate",
          params: { instructions: "Hello {{ trigger.payload.name }}" },
          outputs: ["summary"],
        },
      ],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      const r = await executeRun({
        runId,
        spec: norm,
        db,
        sleep: noSleep,
        trigger: { payload: { name: "Cog" } },
      });
      expect(r.status).toBe("succeeded");
      const steps = await getRunSteps(db, runId);
      const input = steps[0]!.input as { instructions: string };
      expect(input.instructions).toBe("Hello Cog");
    } finally {
      await close();
    }
  });
});

describe("durable approval resume (survives a process restart)", () => {
  it("resolves an approval after a fresh executeRun call and continues", async () => {
    const spec: WorkflowSpec = {
      version: 1,
      name: "Gated",
      trigger: { type: "manual" },
      steps: [
        { id: "fetch", tool: "gmail.list_messages", params: { query: "x", max: 1 }, outputs: ["messages"] },
        { id: "notify", tool: "slack.post_message", params: { channel: "@me", text: "hi" }, approval: "required" },
      ],
    };
    const { db, close, spec: norm, runId } = await setup(spec);
    try {
      const r1 = await executeRun({ runId, spec: norm, db, sleep: noSleep });
      expect(r1.status).toBe("awaiting_approval");

      // Simulate a process restart: nothing in memory; resolve approval in DB.
      const { listRunApprovals, resolveApproval } = await import("@cogwork/db");
      const [approval] = await listRunApprovals(db, runId);
      await resolveApproval(db, approval!.id, "approved", null);

      // Fresh executeRun call (new "process") rebuilds context from run_steps.
      const r2 = await executeRun({ runId, spec: norm, db, sleep: noSleep });
      expect(r2.status).toBe("succeeded");
      const steps = await getRunSteps(db, runId);
      expect(steps.find((s) => s.stepId === "notify")!.status).toBe("succeeded");
    } finally {
      await close();
    }
  });
});
