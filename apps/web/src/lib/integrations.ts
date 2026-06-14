/** Display metadata for the integrations directory (COGWORK_UI.md §5.3). */
export interface IntegrationMeta {
  label: string;
  category: string;
  blurb: string;
}

export const INTEGRATION_META: Record<string, IntegrationMeta> = {
  ai: { label: "AI (Anthropic)", category: "AI", blurb: "Summarize, draft, classify, and extract with an LLM." },
  google: { label: "Google", category: "Email", blurb: "Gmail + Calendar — read mail and manage events." },
  slack: { label: "Slack", category: "Messaging", blurb: "Post messages and read channels and threads." },
  notion: { label: "Notion", category: "Docs", blurb: "Query databases and create or update pages." },
  github: { label: "GitHub", category: "Dev", blurb: "List, open, and comment on issues." },
  postgres: { label: "Postgres", category: "Data", blurb: "Read with queries; guarded writes." },
  apify: { label: "Apify", category: "Scraping", blurb: "Run actors for web scraping and search." },
  http: { label: "HTTP", category: "Dev", blurb: "Call any REST API." },
};

export function metaFor(provider: string): IntegrationMeta {
  return (
    INTEGRATION_META[provider] ?? {
      label: provider,
      category: "Other",
      blurb: "Integration.",
    }
  );
}
