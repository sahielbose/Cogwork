export * from "./core";

import { getAction, registerConnector } from "./core/registry";
import { aiConnector } from "./ai";
import { gmailConnector } from "./gmail";
import { gcalConnector } from "./gcal";
import { slackConnector } from "./slack";

/** Register all built-in connectors. Idempotent — safe after clearRegistry(). */
export function registerBuiltins(): void {
  if (getAction("ai.generate")) return; // already registered
  registerConnector(aiConnector);
  registerConnector(gmailConnector);
  registerConnector(gcalConnector);
  registerConnector(slackConnector);
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
