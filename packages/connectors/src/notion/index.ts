import { z } from "zod";
import { defineAction, type Connector } from "../core/types";

/** Notion connector — fixture-backed (Phase 0–2). Notion OAuth2. */

const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  properties: z.record(z.unknown()).optional(),
});

export const notionQueryDatabase = defineAction({
  name: "notion.query_database",
  description: "Query rows from a Notion database.",
  inputSchema: z.object({ databaseId: z.string(), filter: z.record(z.unknown()).optional() }),
  outputSchema: z.object({ pages: z.array(PageSchema) }),
  sideEffect: false,
  fixture: (input) => ({
    pages: [
      {
        id: "page_1",
        title: "Q3 hiring plan",
        url: `https://notion.so/${input.databaseId}/page_1`,
        properties: { Status: "In progress", Owner: "Dana" },
      },
      {
        id: "page_2",
        title: "Launch checklist",
        url: `https://notion.so/${input.databaseId}/page_2`,
        properties: { Status: "Todo", Owner: "Marcus" },
      },
    ],
  }),
});

export const notionCreatePage = defineAction({
  name: "notion.create_page",
  description: "Create a page in a Notion database. Side-effecting → approval-gated.",
  inputSchema: z.object({
    parent: z.string(),
    title: z.string(),
    properties: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({ pageId: z.string(), url: z.string() }),
  sideEffect: true,
  fixture: (input) => {
    const pageId = `page_${Buffer.from(input.title).toString("hex").slice(0, 8)}`;
    return { pageId, url: `https://notion.so/${pageId}` };
  },
});

export const notionUpdatePage = defineAction({
  name: "notion.update_page",
  description: "Update a Notion page's properties. Side-effecting → approval-gated.",
  inputSchema: z.object({ pageId: z.string(), properties: z.record(z.unknown()) }),
  outputSchema: z.object({ pageId: z.string() }),
  sideEffect: true,
  fixture: (input) => ({ pageId: input.pageId }),
});

export const notionConnector: Connector = {
  provider: "notion",
  authType: "oauth2",
  oauth: {
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    refresh: async () => {
      throw new Error("Live Notion OAuth is wired at go-live (Phase 3).");
    },
  },
  actions: [notionQueryDatabase, notionCreatePage, notionUpdatePage],
};
