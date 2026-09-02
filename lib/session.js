import crypto from "crypto";

// HMAC-signed cookie session — no external auth library, no DB-backed
// session table (this app's whole "database" is a single JSON file with no
// concurrent-session store). The cookie carries {userId, userType, iat} and
// is tamper-evident via HMAC-SHA256, not encrypted — it's the same trust
// model as a signed JWT, just without the JWT library/format overhead.
//
// SECURITY: this used to fall back to a hardcoded, publicly-known dev
// secret whenever SESSION_SECRET was unset — anyone who read this file
// could forge a valid session/API-key token for ANY user, including
// Management, with zero credentials. Confirmed exploitable live (red-team
// pass, 2026-08-24). There is no safe hardcoded fallback for a signing
// secret: production must set a real one or refuse to start; dev gets a
// freshly-random one each boot instead of a known string.
function resolveSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production — refusing to start with an insecure default. " +
        "Set SESSION_SECRET in the environment before deploying."
    );
  }
  const generated = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[session] SESSION_SECRET not set — generated a random secret for this dev process only. " +
      "Every existing session/API key is invalidated on each restart until you set SESSION_SECRET."
  );
  return generated;
}
const SECRET = resolveSecret();

export const SESSION_COOKIE = "dcp1_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// API keys use the exact same HMAC-signed token format as session cookies
// (see sign()/verify() below) — just transmitted as a Bearer header instead
// of a cookie, with no expiry baked into the cookie itself (an `exp` field
// inside the signed payload instead, checked by verify()). This means an
// API key is verified with ZERO database round-trip: the signature alone
// proves it was genuinely issued by this server and hasn't been tampered
// with. Trade-off: revoking a key (see app/api/apikeys/route.js's DELETE)
// only removes it from the bookkeeping list Management sees — it does NOT
// cryptographically invalidate an already-issued token before its own
// `exp`. Keep the default TTL short-ish for that reason; rotating
// SESSION_SECRET is the nuclear option that invalidates every session AND
// every API key at once.
const API_KEY_DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    // exp is only ever set on API-key tokens (session cookies rely on the
    // cookie's own maxAge instead) — honored generically here so any future
    // signed-token type can opt into expiry the same way.
    if (payload?.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Mints a long-lived Bearer token for CLI/MCP/agent use, scoped to one
// user. `apiKeyId` is a short random id embedded in the token AND meant to
// be stored in the DB bookkeeping list (app/api/apikeys/route.js) so
// Management can see/label/delete issued keys — deleting the DB record is
// for hygiene/audit, not real-time revocation (see comment above).
export function signApiKey({ userId, userType, expiresInSeconds = API_KEY_DEFAULT_TTL_SECONDS }) {
  const apiKeyId = crypto.randomBytes(9).toString("base64url");
  const iat = Date.now();
  const payload = { userId, userType, kind: "apikey", apiKeyId, iat };
  if (expiresInSeconds) payload.exp = iat + expiresInSeconds * 1000;
  return { token: sign(payload), apiKeyId, iat, exp: payload.exp ?? null };
}

// Cookie descriptor for NextResponse.cookies.set(name, value, options).
export function sessionCookieFor(user) {
  const token = sign({ userId: user.UserID, userType: user.UserType, iat: Date.now() });
  return {
    name: SESSION_COOKIE,
    value: token,
    options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE_SECONDS },
  };
}

// Impersonation: a Management user "logs in as" another account WITHOUT
// ever learning or resetting their password (see app/api/impersonate/route.js
// -- built to replace a proposed "make passwords viewable again" change,
// which would have reopened the exact plaintext-password-leak incident
// lib/passwords.js's hashing exists to prevent). Same signed-cookie shape
// as a real login, plus an `impersonatorUserId` claim so getSession() can
// surface "who is really driving this session" to the UI (the "Stop
// impersonating" banner) and so POST /api/impersonate/stop knows who to
// hand the session back to. Capped well under the normal 7-day session
// length on purpose -- an impersonation session left open is a bigger risk
// than a normal one, so it should time out on its own even if the admin
// never clicks "Stop impersonating."
const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export function impersonationCookieFor(targetUser, actorUserId) {
  const token = sign({
    userId: targetUser.UserID,
    userType: targetUser.UserType,
    impersonatorUserId: actorUserId,
    iat: Date.now(),
  });
  return {
    name: SESSION_COOKIE,
    value: token,
    options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: IMPERSONATION_MAX_AGE_SECONDS },
  };
}

export function clearedSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 },
  };
}

// Reads + verifies either the session cookie (web UI) or an
// `Authorization: Bearer <token>` API key (CLI/MCP/agent use) off a
// NextRequest. Returns {userId, userType} or null — never throws on a
// malformed/forged/expired token. Cookie takes priority when both happen
// to be present (a browser session naturally wins over a leftover header).
export function getSession(req) {
  const cookieToken = req.cookies?.get?.(SESSION_COOKIE)?.value;
  const cookiePayload = verify(cookieToken);
  if (cookiePayload?.userId && cookiePayload?.userType) {
    return {
      userId: cookiePayload.userId,
      userType: cookiePayload.userType,
      // Only present on an impersonation cookie (see impersonationCookieFor
      // above) -- undefined on a normal login, so existing callers that
      // destructure just {userId, userType} are unaffected.
      impersonatorUserId: cookiePayload.impersonatorUserId,
    };
  }

  const authHeader = req.headers?.get?.("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (match) {
    const keyPayload = verify(match[1]);
    if (keyPayload?.kind === "apikey" && keyPayload?.userId && keyPayload?.userType) {
      return { userId: keyPayload.userId, userType: keyPayload.userType };
    }
  }

  return null;
}
