import { NextResponse } from "next/server";

// In-process sliding-window rate limiter. Red-team pass (2026-08-24) found
// zero throttling on both POST /api/login (unlimited-speed password
// guessing against any account) and POST /api/register (unauthenticated
// spam of the public RegForm queue).
//
// LIMITATION, disclosed not hidden: this state is a plain in-memory Map.
// It resets on every process restart and is NOT shared across multiple
// instances -- fine for this app's current single-instance deployment,
// not a substitute for a shared store (e.g. Redis) if that ever changes.
const buckets = new Map(); // key -> { count, windowStart }

function clientIp(req) {
  const fwd = req.headers?.get?.("x-forwarded-for") || "";
  const first = fwd.split(",")[0].trim();
  return first || req.headers?.get?.("x-real-ip") || "unknown";
}

// Returns a 429 NextResponse if `key` is over `limit` attempts within
// `windowMs`, otherwise null (caller should proceed). Sliding-window via a
// simple reset-on-expiry counter -- not exact sliding-window math, but
// close enough for a lockout, and simple enough to audit at a glance.
function checkAndTouch(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return null;
  }
  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  bucket.count += 1;
  return null;
}

// Login: keyed on username+IP together (not just username, so it can't be
// used to lock a real user out by an attacker who doesn't have their own
// IP throttled yet; not just IP, so many usernames behind one shared/NAT
// IP still work normally). 5 attempts per 5 minutes.
export function checkLoginRateLimit(req, username) {
  const key = `login:${clientIp(req)}:${(username || "").toLowerCase()}`;
  return checkAndTouch(key, 5, 5 * 60 * 1000);
}

// Register: unauthenticated, so IP is the only real signal available.
// 5 submissions per 5 minutes per IP.
export function checkRegisterRateLimit(req) {
  const key = `register:${clientIp(req)}`;
  return checkAndTouch(key, 5, 5 * 60 * 1000);
}

// Test/ops escape hatch -- not imported anywhere in app code, exists so a
// verification script (or a future test) can reset state between runs
// without waiting out a real window or restarting the process.
export function _resetRateLimits() {
  buckets.clear();
}
