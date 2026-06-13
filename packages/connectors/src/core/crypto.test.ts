import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, generateKey } from "./crypto";

describe("AES-256-GCM token crypto", () => {
  it("round-trips plaintext", () => {
    const key = Buffer.from(generateKey(), "base64");
    const secret = "ya29.a0AfH6-very-secret-oauth-token";
    const enc = encryptToken(secret, key);
    expect(enc).not.toContain(secret);
    expect(enc.split(":")).toHaveLength(3);
    expect(decryptToken(enc, key)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const key = Buffer.from(generateKey(), "base64");
    const a = encryptToken("same", key);
    const b = encryptToken("same", key);
    expect(a).not.toBe(b);
    expect(decryptToken(a, key)).toBe("same");
    expect(decryptToken(b, key)).toBe("same");
  });

  it("fails to decrypt with the wrong key", () => {
    const enc = encryptToken("secret", Buffer.from(generateKey(), "base64"));
    expect(() => decryptToken(enc, Buffer.from(generateKey(), "base64"))).toThrow();
  });

  it("detects tampering (auth tag)", () => {
    const key = Buffer.from(generateKey(), "base64");
    const enc = encryptToken("secret", key);
    const [iv, tag, data] = enc.split(":");
    const flipped = Buffer.from(data!, "base64");
    flipped[0] = flipped[0]! ^ 0xff;
    const tampered = [iv, tag, flipped.toString("base64")].join(":");
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  it("rejects a malformed payload", () => {
    const key = Buffer.from(generateKey(), "base64");
    expect(() => decryptToken("not-a-valid-payload", key)).toThrow(/malformed/);
  });
});
