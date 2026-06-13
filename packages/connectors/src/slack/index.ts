import { z } from "zod";
import { defineAction, type Connector } from "../core/types";
import listChannelsFixture from "./fixtures/slack.list_channels.json";
import getThreadFixture from "./fixtures/slack.get_thread.json";

/** Slack connector — fixture-backed (Phase 0–2). Slack OAuth2. */

export const slackPostMessage = defineAction({
  name: "slack.post_message",
  description: "Post a message to a Slack channel or DM. Side-effecting → approval-gated.",
  inputSchema: z.object({ channel: z.string(), text: z.string() }),
  outputSchema: z.object({ ok: z.boolean(), channel: z.string(), ts: z.string() }),
  sideEffect: true,
  fixture: (input) => ({
    ok: true,
    channel: input.channel,
    ts: `${1718200000 + (input.text.length % 1000)}.000300`,
  }),
});

export const slackListChannels = defineAction({
  name: "slack.list_channels",
  description: "List Slack channels the user can post to.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    channels: z.array(z.object({ id: z.string(), name: z.string(), is_member: z.boolean() })),
  }),
  sideEffect: false,
  fixture: () => listChannelsFixture,
});

export const slackGetThread = defineAction({
  name: "slack.get_thread",
  description: "Fetch the messages in a Slack thread.",
  inputSchema: z.object({ channel: z.string(), ts: z.string() }),
  outputSchema: z.object({
    messages: z.array(z.object({ user: z.string(), text: z.string(), ts: z.string() })),
  }),
  sideEffect: false,
  fixture: () => getThreadFixture,
});

export const slackConnector: Connector = {
  provider: "slack",
  authType: "oauth2",
  oauth: {
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["chat:write", "channels:read", "channels:history"],
    refresh: async () => {
      throw new Error("Live Slack OAuth refresh is wired at go-live (Phase 3).");
    },
  },
  actions: [slackPostMessage, slackListChannels, slackGetThread],
};
