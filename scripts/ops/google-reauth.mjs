// TKT-0321: mints a new GOOGLE_OAUTH_REFRESH_TOKEN for the Gmail account DivergenCIE creates files and sends email as.
// Run it as the account owner, on a computer with a browser:
//   node --env-file=.env.local scripts/ops/google-reauth.mjs
// It prints a Google sign-in link, waits for Google to redirect back to http://localhost:8765, exchanges the code and prints
// the new refresh token. It changes nothing by itself. Set the printed value as GOOGLE_OAUTH_REFRESH_TOKEN in Vercel
// (Production) and in .env.local, then redeploy.
// If Google says "redirect_uri_mismatch", add http://localhost:8765 to the OAuth client's authorised redirect URIs.
// To stop the token expiring after 7 days, set the OAuth consent screen's publishing status to "In production" first.
import http from "http";

const PORT = Number(process.env.REAUTH_PORT || 8765);
const REDIRECT = `http://localhost:${PORT}`;
// What the app actually calls: Drive (create and copy files), Sheets (timesheets and trackers), Gmail send (notifications).
const SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.send"];

const { GOOGLE_OAUTH_CLIENT_ID: clientId, GOOGLE_OAUTH_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are not set. Run with: node --env-file=.env.local scripts/ops/google-reauth.mjs");
  process.exit(1);
}

const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
url.search = new URLSearchParams({ client_id: clientId, redirect_uri: REDIRECT, response_type: "code", scope: SCOPES.join(" "), access_type: "offline", prompt: "consent" }).toString();

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get("code");
  if (!code) { res.writeHead(400); res.end("No code in the request."); return; }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT, grant_type: "authorization_code" }),
  });
  const data = await tokenRes.json();
  res.writeHead(200, { "Content-Type": "text/plain" });
  if (!data.refresh_token) {
    res.end("Google did not return a refresh token. See the terminal.");
    console.error("No refresh token in the reply:", JSON.stringify({ ...data, access_token: data.access_token ? "<hidden>" : undefined }));
  } else {
    res.end("Done. You can close this tab and go back to the terminal.");
    console.log("\nNew refresh token (keep it secret):\n\n" + data.refresh_token + "\n\nGranted scopes: " + data.scope);
    console.log("\nNext: set GOOGLE_OAUTH_REFRESH_TOKEN to this value in Vercel (Production) and in .env.local, then redeploy.");
  }
  server.close();
});
server.listen(PORT, () => console.log(`Open this link and sign in as the DivergenCIE Gmail account:\n\n${url}\n\nWaiting for Google on ${REDIRECT} ...`));
