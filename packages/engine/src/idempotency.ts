import { createHash } from "node:crypto";

/**
 * Idempotency key for a side-effecting step execution. Keyed by
 * (run_id, step_id, item_index) — COGWORK_CONTEXT.md §10. Connectors that
 * support provider idempotency keys pass this through; others guard by checking
 * run_steps for a prior success before re-executing on resume.
 */
export function idempotencyKey(runId: string, stepId: string, itemIndex: number): string {
  return createHash("sha256")
    .update(`${runId}::${stepId}::${itemIndex}`)
    .digest("hex")
    .slice(0, 32);
}
