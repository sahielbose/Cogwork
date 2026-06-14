import { describe, expect, it } from "vitest";
import { validateSpec, type WorkflowSpec } from "@cogwork/spec";
import { catalog, compileForEval, LIVE, type GoldenCase } from "../src/harness";

const dailyCalendar: WorkflowSpec = {
  version: 1,
  name: "Daily calendar rundown",
  trigger: { type: "schedule", cron: "0 9 * * *", timezone: "UTC" },
  steps: [
    { id: "events", tool: "gcal.list_events", params: { max: 10 }, outputs: ["events"] },
    {
      id: "summary",
      tool: "ai.generate",
      params: { instructions: "List today's meetings", input: "{{ events.events }}" },
      outputs: ["summary"],
    },
    {
      id: "post",
      tool: "slack.post_message",
      params: { channel: "general", text: "{{ summary.summary }}" },
      approval: "auto",
    },
  ],
};

const manualDrafts: WorkflowSpec = {
  version: 1,
  name: "Draft replies on demand",
  trigger: { type: "manual" },
  steps: [
    { id: "fetch", tool: "gmail.list_messages", params: { query: "is:unread" }, outputs: ["messages"] },
    {
      id: "brief",
      tool: "ai.generate",
      params: { instructions: "Draft replies", input: "{{ fetch.messages }}" },
      outputs: ["drafts"],
    },
    {
      id: "draft",
      tool: "gmail.create_draft",
      forEach: "{{ brief.drafts }}",
      params: { to: "{{ item.to }}", subject: "{{ item.subject }}", body: "{{ item.body }}" },
    },
  ],
};

const weeklyReport: WorkflowSpec = {
  version: 1,
  name: "Weekly report",
  trigger: { type: "schedule", cron: "0 9 * * 1", timezone: "UTC" },
  steps: [
    {
      id: "data",
      tool: "postgres.query",
      params: { sql: "select day, signups from metrics where day > now() - interval '7 days'" },
      outputs: ["rows"],
    },
    {
      id: "report",
      tool: "ai.generate",
      params: { instructions: "Summarize the week", input: "{{ data.rows }}" },
      outputs: ["summary"],
    },
    { id: "post", tool: "slack.post_message", params: { channel: "leadership", text: "{{ report.summary }}" } },
  ],
};

const issueTriage: WorkflowSpec = {
  version: 1,
  name: "Issue triage",
  trigger: { type: "webhook", path: "intake" },
  steps: [
    {
      id: "triage",
      tool: "ai.generate",
      params: { instructions: "Triage into title+body", input: "{{ trigger.payload }}" },
      outputs: ["summary"],
    },
    {
      id: "issue",
      tool: "github.create_issue",
      params: { repo: "org/repo", title: "{{ trigger.payload.title }}", body: "{{ triage.summary }}" },
    },
  ],
};

const cases: GoldenCase[] = [
  {
    name: "weekly-report",
    prompt: "Every Monday at 9am query our metrics database, summarize the week, and post to Slack.",
    cannedSpec: weeklyReport,
    expect: { triggerType: "schedule", cron: "0 9 * * 1", tools: ["postgres.query", "ai.generate", "slack.post_message"] },
  },
  {
    name: "issue-triage",
    prompt: "When a report hits the webhook, triage it and open a GitHub issue.",
    cannedSpec: issueTriage,
    expect: { triggerType: "webhook", tools: ["ai.generate", "github.create_issue"] },
  },
  {
    name: "daily-calendar-rundown",
    prompt: "Every day at 9am, summarize my calendar for today and post it to Slack #general.",
    cannedSpec: dailyCalendar,
    expect: {
      triggerType: "schedule",
      cron: "0 9 * * *",
      tools: ["gcal.list_events", "ai.generate", "slack.post_message"],
    },
  },
  {
    name: "draft-replies-on-demand",
    prompt: "When I run it, read my unread email and draft a reply to each one.",
    cannedSpec: manualDrafts,
    expect: {
      triggerType: "manual",
      tools: ["gmail.list_messages", "ai.generate", "gmail.create_draft"],
    },
  },
];

describe("generation: golden cases", () => {
  for (const c of cases) {
    it(`${c.name}: compiles to a valid spec with the expected shape`, async () => {
      const { spec, valid, errors } = await compileForEval(c);
      expect(valid, errors.join("; ")).toBe(true);
      expect(spec!.trigger.type).toBe(c.expect.triggerType);
      expect(spec!.steps.map((s) => s.tool)).toEqual(expect.arrayContaining(c.expect.tools));
      expect(validateSpec(spec!, catalog).ok).toBe(true);
      // exact cron is asserted only in deterministic (mocked) mode
      if (c.expect.cron && !LIVE && spec!.trigger.type === "schedule") {
        expect(spec!.trigger.cron).toBe(c.expect.cron);
      }
    });
  }
});
