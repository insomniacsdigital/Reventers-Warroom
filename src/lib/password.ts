import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt with a per-password salt, stored as "scrypt$<salt>$<hash>" (base64url).
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A readable one-time password, e.g. "kite-4821-moss". */
export function temporaryPassword(): string {
  const words = ["kite", "moss", "lime", "reef", "pine", "sage", "dune", "fern", "opal", "wren", "jade", "ruby", "palm", "iris"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const digits = String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
  return `${pick()}-${digits}-${pick()}`;
}
