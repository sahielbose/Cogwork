import type { OAuthConfig, TokenSet } from "./types";

/**
 * One generic OAuth2 helper drives all providers (COGWORK_CONTEXT.md §11.3).
 * Built now; exercised live only at go-live (Phase 3). No network calls happen
 * in Phases 0–2 fixture mode — these are pure request builders + a token
 * exchange/refresh that runs only when a real provider is connected.
 */

export interface AuthorizeUrlParams {
  config: Pick<OAuthConfig, "authorizeUrl" | "scopes">;
  clientId: string;
  redirectUri: string;
  state: string;
  /** providers that need offline access / refresh tokens (e.g. Google) */
  extraParams?: Record<string, string>;
}

/** Build the consent URL with minimal scopes. Pure — safe to unit test. */
export function buildAuthorizeUrl(params: AuthorizeUrlParams): string {
  const url = new URL(params.config.authorizeUrl);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.config.scopes.join(" "));
  url.searchParams.set("state", params.state);
  for (const [k, v] of Object.entries(params.extraParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export interface ExchangeCodeParams {
  config: Pick<OAuthConfig, "tokenUrl">;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  fetch: typeof fetch;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

function toTokenSet(json: TokenResponse): TokenSet {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
    scopes: json.scope ? json.scope.split(/[\s,]+/).filter(Boolean) : undefined,
  };
}

/** Exchange an authorization code for tokens (live only). */
export async function exchangeCode(params: ExchangeCodeParams): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  });
  const res = await params.fetch(params.config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`);
  return toTokenSet((await res.json()) as TokenResponse);
}

export interface RefreshParams {
  config: Pick<OAuthConfig, "tokenUrl">;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetch: typeof fetch;
}

/** Refresh an access token using a refresh token (live only). */
export async function refreshToken(params: RefreshParams): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await params.fetch(params.config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`OAuth token refresh failed: ${res.status}`);
  const set = toTokenSet((await res.json()) as TokenResponse);
  // Providers often omit the refresh_token on refresh; keep the existing one.
  if (!set.refreshToken) set.refreshToken = params.refreshToken;
  return set;
}

/** Is a token near expiry (default 5-minute skew)? */
export function isExpiring(expiresAt: Date | null | undefined, skewMs = 5 * 60 * 1000): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= skewMs;
}
