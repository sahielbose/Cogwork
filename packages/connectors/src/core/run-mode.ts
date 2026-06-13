import type { AnyConnectorAction, ConnectorContext, RunMode } from "./types";

/** Connector run mode from env. Default fixture (no third-party creds). §11.4 */
export function getRunMode(): RunMode {
  return process.env.COGWORK_CONNECTORS === "live" ? "live" : "fixture";
}

/**
 * Execute one action. Input is validated against the action's inputSchema; the
 * result is validated against its outputSchema in BOTH modes (so fixtures are
 * held to the same contract as live). In fixture mode no network/creds are used.
 */
export async function runAction(
  action: AnyConnectorAction,
  input: unknown,
  ctx: ConnectorContext,
  idempotencyKey?: string,
): Promise<unknown> {
  const parsedInput = action.inputSchema.parse(input);

  let raw: unknown;
  if (ctx.runMode === "live") {
    if (!action.live) {
      throw new Error(`Action "${action.name}" has no live implementation.`);
    }
    raw = await action.live(parsedInput, ctx, idempotencyKey);
  } else {
    raw =
      typeof action.fixture === "function"
        ? await (action.fixture as (i: unknown, c: ConnectorContext) => unknown)(parsedInput, ctx)
        : action.fixture;
  }

  return action.outputSchema.parse(raw);
}
