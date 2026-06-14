import { getToolCatalog } from "@cogwork/connectors";
import { loadPreferencesMap, type Db } from "@cogwork/db";
import { type ToolCatalog, type WorkflowSpec } from "@cogwork/spec";
import {
  DEFAULT_COMPILE_MODEL,
  defaultGenerate,
  repairLoop,
  type CompileResult,
  type GenerateFn,
} from "./compile";
import { buildSystemPrompt } from "./prompts";

/**
 * NL edit → spec diff (COGWORK_CONTEXT.md §9). Given the current spec and an
 * instruction, returns a NEW, re-validated spec plus a step-level diff. NL edits
 * can never produce an invalid stored spec — the same validate-and-repair loop
 * gates the output.
 */

export interface SpecDiff {
  added: string[];
  removed: string[];
  changed: string[];
  triggerChanged: boolean;
}

export function diffSpecs(before: WorkflowSpec, after: WorkflowSpec): SpecDiff {
  const beforeSteps = new Map(before.steps.map((s) => [s.id, s]));
  const afterSteps = new Map(after.steps.map((s) => [s.id, s]));
  const added = [...afterSteps.keys()].filter((id) => !beforeSteps.has(id));
  const removed = [...beforeSteps.keys()].filter((id) => !afterSteps.has(id));
  const changed = [...afterSteps.keys()].filter(
    (id) =>
      beforeSteps.has(id) &&
      JSON.stringify(beforeSteps.get(id)) !== JSON.stringify(afterSteps.get(id)),
  );
  const triggerChanged = JSON.stringify(before.trigger) !== JSON.stringify(after.trigger);
  return { added, removed, changed, triggerChanged };
}

export interface EditOptions {
  spec: WorkflowSpec;
  instruction: string;
  userId?: string;
  db?: Db;
  catalog?: ToolCatalog;
  preferences?: Record<string, unknown>;
  maxRepairs?: number;
  generate?: GenerateFn;
  model?: string;
}

export interface EditResult extends CompileResult {
  diff: SpecDiff | null;
}

export async function editWorkflow(opts: EditOptions): Promise<EditResult> {
  const catalog = opts.catalog ?? getToolCatalog();
  const preferences =
    opts.preferences ??
    (opts.db && opts.userId ? await loadPreferencesMap(opts.db, opts.userId) : {});
  const system = buildSystemPrompt(catalog, preferences);
  const generate = opts.generate ?? defaultGenerate(opts.model ?? DEFAULT_COMPILE_MODEL);

  const result = await repairLoop({
    system,
    messages: [
      {
        role: "user",
        content:
          "Here is the current workflow spec:\n" +
          JSON.stringify(opts.spec, null, 2) +
          "\n\nApply this change and return the FULL updated spec (keep everything else the same):\n" +
          opts.instruction,
      },
    ],
    catalog,
    generate,
    maxRepairs: opts.maxRepairs ?? 3,
  });

  return { ...result, diff: result.spec ? diffSpecs(opts.spec, result.spec) : null };
}
