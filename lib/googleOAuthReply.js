// TKT-0321: turns Google's token-endpoint reply into an access token or a clear error. No imports, so `node --test` can run it.
export const GOOGLE_LOGIN_EXPIRED_MESSAGE = "The Google login DivergenCIE uses to create files and send email has expired. Ask the account owner to reconnect Google (run scripts/ops/google-reauth.mjs), then try again.";

export class GoogleLoginExpiredError extends Error {
  constructor(google) {
    super(GOOGLE_LOGIN_EXPIRED_MESSAGE);
    this.name = "GoogleLoginExpiredError";
    this.google = google;
  }
}

/** invalid_grant (the refresh token is expired or revoked) becomes GoogleLoginExpiredError; any other failure keeps Google's own text. */
export function readOAuthRefreshReply(data, now = Date.now()) {
  if (data && data.access_token) return { accessToken: data.access_token, expiresAt: now + (Number(data.expires_in || 3600) - 60) * 1000 };
  if (data && data.error === "invalid_grant") throw new GoogleLoginExpiredError(data);
  throw new Error(`OAuth token refresh failed: ${JSON.stringify(data)}`);
}
