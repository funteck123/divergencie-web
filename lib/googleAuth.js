import crypto from "crypto";

// Shared service-account auth for anything that needs to WRITE to Drive/Sheets
// (lib/googleDrive.js's GOOGLE_DRIVE_API_KEY is read-only and only works
// against "Anyone with the link" files -- creating/editing files needs a
// real identity). Manual JWT-bearer grant (RFC 7523), not the `googleapis`
// package -- one token-exchange POST doesn't need a whole SDK.
//
// GOOGLE_SERVICE_ACCOUNT_KEY is the full service-account JSON key as a
// compact single-line string (see .env.local) -- parsed fresh on every call
// rather than cached at module load, so a key rotation only needs the env
// var updated, not a process restart.
function loadServiceAccountKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured.");
  return JSON.parse(raw);
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Access tokens are valid for 1 hour -- cached per unique scope string so
// repeated calls within that window (e.g. several Timesheet generations in
// one batch) don't each pay a fresh token-exchange round trip. Refreshed 60s
// before real expiry as a safety margin against clock drift/request latency.
const tokenCache = new Map();

export async function getServiceAccountAccessToken(scopes) {
  const scope = Array.isArray(scopes) ? scopes.join(" ") : scopes;
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const key = loadServiceAccountKey();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = { iss: key.client_email, scope, aud: key.token_uri, iat: now, exp: now + 3600 };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(key.private_key).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Service account token exchange failed: ${JSON.stringify(data)}`);

  tokenCache.set(scope, { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 });
  return data.access_token;
}

// A bare service account has ZERO Drive storage quota of its own outside a
// Google Workspace Shared Drive -- creating/copying a file it would own
// fails with storageQuotaExceeded even with Editor access to the
// destination folder, confirmed live 2026-08-31 (see study/agent-notes/
// 20-*.md). Real fix: act as the actual Gmail account via a stored OAuth
// refresh token (GOOGLE_OAUTH_REFRESH_TOKEN) instead -- the created file is
// then owned by that real account, which has real storage. Use this for
// any Drive/Sheets/Docs WRITE that creates a new file; the read-only
// service-account path above is still fine for anything that only reads
// or edits an existing file it doesn't need to own.
let oauthTokenCache = null;

export async function getOAuthAccessToken() {
  if (oauthTokenCache && oauthTokenCache.expiresAt > Date.now()) return oauthTokenCache.accessToken;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID/SECRET/GOOGLE_OAUTH_REFRESH_TOKEN are not fully configured.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth token refresh failed: ${JSON.stringify(data)}`);

  oauthTokenCache = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}
