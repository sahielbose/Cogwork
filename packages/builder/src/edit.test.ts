import { describe, expect, it } from "vitest";
import { getToolCatalog } from "@cogwork/connectors";
import type { WorkflowSpec } from "@cogwork/spec";
import { diffSpecs, editWorkflow } from "./edit";
import type { GenerateFn } from "./compile";

const catalog = getToolCatalog();

function spec(): WorkflowSpec {
  return {
    version: 1,
    name: "Briefing",
    trigger: { type: "schedule", cron: "0 8 * * *", timezone: "UTC" },
    steps: [
      { id: "fetch", tool: "gmail.list_messages", params: { query: "is:unread" }, outputs: ["messages"] },
      { id: "notify", tool: "slack.post_message", params: { channel: "@me", text: "{{ fetch.messages }}" } },
    ],
  };
}

describe("diffSpecs", () => {
  it("reports added / removed / changed steps and trigger changes", () => {
    const before = spec();
    const after = spec();
    after.trigger = { type: "schedule", cron: "0 8 * * 1-5", timezone: "UTC" };
    after.steps[0]!.params = { query: "is:unread newer_than:1d" }; // changed
    after.steps.push({ id: "draft", tool: "gmail.create_draft", params: { to: "a@b.com", subject: "s", body: "b" } }); // added
    after.steps = after.steps.filter((s) => s.id !== "notify"); // removed

    const d = diffSpecs(before, after);
    expect(d.triggerChanged).toBe(true);
    expect(d.changed).toContain("fetch");
    expect(d.added).toContain("draft");
    expect(d.removed).toContain("notify");
  });
});

describe("editWorkflow (mocked LLM)", () => {
  it("applies an edit, re-validates, and returns a diff", async () => {
    const edited = spec();
    edited.trigger = { type: "schedule", cron: "0 8 * * 1-5", timezone: "UTC" }; // skip weekends
    const generate: GenerateFn = async () => ({ spec: edited, usage: { input: 10, output: 5 } });

    const result = await editWorkflow({
      spec: spec(),
      instruction: "make it skip weekends",
      catalog,
      generate,
    });
    expect(result.valid).toBe(true);
    expect(result.spec!.trigger).toMatchObject({ cron: "0 8 * * 1-5" });
    expect(result.diff?.triggerChanged).toBe(true);
  });

  it("rejects an edit that produces an invalid spec", async () => {
    const broken = spec();
    broken.steps[1]!.params = { channel: "@me", text: "{{ ghost.x }}" };
    const generate: GenerateFn = async () => ({ spec: broken, usage: { input: 1, output: 1 } });
    const result = await editWorkflow({
      spec: spec(),
      instruction: "break it",
      catalog,
      generate,
      maxRepairs: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.diff).toBeNull();
  });
});
