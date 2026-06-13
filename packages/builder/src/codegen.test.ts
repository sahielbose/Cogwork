import { describe, expect, it } from "vitest";
import type { WorkflowSpec } from "@cogwork/spec";
import { generateCode } from "./codegen";

const spec: WorkflowSpec = {
  version: 1,
  name: "Morning briefing",
  trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "America/Los_Angeles" },
  steps: [
    { id: "fetch_emails", tool: "gmail.list_messages", params: { query: "is:unread" }, outputs: ["messages"] },
    { id: "post_brief", tool: "slack.post_message", params: { channel: "@me", text: "hi" } },
  ],
};

describe("generateCode", () => {
  it("emits a readable TypeScript class with one method per step", () => {
    const code = generateCode(spec);
    expect(code).toContain("export class MorningBriefingWorkflow {");
    expect(code).toContain("async fetchEmails(ctx: RunContext)");
    expect(code).toContain("async postBrief(ctx: RunContext)");
    expect(code).toContain('ctx.call("gmail.list_messages"');
    expect(code).toContain("// Trigger: schedule");
    expect(code).toContain("export only");
  });
});
