import { describe, expect, it } from "vitest";
import type { WorkflowSpec } from "@cogwork/spec";
import { explainSpec, humanizeCron } from "./explain";

describe("humanizeCron", () => {
  it("describes common schedules", () => {
    expect(humanizeCron("0 8 * * 1-5")).toBe("every weekday at 08:00");
    expect(humanizeCron("0 9 * * *")).toBe("every day at 09:00");
    expect(humanizeCron("0 7 * * 1")).toBe("every Monday at 07:00");
  });
  it("falls back to the raw cron for uncommon patterns", () => {
    expect(humanizeCron("*/5 * * * *")).toContain("cron");
  });
});

describe("explainSpec", () => {
  const spec: WorkflowSpec = {
    version: 1,
    name: "Morning briefing",
    description: "Summarize unread email and post to Slack.",
    trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "America/Los_Angeles" },
    steps: [
      { id: "fetch", tool: "gmail.list_messages", params: { query: "is:unread" }, outputs: ["messages"] },
      { id: "brief", tool: "ai.generate", params: { instructions: "x" }, outputs: ["summary"] },
      {
        id: "draft",
        tool: "gmail.create_draft",
        forEach: "{{ brief.drafts }}",
        params: { to: "{{ item.to }}", subject: "s", body: "b" },
        approval: "required",
      },
    ],
  };

  it("produces a readable, accurate summary", () => {
    const out = explainSpec(spec);
    expect(out).toContain("Morning briefing");
    expect(out).toContain("every weekday at 08:00");
    expect(out).toContain("Gmail — list messages");
    expect(out).toContain("AI — generate");
    expect(out).toContain("needs your approval");
    expect(out).toContain("once per item");
  });
});
