import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WorkflowSpec } from "@cogwork/spec";
import type { Db } from "./client";
import { createTestDb } from "./test-utils";
import {
  createRun,
  createWorkflow,
  deletePreference,
  findRunStep,
  getRunWithSteps,
  listPendingApprovals,
  listWorkflowVersions,
  listWorkflows,
  loadPreferencesMap,
  resolveApproval,
  setPreference,
  setRunStatus,
  upsertApproval,
  upsertRunStep,
  upsertUserByEmail,
  writeAudit,
  listAudit,
} from "./queries";

let db: Db;
let close: () => Promise<void>;
let userId: string;

const spec: WorkflowSpec = {
  version: 1,
  name: "Test wf",
  trigger: { type: "manual" },
  steps: [{ id: "a", tool: "ai.generate", params: { instructions: "x" }, outputs: ["out"] }],
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  const user = await upsertUserByEmail(db, "dev@cogwork.test", { name: "Dev" });
  userId = user.id;
});

afterAll(async () => {
  await close();
});

describe("users", () => {
  it("upsert is idempotent on email", async () => {
    const a = await upsertUserByEmail(db, "dev@cogwork.test");
    const b = await upsertUserByEmail(db, "dev@cogwork.test");
    expect(a.id).toBe(b.id);
  });
});

describe("preferences", () => {
  it("sets, reads (map), updates, and deletes", async () => {
    await setPreference(db, userId, "tone", "concise");
    await setPreference(db, userId, "default_slack_channel", "@me");
    let map = await loadPreferencesMap(db, userId);
    expect(map).toMatchObject({ tone: "concise", default_slack_channel: "@me" });

    // upsert updates in place
    await setPreference(db, userId, "tone", "warm");
    map = await loadPreferencesMap(db, userId);
    expect(map.tone).toBe("warm");

    await deletePreference(db, userId, "tone");
    map = await loadPreferencesMap(db, userId);
    expect(map.tone).toBeUndefined();
  });
});

describe("workflows + versions", () => {
  it("create writes an initial version", async () => {
    const wf = await createWorkflow(db, {
      userId,
      name: "Test wf",
      spec,
      triggerType: "manual",
      status: "draft",
      version: 1,
    });
    const versions = await listWorkflowVersions(db, wf.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe(1);

    const list = await listWorkflows(db, userId);
    expect(list.some((w) => w.id === wf.id)).toBe(true);
  });
});

describe("runs + steps + approvals", () => {
  it("records a run trace with an upserted step and a resolvable approval", async () => {
    const wf = await createWorkflow(db, {
      userId,
      name: "Run wf",
      spec,
      triggerType: "manual",
      status: "active",
      version: 1,
    });
    const run = await createRun(db, {
      workflowId: wf.id,
      workflowVersion: 1,
      triggerSource: "manual",
      status: "running",
    });

    // upsert a step twice → single row, updated in place (idempotency)
    await upsertRunStep(db, {
      runId: run.id,
      stepId: "a",
      itemIndex: 0,
      tool: "ai.generate",
      status: "running",
      attempt: 1,
      idempotencyKey: "k1",
    });
    await upsertRunStep(db, {
      runId: run.id,
      stepId: "a",
      itemIndex: 0,
      tool: "ai.generate",
      status: "succeeded",
      output: { out: "hello" },
      attempt: 1,
      idempotencyKey: "k1",
    });
    const step = await findRunStep(db, run.id, "a", 0);
    expect(step?.status).toBe("succeeded");
    expect(step?.output).toEqual({ out: "hello" });

    // approval lifecycle
    await upsertApproval(db, {
      runId: run.id,
      stepId: "a",
      itemIndex: 0,
      preview: { summary: "do the thing" },
    });
    await setRunStatus(db, run.id, "awaiting_approval");

    const pending = await listPendingApprovals(db, userId);
    const mine = pending.find((p) => p.runId === run.id);
    expect(mine).toBeTruthy();
    expect(mine!.workflowName).toBe("Run wf");

    await resolveApproval(db, mine!.approval.id, "approved", userId);
    const stillPending = await listPendingApprovals(db, userId);
    expect(stillPending.find((p) => p.runId === run.id)).toBeUndefined();

    const full = await getRunWithSteps(db, run.id);
    expect(full?.steps).toHaveLength(1);
    expect(full?.approvals).toHaveLength(1);
  });
});

describe("audit log", () => {
  it("writes and lists entries", async () => {
    await writeAudit(db, {
      userId,
      action: "workflow.create",
      entity: "workflow",
      entityId: null,
      metadata: { name: "x" },
    });
    const rows = await listAudit(db, userId);
    expect(rows.some((r) => r.action === "workflow.create")).toBe(true);
  });
});
