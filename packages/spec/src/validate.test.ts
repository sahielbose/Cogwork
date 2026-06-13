import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateSpec } from "./validate";
import type { ToolCatalog } from "./catalog";
import type { WorkflowSpec } from "./schema";

const catalog: ToolCatalog = [
  {
    name: "gmail.list_messages",
    description: "List Gmail messages",
    sideEffect: false,
    inputSchema: z.object({ query: z.string(), max: z.number().int().optional() }),
  },
  {
    name: "ai.generate",
    description: "Generate text",
    sideEffect: false,
    inputSchema: z.object({
      instructions: z.string(),
      input: z.unknown().optional(),
      model: z.string().optional(),
    }),
  },
  {
    name: "gmail.create_draft",
    description: "Create a Gmail draft",
    sideEffect: true,
    inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  },
  {
    name: "slack.post_message",
    description: "Post a Slack message",
    sideEffect: true,
    inputSchema: z.object({ channel: z.string(), text: z.string() }),
  },
];

/** A valid morning-briefing-shaped spec. */
function validSpec(): WorkflowSpec {
  return {
    version: 1,
    name: "Morning briefing",
    trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "America/Los_Angeles" },
    steps: [
      {
        id: "fetch_emails",
        tool: "gmail.list_messages",
        params: { query: "is:unread newer_than:1d", max: 25 },
        outputs: ["messages"],
      },
      {
        id: "brief",
        tool: "ai.generate",
        params: {
          model: "claude",
          instructions: "Summarize",
          input: "{{ fetch_emails.messages }}",
        },
        outputs: ["summary", "drafts"],
      },
      {
        id: "draft_replies",
        tool: "gmail.create_draft",
        forEach: "{{ brief.drafts }}",
        params: { to: "{{ item.to }}", subject: "{{ item.subject }}", body: "{{ item.body }}" },
      },
      {
        id: "post_brief",
        tool: "slack.post_message",
        params: { channel: "@me", text: "{{ brief.summary }}" },
        approval: "auto",
      },
    ],
  };
}

describe("validateSpec — valid", () => {
  it("accepts a well-formed spec", () => {
    const r = validateSpec(validSpec(), catalog);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("infers approval:required on a sideEffect step that omits it", () => {
    const r = validateSpec(validSpec(), catalog);
    const draft = r.spec!.steps.find((s) => s.id === "draft_replies")!;
    expect(draft.approval).toBe("required");
  });

  it("leaves an explicit approval:auto in place", () => {
    const r = validateSpec(validSpec(), catalog);
    const post = r.spec!.steps.find((s) => s.id === "post_brief")!;
    expect(post.approval).toBe("auto");
  });

  it("does not gate a non-sideEffect step", () => {
    const r = validateSpec(validSpec(), catalog);
    const fetch = r.spec!.steps.find((s) => s.id === "fetch_emails")!;
    expect(fetch.approval).toBeUndefined();
  });
});

describe("validateSpec — failure classes", () => {
  it("rejects a nonexistent tool", () => {
    const spec = validSpec();
    spec.steps[0]!.tool = "gmail.teleport";
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /does not exist/.test(e))).toBe(true);
  });

  it("rejects a wrongly-typed literal param", () => {
    const spec = validSpec();
    spec.steps[0]!.params = { query: "is:unread", max: "lots" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /wrong type/.test(e) && /max/.test(e))).toBe(true);
  });

  it("rejects an unknown param", () => {
    const spec = validSpec();
    spec.steps[0]!.params = { query: "is:unread", nonsense: true };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /unknown param "nonsense"/.test(e))).toBe(true);
  });

  it("rejects a missing required param", () => {
    const spec = validSpec();
    // create_draft requires to/subject/body; drop body.
    spec.steps[2]!.params = { to: "{{ item.to }}", subject: "{{ item.subject }}" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /missing required param "body"/.test(e))).toBe(true);
  });

  it("rejects a binding to an unknown step", () => {
    const spec = validSpec();
    spec.steps[1]!.params = { instructions: "x", input: "{{ ghost.messages }}" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /references unknown step "ghost"/.test(e))).toBe(true);
  });

  it("rejects a binding to a later step", () => {
    const spec = validSpec();
    // fetch_emails (index 0) references brief (index 1) — not earlier.
    spec.steps[0]!.params = { query: "{{ brief.summary }}" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /does not appear earlier/.test(e))).toBe(true);
  });

  it("rejects a binding to an undeclared output", () => {
    const spec = validSpec();
    spec.steps[1]!.params = { instructions: "x", input: "{{ fetch_emails.bodies }}" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /does not declare output "bodies"/.test(e))).toBe(true);
  });

  it("rejects {{ item.* }} used outside a forEach step", () => {
    const spec = validSpec();
    // post_brief has no forEach.
    spec.steps[3]!.params = { channel: "@me", text: "{{ item.subject }}" };
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /can only be used inside a step that has forEach/.test(e))).toBe(
      true,
    );
  });

  it("rejects {{ item.* }} inside the step's own forEach expression", () => {
    const spec = validSpec();
    spec.steps[2]!.forEach = "{{ item.things }}";
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /not available inside its own forEach/.test(e))).toBe(true);
  });

  it("rejects a duplicate step id", () => {
    const spec = validSpec();
    spec.steps[1]!.id = "fetch_emails";
    const r = validateSpec(spec, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /duplicate step id/.test(e))).toBe(true);
  });

  it("rejects a spec that fails the base schema", () => {
    const r = validateSpec({ version: 1, name: "x", trigger: { type: "manual" }, steps: [] }, catalog);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /schema:/.test(e))).toBe(true);
  });
});
