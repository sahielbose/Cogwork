import { describe, expect, it } from "vitest";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { catalog, compileForEval, LIVE } from "../src/harness";

/**
 * The definition of done for generation (COGWORK_CONTEXT.md §9.2): a prompt
 * compiles into a runnable spec built from real tools, gated by validateSpec —
 * not vibes.
 */

const cannedMorningBriefing: WorkflowSpec = {
  version: 1,
  name: "Morning email briefing",
  description: "Summarize unread email, draft replies, post a brief to Slack.",
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
        instructions:
          "Summarize these emails into a 5-bullet brief and, for ones needing a reply, produce {to, subject, body}.",
        input: "{{ fetch_emails.messages }}",
      },
      outputs: ["summary", "drafts"],
    },
    {
      id: "draft_replies",
      tool: "gmail.create_draft",
      forEach: "{{ brief.drafts }}",
      params: { to: "{{ item.to }}", subject: "{{ item.subject }}", body: "{{ item.body }}" },
      approval: "required",
    },
    {
      id: "post_brief",
      tool: "slack.post_message",
      params: { channel: "@me", text: "{{ brief.summary }}" },
      approval: "auto",
    },
  ],
};

describe("generation: morning briefing", () => {
  it("generates a runnable morning-briefing workflow from a prompt", async () => {
    const { spec, valid } = await compileForEval({
      name: "morning-briefing",
      prompt:
        "Every weekday at 8am, summarize my unread Gmail from the last day and DM me the summary on Slack.",
      cannedSpec: cannedMorningBriefing,
      expect: { triggerType: "schedule", tools: [], cron: "0 8 * * 1-5" },
    });

    expect(valid).toBe(true);
    expect(spec!.trigger).toMatchObject({ type: "schedule", cron: "0 8 * * 1-5" });

    const tools = spec!.steps.map((s) => s.tool);
    expect(tools).toEqual(
      expect.arrayContaining(["gmail.list_messages", "ai.generate", "slack.post_message"]),
    );

    // tools all exist + every binding resolves (validateSpec is the gate)
    expect(validateSpec(spec!, catalog).ok).toBe(true);
  });

  it(`runs in ${LIVE ? "LIVE" : "MOCKED"} mode`, () => {
    expect(typeof LIVE).toBe("boolean");
  });
});
