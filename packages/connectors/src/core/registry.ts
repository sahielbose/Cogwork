import type { ToolCatalog, ToolMeta } from "@cogwork/spec";
import type {
  AnyConnectorAction,
  Connector,
  ConnectorContext,
  RunMode,
  StepLogger,
} from "./types";
import { getRunMode } from "./run-mode";

const connectorsByProvider = new Map<string, Connector>();
const actionsByName = new Map<string, AnyConnectorAction>();

export function registerConnector(connector: Connector): void {
  // Multiple modules can share a provider (e.g. gmail + gcal are both "google").
  // Merge their actions and union their OAuth scopes into one connector entry.
  const existing = connectorsByProvider.get(connector.provider);
  if (existing) {
    existing.actions = [...existing.actions, ...connector.actions];
    if (connector.oauth) {
      if (existing.oauth) {
        existing.oauth.scopes = [...new Set([...existing.oauth.scopes, ...connector.oauth.scopes])];
      } else {
        existing.oauth = connector.oauth;
      }
    }
  } else {
    connectorsByProvider.set(connector.provider, { ...connector, actions: [...connector.actions] });
  }
  for (const action of connector.actions) {
    if (actionsByName.has(action.name)) {
      throw new Error(`Duplicate action registered: "${action.name}"`);
    }
    actionsByName.set(action.name, action);
  }
}

export function getAction(name: string): AnyConnectorAction | undefined {
  return actionsByName.get(name);
}

export function requireAction(name: string): AnyConnectorAction {
  const a = actionsByName.get(name);
  if (!a) throw new Error(`Unknown tool "${name}"`);
  return a;
}

export function getConnector(provider: string): Connector | undefined {
  return connectorsByProvider.get(provider);
}

/** Find the connector (provider) that owns a given action name. */
export function getConnectorForAction(actionName: string): Connector | undefined {
  for (const c of connectorsByProvider.values()) {
    if (c.actions.some((a) => a.name === actionName)) return c;
  }
  return undefined;
}

export function listActions(): AnyConnectorAction[] {
  return [...actionsByName.values()];
}

export function listConnectors(): Connector[] {
  return [...connectorsByProvider.values()];
}

/** The catalog the Builder validates against and the validator type-checks with. */
export function getToolCatalog(): ToolCatalog {
  return listActions().map(
    (a): ToolMeta => ({
      name: a.name,
      description: a.description,
      sideEffect: a.sideEffect,
      inputSchema: a.inputSchema,
      outputSchema: a.outputSchema,
    }),
  );
}

export interface SerializedAction {
  name: string;
  description: string;
  sideEffect: boolean;
}
export interface SerializedConnector {
  provider: string;
  authType: "oauth2" | "api_key";
  scopes: string[];
  actions: SerializedAction[];
}

/** JSON-serializable registry metadata for the UI (/api/connectors). */
export function getConnectorRegistry(): SerializedConnector[] {
  return listConnectors().map((c) => ({
    provider: c.provider,
    authType: c.authType,
    scopes: c.oauth?.scopes ?? [],
    actions: c.actions.map((a) => ({
      name: a.name,
      description: a.description,
      sideEffect: a.sideEffect,
    })),
  }));
}

/** Test helper — wipe the registry. */
export function clearRegistry(): void {
  connectorsByProvider.clear();
  actionsByName.clear();
}

const consoleLogger: StepLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Build a default ConnectorContext (used by the engine). */
export function createConnectorContext(opts: Partial<ConnectorContext> = {}): ConnectorContext {
  const runMode: RunMode = opts.runMode ?? getRunMode();
  return {
    runMode,
    logger: opts.logger ?? consoleLogger,
    fetch: opts.fetch ?? globalThis.fetch,
    connection: opts.connection,
    secrets: opts.secrets,
  };
}
