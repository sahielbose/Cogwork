import { describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, ensureFreshAccessToken, isExpiring } from "./oauth";

describe("buildAuthorizeUrl", () => {
  it("builds a consent URL with scopes and state", () => {
    const url = new URL(
      buildAuthorizeUrl({
        config: {
          authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
          scopes: ["a.read", "b.write"],
        },
        clientId: "client-123",
        redirectUri: "http://localhost:3000/api/connections/google/callback",
        state: "state-xyz",
        extraParams: { access_type: "offline", prompt: "consent" },
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("scope")).toBe("a.read b.write");
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
  });
});

describe("isExpiring", () => {
  it("treats null expiry as not expiring", () => {
    expect(isExpiring(null)).toBe(false);
  });
  it("flags a token within the skew window", () => {
    expect(isExpiring(new Date(Date.now() + 60_000))).toBe(true);
  });
  it("does not flag a token far from expiry", () => {
    expect(isExpiring(new Date(Date.now() + 60 * 60_000))).toBe(false);
  });
});

describe("ensureFreshAccessToken", () => {
  const base = {
    accessToken: "old",
    refreshToken: "refresh-1",
    config: { tokenUrl: "https://oauth.example.com/token" },
    clientId: "id",
    clientSecret: "secret",
  };

  it("returns the existing token when it is not expiring (no network)", async () => {
    const fetchMock = vi.fn();
    const res = await ensureFreshAccessToken({
      ...base,
      expiresAt: new Date(Date.now() + 60 * 60_000),
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(res.refreshed).toBe(false);
    expect(res.tokens.accessToken).toBe("old");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expiring token", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "new", expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await ensureFreshAccessToken({
      ...base,
      expiresAt: new Date(Date.now() + 30_000),
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(res.refreshed).toBe(true);
    expect(res.tokens.accessToken).toBe("new");
    expect(res.tokens.refreshToken).toBe("refresh-1"); // carried over
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws when the refresh call fails (caller flags needs_reauth)", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 400 }));
    await expect(
      ensureFreshAccessToken({
        ...base,
        expiresAt: new Date(Date.now() + 10_000),
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/refresh failed/);
  });
});
