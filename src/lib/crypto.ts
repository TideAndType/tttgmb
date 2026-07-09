import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Transparent AES-256-GCM encryption for secrets at rest. Keyed by
// ENCRYPTION_KEY (any string; hashed to 32 bytes). Encrypted values carry an
// "enc:" prefix so decrypt() can pass through legacy plaintext untouched — this
// makes turning encryption on non-breaking for existing rows.

const PREFIX = "enc:";

function key(): Buffer | null {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) return null;
  return createHash("sha256").update(k).digest();
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  const k = key();
  if (!k) return plain; // no key configured → store as-is (degrades gracefully)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  const k = key();
  if (!k) return null; // encrypted but no key available — cannot read
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function encryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}
