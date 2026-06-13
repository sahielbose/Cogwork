import type { z } from "zod";

/**
 * The shape of a tool, as the connector registry exposes it to the Builder
 * (for prompting) and to the semantic validator (for type-checking params).
 *
 * `packages/spec` defines this type so the validator can depend on it without
 * importing `packages/connectors` (which would create a cycle — connectors
 * depends on spec, not the other way around). The connector registry produces
 * values of this shape via `getToolCatalog()`.
 */
export interface ToolMeta {
  /** e.g. "gmail.list_messages" */
  name: string;
  description: string;
  /** true → approval-gated by default */
  sideEffect: boolean;
  /** live Zod schema — used by the validator to type-check literal params */
  inputSchema: z.ZodTypeAny;
  /** live Zod schema for the action's output (used elsewhere; optional here) */
  outputSchema?: z.ZodTypeAny;
}

export type ToolCatalog = ToolMeta[];

export function findTool(catalog: ToolCatalog, name: string): ToolMeta | undefined {
  return catalog.find((t) => t.name === name);
}
