import { compileWorkflow, type GenerateFn } from "@cogwork/builder";
import { getToolCatalog } from "@cogwork/connectors";
import type { WorkflowSpec } from "@cogwork/spec";

/**
 * Eval harness — two modes:
 *  - default (CI):  the LLM is mocked with the case's canned spec, so the
 *                   PIPELINE (validation, repair, persistence) is tested with
 *                   zero cost/flakiness.
 *  - live (nightly): COGWORK_EVAL_MODE=live hits real Anthropic and asserts
 *                   STRUCTURAL properties (tolerant to LLM nondeterminism).
 */
export const LIVE = process.env.COGWORK_EVAL_MODE === "live";
export const catalog = getToolCatalog();

export interface GoldenCase {
  name: string;
  prompt: string;
  /** used as the mocked model output in CI */
  cannedSpec: WorkflowSpec;
  expect: {
    triggerType: WorkflowSpec["trigger"]["type"];
    tools: string[];
    cron?: string;
  };
}

export async function compileForEval(c: GoldenCase) {
  const mock: GenerateFn = async () => ({ spec: c.cannedSpec, usage: { input: 0, output: 0 } });
  return compileWorkflow({
    prompt: c.prompt,
    catalog,
    generate: LIVE ? undefined : mock,
  });
}
