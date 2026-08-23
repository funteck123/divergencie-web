import crypto from "crypto";

// scrypt-hashed credentials. This app used to store login passwords as
// literal plaintext and return them from GET /api/users -- confirmed
// live-exploitable in a red-team pass (2026-08-24): any Management-
// authenticated caller got back every real account's actual password.
// Hashing is one-way on purpose: once a password is set, nothing in this
// app can ever read it back, only regenerate/reset it. Any "view this
// account's password" UI has to become a reveal-once-at-creation flow.

const KEYLEN = 64;
// Ambiguous characters (0/O, 1/l/I) dropped so a password read aloud or
// hand-copied doesn't get mistyped.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

// crypto.randomBytes is a CSPRNG; Math.random() (the old implementation)
// is not and is a weak source of secrets. Same 12-char length, real
// entropy behind it now.
export function generatePassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

// Also usable as an isHashed() check on a stored value: an unrecognized
// format (e.g. a legacy plaintext row that hasn't gone through the
// migration script) can never match, which is fail-closed, not a lockout
// risk in practice since the migration hashes every existing row.
export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(plain, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}
