import { z } from "zod";
import { defineAction, type Connector } from "../core/types";
import listMessagesFixture from "./fixtures/gmail.list_messages.json";
import getMessageFixture from "./fixtures/gmail.get_message.json";

/**
 * Gmail connector — fixture-backed (Phase 0–2). Live Gmail API calls are wired
 * at go-live (Phase 3). Google OAuth2.
 */

const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string().optional(),
  from: z.string(),
  to: z.string().optional(),
  subject: z.string(),
  snippet: z.string().optional(),
  date: z.string(),
  unread: z.boolean().optional(),
});

const FullMessageSchema = MessageSchema.extend({ body: z.string() });

export const gmailListMessages = defineAction({
  name: "gmail.list_messages",
  description: "List Gmail messages matching a query (e.g. 'is:unread newer_than:1d').",
  inputSchema: z.object({
    query: z.string().default(""),
    max: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({ messages: z.array(MessageSchema) }),
  sideEffect: false,
  fixture: (input) => {
    const all = listMessagesFixture.messages;
    return { messages: input.max ? all.slice(0, input.max) : all };
  },
});

export const gmailGetMessage = defineAction({
  name: "gmail.get_message",
  description: "Fetch a single Gmail message (with body) by id.",
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({ message: FullMessageSchema }),
  sideEffect: false,
  fixture: (input) => ({ message: { ...getMessageFixture.message, id: input.id } }),
});

export const gmailCreateDraft = defineAction({
  name: "gmail.create_draft",
  description: "Create a Gmail draft email (does not send). Side-effecting → approval-gated.",
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  outputSchema: z.object({ draftId: z.string(), to: z.string(), subject: z.string() }),
  sideEffect: true,
  fixture: (input) => ({
    draftId: `draft_${Buffer.from(input.to + input.subject).toString("hex").slice(0, 10)}`,
    to: input.to,
    subject: input.subject,
  }),
});

export const gmailSend = defineAction({
  name: "gmail.send",
  description: "Send a Gmail message. Side-effecting → approval-gated.",
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  outputSchema: z.object({ messageId: z.string(), to: z.string() }),
  sideEffect: true,
  fixture: (input) => ({
    messageId: `sent_${Buffer.from(input.to + input.subject).toString("hex").slice(0, 10)}`,
    to: input.to,
  }),
});

export const gmailConnector: Connector = {
  provider: "google",
  authType: "oauth2",
  oauth: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
    refresh: async () => {
      throw new Error("Live Gmail OAuth refresh is wired at go-live (Phase 3).");
    },
  },
  actions: [gmailListMessages, gmailGetMessage, gmailCreateDraft, gmailSend],
};
