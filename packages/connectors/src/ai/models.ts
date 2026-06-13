/** Friendly model aliases → concrete Anthropic model ids (provider-swappable). */
export const DEFAULT_AI_MODEL = "claude-sonnet-4-6";

export function resolveAnthropicModel(name?: string): string {
  if (!name || name === "claude" || name === "default") return DEFAULT_AI_MODEL;
  return name;
}
