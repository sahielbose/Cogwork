import { describe, expect, it, vi } from "vitest";
import { getToolCatalog } from "@cogwork/connectors";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { compileWorkflow, type GenerateFn } from "./compile";

const catalog = getToolCatalog();

function goodSpec(): WorkflowSpec {
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
        params: { instructions: "Summarize", input: "{{ fetch_emails.messages }}" },
        outputs: ["summary"],
      },
      {
        id: "notify",
        tool: "slack.post_message",
        params: { channel: "@me", text: "{{ brief.summary }}" },
      },
    ],
  };
}

/** A GenerateFn that returns the given candidates in sequence. */
function scriptedGenerate(...candidates: unknown[]): GenerateFn {
  let i = 0;
  return vi.fn(async () => ({
    spec: candidates[Math.min(i++, candidates.length - 1)],
    usage: { input: 100, output: 50 },
  }));
}

describe("compileWorkflow (mocked LLM — tests the pipeline)", () => {
  it("returns a valid, summarized spec on the first try", async () => {
    const generate = scriptedGenerate(goodSpec());
    const result = await compileWorkflow({ prompt: "brief me", catalog, generate });
    expect(result.valid).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.spec).not.toBeNull();
    expect(result.summary).toContain("Morning briefing");
    expect(result.usage).toEqual({ input: 100, output: 50 });
    // approval inference applied (slack.post_message is side-effecting)
    expect(result.spec!.steps.find((s) => s.id === "notify")!.approval).toBe("required");
  });

  it("self-corrects: an invalid candidate is repaired into a valid spec", async () => {
    const bad = goodSpec();
    bad.steps[0]!.tool = "gmail.teleport"; // nonexistent tool → semantic error
    const generate = scriptedGenerate(bad, goodSpec());
    const result = await compileWorkflow({ prompt: "brief me", catalog, generate, maxRepairs: 2 });
    expect(result.valid).toBe(true);
    expect(result.attempts).toBe(2); // one repair round
    expect(generate).toHaveBeenCalledTimes(2);
    // usage accumulates across attempts
    expect(result.usage).toEqual({ input: 200, output: 100 });
  });

  it("gives up after the repair budget when the model never produces a valid spec", async () => {
    const bad = goodSpec();
    bad.steps[1]!.params = { input: "{{ ghost.x }}" }; // unresolvable binding + missing required
    const generate = scriptedGenerate(bad);
    const result = await compileWorkflow({ prompt: "x", catalog, generate, maxRepairs: 2 });
    expect(result.valid).toBe(false);
    expect(result.spec).toBeNull();
    expect(generate).toHaveBeenCalledTimes(3); // initial + 2 repairs
  });

  it("the compiled spec passes validateSpec (the gate, not vibes)", async () => {
    const result = await compileWorkflow({
      prompt: "brief me",
      catalog,
      generate: scriptedGenerate(goodSpec()),
    });
    expect(validateSpec(result.spec!, catalog).ok).toBe(true);
  });
});
