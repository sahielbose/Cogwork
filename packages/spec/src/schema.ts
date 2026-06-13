import { z } from "zod";

/**
 * The Workflow Spec (DSL) — the canonical, JSON-serializable, Zod-validated
 * description of a workflow. This is the artifact that is stored, versioned,
 * diffed, executed, and exported. See COGWORK_CONTEXT.md §4.1.
 */

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("webhook"), path: z.string().min(1) }),
  z.object({
    type: z.literal("schedule"),
    cron: z.string().min(1), // standard 5-field cron
    timezone: z.string().default("UTC"),
  }),
]);

export const RetrySchema = z.object({
  max: z.number().int().min(0).max(10),
  backoffMs: z.number().int().min(0),
});

export const StepSchema = z.object({
  /** unique within the workflow */
  id: z.string().regex(/^[a-z0-9_]+$/, "step id must match /^[a-z0-9_]+$/"),
  /** e.g. "gmail.list_messages" */
  tool: z.string().min(1),
  /** values may contain {{ bindings }} */
  params: z.record(z.unknown()).default({}),
  /** binding to an array → run per item; exposes {{ item }}, {{ index }} */
  forEach: z.string().optional(),
  /** {{ binding }} truthy → run, else skip */
  condition: z.string().optional(),
  /** gate; default derived from tool.sideEffect */
  approval: z.enum(["required", "auto"]).optional(),
  retry: RetrySchema.optional(),
  /** names the step exposes downstream */
  outputs: z.array(z.string()).optional(),
});

export const WorkflowSpecSchema = z.object({
  version: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: TriggerSchema,
  steps: z.array(StepSchema).min(1),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Retry = z.infer<typeof RetrySchema>;
