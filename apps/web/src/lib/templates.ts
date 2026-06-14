import type { WorkflowSpec } from "@cogwork/spec";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  integrations: string[];
  prompt: string;
  spec: WorkflowSpec;
}

/** The 5 starter templates (COGWORK_CONTEXT.md §14.3). Original copy. */
export const TEMPLATES: Template[] = [
  {
    id: "daily-briefing",
    name: "Daily briefing",
    description: "Every weekday morning, summarize your unread email and DM you the rundown.",
    category: "Productivity",
    integrations: ["gmail", "ai", "slack"],
    prompt:
      "Every weekday at 8am, summarize my unread Gmail from the last day and DM me the rundown on Slack.",
    spec: {
      version: 1,
      name: "Daily briefing",
      description: "Summarize unread email and post a brief to Slack.",
      trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "America/Los_Angeles" },
      steps: [
        {
          id: "emails",
          tool: "gmail.list_messages",
          params: { query: "is:unread newer_than:1d", max: 25 },
          outputs: ["messages"],
        },
        {
          id: "brief",
          tool: "ai.generate",
          params: {
            instructions: "Summarize these emails into a tight 5-bullet brief.",
            input: "{{ emails.messages }}",
          },
          outputs: ["summary"],
        },
        {
          id: "post",
          tool: "slack.post_message",
          params: { channel: "@me", text: "{{ brief.summary }}" },
          approval: "auto",
        },
      ],
    },
  },
  {
    id: "meeting-action-items",
    name: "Meeting action items",
    description: "Pull meeting notes, extract to-dos and owners, post to Slack, draft follow-ups.",
    category: "Productivity",
    integrations: ["notion", "ai", "slack", "gmail"],
    prompt:
      "Pull my latest meeting notes from Notion, extract action items and owners, post a summary to Slack, and draft follow-up emails.",
    spec: {
      version: 1,
      name: "Meeting action items",
      trigger: { type: "manual" },
      steps: [
        {
          id: "notes",
          tool: "notion.query_database",
          params: { databaseId: "meeting-notes" },
          outputs: ["pages"],
        },
        {
          id: "extract",
          tool: "ai.generate",
          params: {
            instructions:
              "Extract action items with owners; produce a Slack summary and per-owner reply drafts {to, subject, body}.",
            input: "{{ notes.pages }}",
          },
          outputs: ["summary", "drafts"],
        },
        {
          id: "post",
          tool: "slack.post_message",
          params: { channel: "team", text: "{{ extract.summary }}" },
        },
        {
          id: "followups",
          tool: "gmail.create_draft",
          forEach: "{{ extract.drafts }}",
          params: { to: "{{ item.to }}", subject: "{{ item.subject }}", body: "{{ item.body }}" },
        },
      ],
    },
  },
  {
    id: "candidate-sourcing",
    name: "Candidate sourcing",
    description: "Scrape candidates, score them by fit, and log the qualified ones to Notion.",
    category: "Recruiting",
    integrations: ["apify", "ai", "notion"],
    prompt:
      "Find engineers matching our hiring bar, score them by fit, and log qualified candidates to our recruiting Notion database.",
    spec: {
      version: 1,
      name: "Candidate sourcing",
      trigger: { type: "manual" },
      steps: [
        {
          id: "search",
          tool: "apify.run_actor",
          params: { actorId: "apify/web-scraper", input: { query: "senior backend engineers" } },
          outputs: ["items"],
        },
        {
          id: "score",
          tool: "ai.generate",
          params: {
            instructions: "Score each candidate by fit and keep the strongest matches.",
            input: "{{ search.items }}",
          },
          outputs: ["summary"],
        },
        {
          id: "log",
          tool: "notion.create_page",
          params: { parent: "recruiting-db", title: "Sourced candidates" },
        },
      ],
    },
  },
  {
    id: "issue-intake",
    name: "Issue intake",
    description: "Triage incoming reports via webhook and open a GitHub issue for anything real.",
    category: "Engineering",
    integrations: ["http", "ai", "github"],
    prompt:
      "When a report comes in by webhook, triage it and open a GitHub issue for anything that needs tracking.",
    spec: {
      version: 1,
      name: "Issue intake",
      trigger: { type: "webhook", path: "issue-intake" },
      steps: [
        {
          id: "triage",
          tool: "ai.generate",
          params: {
            instructions: "Triage this report into a clear issue title and body with a priority.",
            input: "{{ trigger.payload }}",
          },
          outputs: ["summary"],
        },
        {
          id: "create",
          tool: "github.create_issue",
          params: {
            repo: "your-org/your-repo",
            title: "{{ trigger.payload.title }}",
            body: "{{ triage.summary }}",
          },
        },
      ],
    },
  },
  {
    id: "weekly-report",
    name: "Weekly report",
    description: "Every Monday, query your database, summarize the week, and post to Slack.",
    category: "Analytics",
    integrations: ["postgres", "ai", "slack"],
    prompt:
      "Every Monday at 9am, query our metrics database for the last week, summarize it, and post to Slack.",
    spec: {
      version: 1,
      name: "Weekly report",
      trigger: { type: "schedule", cron: "0 9 * * 1", timezone: "UTC" },
      steps: [
        {
          id: "data",
          tool: "postgres.query",
          params: {
            sql: "select day, signups, revenue from metrics where day > now() - interval '7 days'",
          },
          outputs: ["rows"],
        },
        {
          id: "report",
          tool: "ai.generate",
          params: { instructions: "Summarize the week's metrics into a short report.", input: "{{ data.rows }}" },
          outputs: ["summary"],
        },
        {
          id: "post",
          tool: "slack.post_message",
          params: { channel: "leadership", text: "{{ report.summary }}" },
        },
      ],
    },
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
