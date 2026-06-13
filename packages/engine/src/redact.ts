/**
 * Centralized redaction — COGWORK_CONTEXT.md §12.5. Strips secrets and masks
 * PII before anything is persisted to run_steps / approvals / logs or shown in
 * the UI. Applied to every step input/output and every approval preview.
 */

const REDACTED = "[REDACTED]";

/** Field names whose values are always secret, regardless of type. */
const SECRET_KEY = /(token|secret|password|passwd|authorization|api[_-]?key|credential|cookie)/i;

/** Token-like values (provider prefixes or long opaque strings). */
const TOKEN_VALUE =
  /\b(Bearer\s+[\w.-]+|xox[bapr]-[\w-]+|sk-[\w-]+|ya29\.[\w.-]+|gh[oprsu]_[A-Za-z0-9]{20,})\b/g;

const LONG_OPAQUE = /^[A-Za-z0-9+/_=-]{40,}$/;

const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Mask PII + token-like substrings inside a single string. */
export function redactString(s: string): string {
  if (LONG_OPAQUE.test(s)) return REDACTED;
  return s.replace(TOKEN_VALUE, REDACTED).replace(EMAIL, (_m, first: string, domain: string) => `${first}***@${domain}`);
}

/** Recursively redact any value (object/array/string). Pure — returns a copy. */
export function redact(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY.test(k) ? REDACTED : redact(v);
    }
    return out;
  }
  return value;
}
