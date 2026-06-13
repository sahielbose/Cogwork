/**
 * Rough per-run cost estimate from token usage (COGWORK_CONTEXT.md §10).
 * Rates are USD per 1M tokens — placeholders, easy to update per provider.
 */
const INPUT_PER_MTOK = 3.0;
const OUTPUT_PER_MTOK = 15.0;

export function estimateCostUsd(tokenInput: number, tokenOutput: number): number {
  const cost = (tokenInput / 1_000_000) * INPUT_PER_MTOK + (tokenOutput / 1_000_000) * OUTPUT_PER_MTOK;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6dp
}
