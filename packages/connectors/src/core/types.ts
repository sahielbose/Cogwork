import type { z } from "zod";

/** A decrypted connection (tokens decrypted just-in-time, live mode only). */
export interface DecryptedConnection {
  id: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface StepLogger {
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export type RunMode = "fixture" | "live";

export interface ConnectorContext {
  /** decrypted connection for the action's provider (live mode) */
  connection?: DecryptedConnection;
  logger: StepLogger;
  fetch: typeof fetch;
  runMode: RunMode;
  /** server-side secrets, resolved for {{ secrets.* }} bindings; never logged */
  secrets?: Record<string, string>;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface ConnectorAction<I = unknown, O = unknown> {
  /** "gmail.list_messages" */
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  /** true → approval-gated by default */
  sideEffect: boolean;
  /** canned data conforming to outputSchema (fixture mode); may be input-aware */
  fixture: O | ((input: I, ctx: ConnectorContext) => O | Promise<O>);
  /** real API call (live mode). Built now; exercised live only at go-live. */
  live?: (input: I, ctx: ConnectorContext, idempotencyKey?: string) => Promise<O>;
}

/**
 * Erased action type for heterogeneous collections (the registry, a connector's
 * action list). A specific ConnectorAction<I, O> is assignable to this; the
 * generic form can't be stored in a collection due to input contravariance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyConnectorAction = ConnectorAction<any, any>;

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  refresh(refreshToken: string, ctx: { fetch: typeof fetch }): Promise<TokenSet>;
}

export interface Connector {
  provider: string; // "google" | "slack" | ...
  authType: "oauth2" | "api_key";
  oauth?: OAuthConfig;
  actions: AnyConnectorAction[];
}

/** Helper that infers I/O from the Zod schemas while keeping a concrete type. */
export function defineAction<I, O>(a: {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  sideEffect: boolean;
  fixture: O | ((input: I, ctx: ConnectorContext) => O | Promise<O>);
  live?: (input: I, ctx: ConnectorContext, idempotencyKey?: string) => Promise<O>;
}): ConnectorAction<I, O> {
  return a;
}
