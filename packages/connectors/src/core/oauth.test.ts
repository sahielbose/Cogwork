import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, isExpiring } from "./oauth";

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
