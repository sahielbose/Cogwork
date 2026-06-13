import {
  evalCondition,
  resolveParams,
  resolveValue,
  type RunContext,
  type Step,
  type WorkflowSpec,
} from "@cogwork/spec";
import {
  createConnectorContext,
  getAction,
  getRunMode,
  runAction,
  type AnyConnectorAction,
  type RunMode,
} from "@cogwork/connectors";
import {
  findApproval,
  getRun,
  getRunSteps,
  setRunStatus,
  updateRun,
  upsertApproval,
  upsertRunStep,
  type Db,
  type RunStep,
} from "@cogwork/db";
import { buildContextFromSteps } from "./context";
import { estimateCostUsd } from "./cost";
import { idempotencyKey } from "./idempotency";
import { redact } from "./redact";

export type RunOutcome = "succeeded" | "failed" | "awaiting_approval";

export interface RunResult {
  status: RunOutcome;
  error?: string;
  tokenInput: number;
  tokenOutput: number;
  costUsd: number;
}

export interface ExecuteRunOptions {
  runId: string;
  spec: WorkflowSpec;
  db: Db;
  trigger?: Record<string, unknown>;
  secrets?: Record<string, string>;
  runMode?: RunMode;
  /** default auto-retry attempts when a step omits `retry` (Phase 1 raises this). */
  defaultRetryMax?: number;
  // ── overridable for tests ──
  resolveAction?: (name: string) => AnyConnectorAction | undefined;
  invoke?: (
    action: AnyConnectorAction,
    input: unknown,
    ctx: ReturnType<typeof createConnectorContext>,
    key: string,
  ) => Promise<unknown>;
  redactor?: (v: unknown) => unknown;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

function needsApproval(step: Step, action: AnyConnectorAction | undefined): boolean {
  if (step.approval === "auto") return false;
  if (step.approval === "required") return true;
  return Boolean(action?.sideEffect); // inferred default
}

function readUsage(output: unknown): { input: number; output: number } | undefined {
  if (output && typeof output === "object" && "usage" in output) {
    const u = (output as { usage?: unknown }).usage;
    if (u && typeof u === "object" && "input" in u && "output" in u) {
      const inp = (u as { input: unknown }).input;
      const out = (u as { output: unknown }).output;
      if (typeof inp === "number" && typeof out === "number") return { input: inp, output: out };
    }
  }
  return undefined;
}

function backoffMs(step: Step, attempt: number): number {
  const base = step.retry?.backoffMs ?? 0;
  return base * Math.pow(2, attempt - 1);
}

/**
 * The deterministic spec interpreter — COGWORK_CONTEXT.md §10. No eval, no
 * executing generated code. State lives in run_steps (resume-safe); side-effect
 * steps pause for approval; retries don't double-invoke.
 */
export async function executeRun(opts: ExecuteRunOptions): Promise<RunResult> {
  const { runId, spec, db } = opts;
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const resolveAction = opts.resolveAction ?? getAction;
  const invoke = opts.invoke ?? runAction;
  const redactor = opts.redactor ?? redact;
  const runMode = opts.runMode ?? getRunMode();
  const defaultRetryMax = opts.defaultRetryMax ?? 0;

  const existingRun = await getRun(db, runId);
  const startedAt = existingRun?.startedAt ?? now();
  await setRunStatus(db, runId, "running", { startedAt });

  const existing = await getRunSteps(db, runId);
  const existingByKey = new Map<string, RunStep>();
  for (const s of existing) existingByKey.set(`${s.stepId}:${s.itemIndex}`, s);

  const ctx: RunContext = buildContextFromSteps(existing, {
    trigger: opts.trigger,
    secrets: opts.secrets,
  });

  let tokenInput = 0;
  let tokenOutput = 0;
  const accumulate = (output: unknown): void => {
    const u = readUsage(output);
    if (u) {
      tokenInput += u.input;
      tokenOutput += u.output;
    }
  };

  const finalize = async (status: RunOutcome, error?: string): Promise<RunResult> => {
    const costUsd = estimateCostUsd(tokenInput, tokenOutput);
    const patch: Parameters<typeof updateRun>[2] = { tokenInput, tokenOutput, costUsd };
    if (status !== "awaiting_approval") {
      const finishedAt = now();
      patch.status = status; // terminal status (succeeded | failed)
      patch.finishedAt = finishedAt;
      patch.durationMs = finishedAt.getTime() - startedAt.getTime();
      if (error) patch.error = error;
    }
    await updateRun(db, runId, patch);
    return { status, error, tokenInput, tokenOutput, costUsd };
  };

  for (const step of spec.steps) {
    const action = resolveAction(step.tool);

    // condition → skip
    if (step.condition && !evalCondition(step.condition, ctx)) {
      await upsertRunStep(db, {
        runId,
        stepId: step.id,
        itemIndex: 0,
        tool: step.tool,
        status: "skipped",
        attempt: 1,
        idempotencyKey: idempotencyKey(runId, step.id, 0),
        startedAt: now(),
        finishedAt: now(),
      });
      continue;
    }

    // items (forEach → array; otherwise a single pseudo-item)
    let items: unknown[];
    if (step.forEach) {
      const resolved = resolveValue(step.forEach, ctx);
      items = Array.isArray(resolved) ? resolved : [];
    } else {
      items = [undefined];
    }

    const outputs: unknown[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const itemIndex = step.forEach ? index : 0;
      const key = idempotencyKey(runId, step.id, itemIndex);
      const itemCtx: RunContext = { ...ctx, item, index };
      const prior = existingByKey.get(`${step.id}:${itemIndex}`);

      // resume / idempotency — reuse a prior success, never re-invoke
      if (prior?.status === "succeeded") {
        outputs.push(prior.output);
        accumulate(prior.output);
        continue;
      }

      // approval gate (side-effect steps)
      if (needsApproval(step, action)) {
        const approval = await findApproval(db, runId, step.id, itemIndex);
        if (!approval || approval.status === "pending") {
          const previewParams = redactor(resolveParams(step.params, itemCtx)) as Record<
            string,
            unknown
          >;
          await upsertApproval(db, {
            runId,
            stepId: step.id,
            itemIndex,
            preview: { tool: step.tool, params: previewParams },
          });
          await upsertRunStep(db, {
            runId,
            stepId: step.id,
            itemIndex,
            tool: step.tool,
            status: "pending",
            attempt: 1,
            idempotencyKey: key,
          });
          await setRunStatus(db, runId, "awaiting_approval");
          return finalize("awaiting_approval");
        }
        if (approval.status === "rejected") {
          await upsertRunStep(db, {
            runId,
            stepId: step.id,
            itemIndex,
            tool: step.tool,
            status: "skipped",
            attempt: 1,
            idempotencyKey: key,
            finishedAt: now(),
          });
          outputs.push(undefined);
          continue;
        }
        // approved → execute
      }

      if (!action) {
        const msg = `Unknown tool "${step.tool}"`;
        await upsertRunStep(db, {
          runId,
          stepId: step.id,
          itemIndex,
          tool: step.tool,
          status: "failed",
          error: msg,
          attempt: 1,
          idempotencyKey: key,
          finishedAt: now(),
        });
        return finalize("failed", msg);
      }

      const input = resolveParams(step.params, itemCtx);
      const redactedInput = redactor(input);
      const stepStartedAt = now();
      const maxAttempts = (step.retry?.max ?? defaultRetryMax) + 1;
      let lastError: string | undefined;
      let done = false;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await upsertRunStep(db, {
          runId,
          stepId: step.id,
          itemIndex,
          tool: step.tool,
          status: "running",
          input: redactedInput,
          attempt,
          idempotencyKey: key,
          startedAt: stepStartedAt,
        });
        try {
          const connCtx = createConnectorContext({ runMode, secrets: opts.secrets });
          const output = await invoke(action, input, connCtx, key);
          await upsertRunStep(db, {
            runId,
            stepId: step.id,
            itemIndex,
            tool: step.tool,
            status: "succeeded",
            input: redactedInput,
            output: redactor(output),
            attempt,
            idempotencyKey: key,
            startedAt: stepStartedAt,
            finishedAt: now(),
          });
          outputs.push(output);
          accumulate(output);
          done = true;
          break;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          await upsertRunStep(db, {
            runId,
            stepId: step.id,
            itemIndex,
            tool: step.tool,
            status: "failed",
            input: redactedInput,
            error: lastError,
            attempt,
            idempotencyKey: key,
            startedAt: stepStartedAt,
            finishedAt: now(),
          });
          if (attempt < maxAttempts) await sleep(backoffMs(step, attempt));
        }
      }

      if (!done) {
        return finalize("failed", lastError ?? "step failed");
      }
    }

    ctx.steps[step.id] = step.forEach ? outputs : outputs[0];
  }

  await setRunStatus(db, runId, "succeeded");
  return finalize("succeeded");
}
