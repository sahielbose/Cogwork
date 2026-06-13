import { describe, expect, it } from "vitest";
import { idempotencyKey } from "./idempotency";

describe("idempotencyKey", () => {
  it("is deterministic for the same (run, step, index)", () => {
    expect(idempotencyKey("r1", "s1", 0)).toBe(idempotencyKey("r1", "s1", 0));
  });
  it("differs across run, step, and index", () => {
    const a = idempotencyKey("r1", "s1", 0);
    expect(a).not.toBe(idempotencyKey("r2", "s1", 0));
    expect(a).not.toBe(idempotencyKey("r1", "s2", 0));
    expect(a).not.toBe(idempotencyKey("r1", "s1", 1));
  });
  it("is a stable-length hex string", () => {
    expect(idempotencyKey("r1", "s1", 0)).toMatch(/^[0-9a-f]{32}$/);
  });
});
