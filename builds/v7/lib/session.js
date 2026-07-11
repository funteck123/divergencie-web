import crypto from "crypto";

// HMAC-signed cookie session — no external auth library, no DB-backed
// session table (this app's whole "database" is a single JSON file with no
// concurrent-session store). The cookie carries {userId, userType, iat} and
// is tamper-evident via HMAC-SHA256, not encrypted — it's the same trust
// model as a signed JWT, just without the JWT library/format overhead.
const SECRET = process.env.SESSION_SECRET || "dcp1-dev-only-insecure-secret-change-me";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.warn(
    "[session] SESSION_SECRET is not set in production — falling back to an insecure, publicly-known dev secret. " +
      "Set SESSION_SECRET in the environment before deploying."
  );
}

export const SESSION_COOKIE = "dcp1_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
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

export function clearedSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 },
  };
}

// Reads + verifies the session cookie off a NextRequest (app router route
// handlers get a real Request/NextRequest with .cookies). Returns
// {userId, userType} or null — never throws on a malformed/forged cookie.
export function getSession(req) {
  const token = req.cookies?.get?.(SESSION_COOKIE)?.value;
  const payload = verify(token);
  if (!payload?.userId || !payload?.userType) return null;
  return { userId: payload.userId, userType: payload.userType };
}
