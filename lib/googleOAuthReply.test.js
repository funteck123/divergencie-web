import test from "node:test";
import assert from "node:assert/strict";
import { readOAuthRefreshReply, GoogleLoginExpiredError, GOOGLE_LOGIN_EXPIRED_MESSAGE } from "./googleOAuthReply.js";

test("a good reply gives the token and an expiry a minute early", () => {
  const r = readOAuthRefreshReply({ access_token: "abc", expires_in: 3600 }, 1_000_000);
  assert.equal(r.accessToken, "abc");
  assert.equal(r.expiresAt, 1_000_000 + 3540 * 1000);
});

test("invalid_grant becomes the plain-words error and keeps Google's reply for the log", () => {
  const google = { error: "invalid_grant", error_description: "Bad Request" };
  assert.throws(() => readOAuthRefreshReply(google), (e) => e instanceof GoogleLoginExpiredError && e.message === GOOGLE_LOGIN_EXPIRED_MESSAGE && e.google === google);
  assert.ok(!GOOGLE_LOGIN_EXPIRED_MESSAGE.includes("invalid_grant"));
});

test("other failures keep Google's own text", () => {
  assert.throws(() => readOAuthRefreshReply({ error: "invalid_client" }), /OAuth token refresh failed: .*invalid_client/);
  assert.throws(() => readOAuthRefreshReply(undefined), /OAuth token refresh failed/);
});
