import { describe, expect, it } from "vitest";
import { redact, redactString } from "./redact";

describe("redact", () => {
  it("redacts known secret fields by key name", () => {
    const out = redact({
      access_token: "ya29.abc",
      refresh_token: "1//xyz",
      apiKey: "sk-123",
      password: "hunter2",
      authorization: "Bearer zzz",
      keep: "visible",
    }) as Record<string, unknown>;
    expect(out.access_token).toBe("[REDACTED]");
    expect(out.refresh_token).toBe("[REDACTED]");
    expect(out.apiKey).toBe("[REDACTED]");
    expect(out.password).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.keep).toBe("visible");
  });

  it("masks emails (PII) while keeping the domain", () => {
    expect(redactString("Send to priya@acme-corp.com please")).toBe(
      "Send to p***@acme-corp.com please",
    );
  });

  it("redacts token-like values inside strings", () => {
    expect(redactString("token is xoxb-123-abc-def")).toContain("[REDACTED]");
    expect(redactString("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345")).toBe("[REDACTED]");
  });

  it("recurses into arrays and nested objects", () => {
    const out = redact({
      messages: [{ from: "alex@x.com", secret: "s" }],
      nested: { token: "t", text: "hi bob@y.io" },
    }) as { messages: { from: string; secret: string }[]; nested: { token: string; text: string } };
    expect(out.messages[0]!.from).toBe("a***@x.com");
    expect(out.messages[0]!.secret).toBe("[REDACTED]");
    expect(out.nested.token).toBe("[REDACTED]");
    expect(out.nested.text).toBe("hi b***@y.io");
  });

  it("leaves non-sensitive primitives untouched", () => {
    expect(redact(42)).toBe(42);
    expect(redact("plain text")).toBe("plain text");
    expect(redact(true)).toBe(true);
  });
});
