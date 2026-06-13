import { describe, expect, it } from "vitest";
import {
  evalCondition,
  extractBindings,
  resolveParams,
  resolvePath,
  resolveValue,
  type RunContext,
} from "./resolve";

const ctx: RunContext = {
  steps: {
    fetch_emails: { messages: [{ id: "1", from: "a@x.com" }, { id: "2", from: "b@y.com" }] },
    brief: { summary: "5 bullets", drafts: [{ to: "a@x.com", subject: "Re" }] },
  },
  trigger: { payload: { x: 42, name: "hook" } },
  secrets: { SLACK_TOKEN: "xoxb-secret" },
  item: { to: "a@x.com", subject: "Hi" },
  index: 3,
};

describe("resolvePath", () => {
  it("resolves {{ step.out }}", () => {
    expect(resolvePath("brief.summary", ctx)).toBe("5 bullets");
  });
  it("resolves a step output array", () => {
    expect(resolvePath("fetch_emails.messages", ctx)).toHaveLength(2);
  });
  it("resolves {{ item.* }}", () => {
    expect(resolvePath("item.to", ctx)).toBe("a@x.com");
  });
  it("resolves bare {{ item }}", () => {
    expect(resolvePath("item", ctx)).toEqual({ to: "a@x.com", subject: "Hi" });
  });
  it("resolves {{ index }}", () => {
    expect(resolvePath("index", ctx)).toBe(3);
  });
  it("resolves {{ trigger.payload.x }}", () => {
    expect(resolvePath("trigger.payload.x", ctx)).toBe(42);
  });
  it("resolves {{ secrets.NAME }}", () => {
    expect(resolvePath("secrets.SLACK_TOKEN", ctx)).toBe("xoxb-secret");
  });
  it("resolves array .length", () => {
    expect(resolvePath("fetch_emails.messages.length", ctx)).toBe(2);
  });
  it("returns undefined for a missing path", () => {
    expect(resolvePath("brief.nope", ctx)).toBeUndefined();
    expect(resolvePath("ghost.value", ctx)).toBeUndefined();
  });
});

describe("resolveValue", () => {
  it("preserves the typed value for a whole-string binding", () => {
    const out = resolveValue("{{ fetch_emails.messages }}", ctx);
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(2);
  });
  it("interpolates bindings inside text and stringifies", () => {
    expect(resolveValue("Hi {{ item.to }} (#{{ index }})", ctx)).toBe("Hi a@x.com (#3)");
  });
  it("substitutes missing bindings with empty string", () => {
    expect(resolveValue("x={{ brief.nope }}", ctx)).toBe("x=");
  });
  it("recurses into objects and arrays (whole-string bindings keep their type)", () => {
    const out = resolveParams(
      { to: "{{ item.to }}", tags: ["{{ index }}", "static"], n: 5 },
      ctx,
    );
    // "{{ index }}" is a whole-string binding → preserves the number 3.
    expect(out).toEqual({ to: "a@x.com", tags: [3, "static"], n: 5 });
  });
});

describe("extractBindings", () => {
  it("finds bindings deeply", () => {
    const found = extractBindings({
      a: "{{ x.y }}",
      b: ["{{ item.z }}", "plain"],
      c: { d: "text {{ trigger.payload.name }} end" },
    });
    expect(found.sort()).toEqual(["item.z", "trigger.payload.name", "x.y"]);
  });
  it("returns empty for binding-free values", () => {
    expect(extractBindings({ a: 1, b: "plain" })).toEqual([]);
  });
});

describe("evalCondition", () => {
  it("treats a non-empty array binding as truthy (presence)", () => {
    expect(evalCondition("{{ brief.drafts }}", ctx)).toBe(true);
  });
  it("treats a missing binding as falsy", () => {
    expect(evalCondition("{{ brief.nope }}", ctx)).toBe(false);
  });
  it("supports length via path", () => {
    expect(evalCondition("{{ fetch_emails.messages.length }} != 0", ctx)).toBe(true);
    expect(evalCondition("{{ fetch_emails.messages.length }} == 2", ctx)).toBe(true);
  });
  it("supports == against a bare literal", () => {
    expect(evalCondition("{{ item.to }} == a@x.com", ctx)).toBe(true);
    expect(evalCondition("{{ item.to }} == z@z.com", ctx)).toBe(false);
  });
  it("supports !=", () => {
    expect(evalCondition("{{ index }} != 0", ctx)).toBe(true);
    expect(evalCondition("{{ index }} != 3", ctx)).toBe(false);
  });
});
