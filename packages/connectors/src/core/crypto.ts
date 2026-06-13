import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM envelope encryption for stored OAuth tokens / connection secrets.
 * Keyed by ENCRYPTION_KEY (32-byte base64). COGWORK_CONTEXT.md §15.
 *
 * Payload format (base64 fields joined by ":"):  iv : authTag : ciphertext
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

export function loadKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) {
    throw new Error("ENCRYPTION_KEY is not set (32-byte base64; openssl rand -base64 32).");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`);
  }
  return key;
}

export function encryptToken(plaintext: string, key: Buffer = loadKey()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptToken(payload: string, key: Buffer = loadKey()): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("malformed encrypted payload");
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Generate a fresh 32-byte key (base64) — used by tests and tooling. */
export function generateKey(): string {
  return randomBytes(32).toString("base64");
}
