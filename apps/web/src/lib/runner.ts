import {
  createRun,
  getApproval,
  getRun,
  getWorkflow,
  resolveApproval,
  writeAudit,
} from "@cogwork/db";
import { executeRun, type RunResult } from "@cogwork/engine";
import { COGWORK_RUN_MODE, getDb } from "./server";

/** Start a manual run of a workflow and execute it (Phase 0: synchronous). */
export async function startManualRun(
  workflowId: string,
): Promise<{ runId: string } & RunResult> {
  const db = getDb();
  const wf = await getWorkflow(db, workflowId);
  if (!wf) throw new Error("Workflow not found");
  const run = await createRun(db, {
    workflowId,
    workflowVersion: wf.version,
    triggerSource: "manual",
    status: "queued",
  });
  const result = await executeRun({ runId: run.id, spec: wf.spec, db, runMode: COGWORK_RUN_MODE });
  return { runId: run.id, ...result };
}

/** Resume a paused run from DB state (after an approval is resolved). */
export async function resumeRun(runId: string): Promise<RunResult> {
  const db = getDb();
  const run = await getRun(db, runId);
  if (!run) throw new Error("Run not found");
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf) throw new Error("Workflow not found");
  return executeRun({ runId, spec: wf.spec, db, runMode: COGWORK_RUN_MODE });
}

/** Resolve an approval (owned by userId) then resume the paused run. */
export async function resolveApprovalAndResume(
  approvalId: string,
  status: "approved" | "rejected",
  userId: string,
): Promise<{ runId: string; result: RunResult } | { error: "not_found" }> {
  const db = getDb();
  const approval = await getApproval(db, approvalId);
  if (!approval) return { error: "not_found" };
  const run = await getRun(db, approval.runId);
  if (!run) return { error: "not_found" };
  const wf = await getWorkflow(db, run.workflowId);
  if (!wf || wf.userId !== userId) return { error: "not_found" };

  await resolveApproval(db, approvalId, status, userId);
  await writeAudit(db, {
    userId,
    action: `approval.${status}`,
    entity: "approval",
    entityId: approvalId,
    metadata: { runId: run.id, stepId: approval.stepId },
  });
  const result = await resumeRun(run.id);
  return { runId: run.id, result };
}
