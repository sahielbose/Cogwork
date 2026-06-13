import { z } from "zod";
import { WorkflowSpecSchema, type Step, type WorkflowSpec } from "./schema";
import { type ToolCatalog, findTool } from "./catalog";
import { bindingRoot, extractBindings } from "./resolve";

/**
 * Semantic validation — COGWORK_CONTEXT.md §4.4. A spec is NOT valid just
 * because it parses. Before a workflow can be saved/run, the Builder output
 * must pass these checks against the connector registry:
 *
 *   1. Schema           — passes WorkflowSpecSchema.
 *   2. Tool existence   — every step.tool exists in the registry.
 *   3. Param typing     — params validate against the tool's Zod inputSchema
 *                         (literals are type-checked; bindings accepted structurally).
 *   4. Binding resolvability — every {{ stepId.x }} references an EARLIER step
 *                         that declares output x; {{ item.* }}/{{ index }} only
 *                         inside a forEach step.
 *   5. Approval inference    — any sideEffect:true step defaults to
 *                         approval:"required" unless explicitly set.
 *
 * This is the gate that stops "looks-done" specs that reference nonexistent
 * tools/params or unresolvable bindings.
 */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** normalized spec (approval inferred) — present only when ok */
  spec?: WorkflowSpec;
}

/** Unwrap wrappers to reach an underlying ZodObject, if any. */
function asObjectSchema(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> | null {
  let s: z.ZodTypeAny = schema;
  // Bounded unwrap of effects/optional/nullable/default.
  for (let i = 0; i < 10; i++) {
    if (s instanceof z.ZodEffects) {
      s = s.innerType();
    } else if (s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
      s = s.unwrap() as z.ZodTypeAny;
    } else if (s instanceof z.ZodDefault) {
      s = s.removeDefault() as z.ZodTypeAny;
    } else {
      break;
    }
  }
  return s instanceof z.ZodObject ? (s as z.ZodObject<z.ZodRawShape>) : null;
}

/** Check the literal (binding-free) params against the tool's input schema. */
function checkParams(step: Step, schema: z.ZodTypeAny, errors: string[]): void {
  const obj = asObjectSchema(schema);
  if (!obj) return; // non-object input — only structural checks apply
  const shape = obj.shape as Record<string, z.ZodTypeAny>;

  // unknown params
  for (const key of Object.keys(step.params)) {
    if (!(key in shape)) {
      errors.push(`step "${step.id}": unknown param "${key}" for tool "${step.tool}"`);
    }
  }

  // missing required params
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const required = !fieldSchema.isOptional();
    if (required && !(key in step.params)) {
      errors.push(`step "${step.id}": missing required param "${key}" for tool "${step.tool}"`);
    }
  }

  // type-check literal (binding-free) values
  for (const [key, value] of Object.entries(step.params)) {
    const fieldSchema = shape[key];
    if (!fieldSchema) continue;
    if (extractBindings(value).length > 0) continue; // bindings: accept structurally
    const parsed = fieldSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(
        `step "${step.id}": param "${key}" has the wrong type for tool "${step.tool}"` +
          (issue ? ` (${issue.message})` : ""),
      );
    }
  }
}

/** Validate one binding expression against the producing-step rules. */
function checkBinding(
  expr: string,
  opts: {
    step: Step;
    stepIndex: number;
    inForEachExpr: boolean;
    stepIndexById: Map<string, number>;
    stepById: Map<string, Step>;
    errors: string[];
  },
): void {
  const { step, stepIndex, inForEachExpr, stepIndexById, stepById, errors } = opts;
  const root = bindingRoot(expr);

  if (root === "item" || root === "index") {
    if (inForEachExpr) {
      errors.push(
        `step "${step.id}": {{ ${root} }} is not available inside its own forEach expression`,
      );
    } else if (!step.forEach) {
      errors.push(
        `step "${step.id}": {{ ${root} }} can only be used inside a step that has forEach`,
      );
    }
    return;
  }

  if (root === "trigger" || root === "secrets") return; // always available

  // Otherwise it is a step-output reference.
  const producerIndex = stepIndexById.get(root);
  if (producerIndex === undefined) {
    errors.push(`step "${step.id}": binding {{ ${expr.trim()} }} references unknown step "${root}"`);
    return;
  }
  if (producerIndex >= stepIndex) {
    errors.push(
      `step "${step.id}": binding {{ ${expr.trim()} }} references step "${root}" that does not appear earlier`,
    );
    return;
  }

  const segments = expr
    .trim()
    .split(".")
    .map((s) => s.trim());
  if (segments.length < 2) {
    errors.push(
      `step "${step.id}": binding {{ ${expr.trim()} }} must reference a declared output of step "${root}"`,
    );
    return;
  }
  const outputName = segments[1]!;
  const producer = stepById.get(root)!;
  if (!producer.outputs || !producer.outputs.includes(outputName)) {
    errors.push(
      `step "${step.id}": step "${root}" does not declare output "${outputName}"`,
    );
  }
}

export function validateSpec(rawSpec: unknown, catalog: ToolCatalog): ValidationResult {
  // 1. Schema
  const parsed = WorkflowSpecSchema.safeParse(rawSpec);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const spec = parsed.data;
  const errors: string[] = [];

  // unique step ids
  const seen = new Set<string>();
  for (const step of spec.steps) {
    if (seen.has(step.id)) errors.push(`duplicate step id "${step.id}"`);
    seen.add(step.id);
  }

  const stepIndexById = new Map<string, number>();
  const stepById = new Map<string, Step>();
  spec.steps.forEach((s, i) => {
    stepIndexById.set(s.id, i);
    stepById.set(s.id, s);
  });

  spec.steps.forEach((step, stepIndex) => {
    // 2. Tool existence
    const tool = findTool(catalog, step.tool);
    if (!tool) {
      errors.push(`step "${step.id}": tool "${step.tool}" does not exist in the registry`);
    } else {
      // 3. Param typing
      checkParams(step, tool.inputSchema, errors);
    }

    // 4. Binding resolvability
    for (const expr of extractBindings(step.params)) {
      checkBinding(expr, { step, stepIndex, inForEachExpr: false, stepIndexById, stepById, errors });
    }
    if (step.condition) {
      for (const expr of extractBindings(step.condition)) {
        checkBinding(expr, {
          step,
          stepIndex,
          inForEachExpr: false,
          stepIndexById,
          stepById,
          errors,
        });
      }
    }
    if (step.forEach) {
      for (const expr of extractBindings(step.forEach)) {
        checkBinding(expr, {
          step,
          stepIndex,
          inForEachExpr: true,
          stepIndexById,
          stepById,
          errors,
        });
      }
    }
  });

  if (errors.length > 0) return { ok: false, errors };

  // 5. Approval inference — sideEffect steps default to approval:"required".
  const normalized: WorkflowSpec = {
    ...spec,
    steps: spec.steps.map((step) => {
      const tool = findTool(catalog, step.tool);
      if (tool?.sideEffect && step.approval === undefined) {
        return { ...step, approval: "required" as const };
      }
      return step;
    }),
  };

  return { ok: true, errors: [], spec: normalized };
}
