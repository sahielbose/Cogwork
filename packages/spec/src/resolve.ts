/**
 * Binding resolver + condition evaluator. See COGWORK_CONTEXT.md §4.2.
 *
 * Values in `params`, `condition`, and `forEach` may contain mustache-style
 * bindings resolved at runtime against the run context:
 *   {{ stepId.outputName }}   output of a prior step
 *   {{ item.field }} / {{ index }}   current item inside a forEach
 *   {{ trigger.payload.x }}    webhook payload / scheduled context
 *   {{ secrets.NAME }}         resolved server-side; never logged
 *
 * The resolver is a small, safe path interpolator — NO eval. `condition`
 * supports a tiny boolean grammar (==, !=, presence, length), not arbitrary JS.
 */

export interface RunContext {
  /**
   * stepId -> output value of a completed step. Usually an object
   * ({ outputName: value }); for a forEach step it is the aggregated array of
   * per-item outputs.
   */
  steps: Record<string, unknown>;
  /** webhook payload / scheduled context */
  trigger?: Record<string, unknown>;
  /** server-side secrets; never logged */
  secrets?: Record<string, string>;
  /** current forEach item (when inside a forEach step) */
  item?: unknown;
  /** current forEach index (when inside a forEach step) */
  index?: number;
}

/** Entire string is exactly one binding, e.g. "{{ a.b }}". */
const FULL_BINDING = /^\{\{\s*([^}]+?)\s*\}\}$/;
/** Bindings embedded within text. */
const PARTIAL_BINDING = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Find every binding expression contained in a value (deeply). */
export function extractBindings(value: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      for (const m of v.matchAll(PARTIAL_BINDING)) found.push(m[1]!.trim());
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
  return found;
}

/** The root of a binding path: "fetch_emails.messages" -> "fetch_emails". */
export function bindingRoot(expr: string): string {
  return expr.trim().split(".")[0]!.trim();
}

/** Resolve a single dotted path expression against the context. */
export function resolvePath(expr: string, ctx: RunContext): unknown {
  const parts = expr
    .trim()
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return undefined;

  const head = parts.shift()!;
  let base: unknown;
  switch (head) {
    case "item":
      base = ctx.item;
      break;
    case "index":
      return ctx.index;
    case "trigger":
      base = ctx.trigger;
      break;
    case "secrets":
      base = ctx.secrets;
      break;
    default:
      base = ctx.steps[head];
  }

  let cur: unknown = base;
  for (const key of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && key === "length") {
      cur = cur.length;
    } else if (typeof cur === "string" && key === "length") {
      cur = cur.length;
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Resolve bindings in any value. A whole-string binding keeps its typed value. */
export function resolveValue(value: unknown, ctx: RunContext): unknown {
  if (typeof value === "string") {
    const full = value.match(FULL_BINDING);
    if (full) return resolvePath(full[1]!, ctx); // preserve type (array/object/number)
    if (value.includes("{{")) {
      return value.replace(PARTIAL_BINDING, (_m, expr: string) => {
        const r = resolvePath(expr.trim(), ctx);
        if (r == null) return "";
        return typeof r === "object" ? JSON.stringify(r) : String(r);
      });
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveValue(v, ctx);
    return out;
  }
  return value;
}

/** Resolve a params record. */
export function resolveParams(
  params: Record<string, unknown>,
  ctx: RunContext,
): Record<string, unknown> {
  return resolveValue(params, ctx) as Record<string, unknown>;
}

function isTruthy(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v == null) return false;
  if (typeof v === "string") return v.length > 0;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

function looseEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** Parse one operand of a condition: a binding, or a literal. */
function resolveOperand(token: string, ctx: RunContext): unknown {
  const t = token.trim();
  const full = t.match(FULL_BINDING);
  if (full) return resolvePath(full[1]!, ctx);
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t; // bare string literal, e.g. `high`
}

/**
 * Evaluate a `condition` string. Grammar:
 *   <operand> == <operand>
 *   <operand> != <operand>
 *   <operand>                (presence/truthiness; length via {{ x.length }})
 * Operands are bindings ({{ ... }}) or literals (string/number/bool/null).
 */
export function evalCondition(expr: string, ctx: RunContext): boolean {
  const trimmed = expr.trim();
  if (trimmed.length === 0) return true;

  const cmp = trimmed.match(/^(.+?)\s*(==|!=)\s*(.+)$/);
  if (cmp) {
    const left = resolveOperand(cmp[1]!.trim(), ctx);
    const right = resolveOperand(cmp[3]!.trim(), ctx);
    const eq = looseEqual(left, right);
    return cmp[2] === "==" ? eq : !eq;
  }

  return isTruthy(resolveOperand(trimmed, ctx));
}
