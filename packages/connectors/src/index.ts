export * from "./core";

import { getAction, registerConnector } from "./core/registry";
import { aiConnector } from "./ai";
import { gmailConnector } from "./gmail";
import { gcalConnector } from "./gcal";
import { slackConnector } from "./slack";
import { notionConnector } from "./notion";
import { githubConnector } from "./github";
import { postgresConnector } from "./postgres";
import { apifyConnector } from "./apify";
import { httpConnector } from "./http";

/** Register all built-in connectors. Idempotent — safe after clearRegistry(). */
export function registerBuiltins(): void {
  if (getAction("ai.generate")) return; // already registered
  registerConnector(aiConnector);
  registerConnector(gmailConnector);
  registerConnector(gcalConnector);
  registerConnector(slackConnector);
  registerConnector(notionConnector);
  registerConnector(githubConnector);
  registerConnector(postgresConnector);
  registerConnector(apifyConnector);
  registerConnector(httpConnector);
}

registerBuiltins();

export { aiConnector, aiGenerate } from "./ai";
export { resolveAnthropicModel, DEFAULT_AI_MODEL } from "./ai/models";
export {
  gmailConnector,
  gmailListMessages,
  gmailGetMessage,
  gmailCreateDraft,
  gmailSend,
} from "./gmail";
export { gcalConnector, gcalListEvents, gcalCreateEvent } from "./gcal";
export { slackConnector, slackPostMessage, slackListChannels, slackGetThread } from "./slack";
export { notionConnector, notionQueryDatabase, notionCreatePage, notionUpdatePage } from "./notion";
export { githubConnector, githubListIssues, githubCreateIssue, githubComment } from "./github";
export { postgresConnector, postgresQuery, postgresExecute } from "./postgres";
export { apifyConnector, apifyRunActor } from "./apify";
export { httpConnector, httpRequest } from "./http";
