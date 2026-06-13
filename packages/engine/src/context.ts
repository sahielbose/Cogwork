import type { RunContext } from "@cogwork/spec";
import type { RunStep } from "@cogwork/db";

/**
 * Rebuild a run context from already-completed run_steps (resume-safe —
 * COGWORK_CONTEXT.md §10). State lives in the DB, not in memory, so a run can
 * resume after a pause or a process restart.
 *
 * - A non-forEach step contributes its single succeeded output.
 * - A forEach step contributes the array of per-item outputs, ordered by index.
 */
export function buildContextFromSteps(
  steps: RunStep[],
  opts: { trigger?: Record<string, unknown>; secrets?: Record<string, string> } = {},
): RunContext {
  const byStep = new Map<string, RunStep[]>();
  for (const s of steps) {
    if (s.status !== "succeeded") continue;
    const arr = byStep.get(s.stepId) ?? [];
    arr.push(s);
    byStep.set(s.stepId, arr);
  }

  const stepsCtx: Record<string, unknown> = {};
  for (const [stepId, rows] of byStep) {
    rows.sort((a, b) => a.itemIndex - b.itemIndex);
    const isForEach = rows.length > 1 || rows.some((r) => r.itemIndex > 0);
    stepsCtx[stepId] = isForEach ? rows.map((r) => r.output) : rows[0]!.output;
  }

  return { steps: stepsCtx, trigger: opts.trigger, secrets: opts.secrets };
}
