// TKT-0321: mints a new GOOGLE_OAUTH_REFRESH_TOKEN for the Gmail account DivergenCIE creates files and sends email as.
// Run it as the account owner, on a computer with a browser:
//   node --env-file=.env.local scripts/ops/google-reauth.mjs --save
// --save also writes the new token into .env.local (after copying that file to .env.local.bak-<time>), so nothing has to be pasted.
// It prints a Google sign-in link, waits for Google to redirect back to http://localhost:8765, exchanges the code and prints
// the new refresh token. It changes nothing by itself. Set the printed value as GOOGLE_OAUTH_REFRESH_TOKEN in Vercel
// (Production) and in .env.local, then redeploy.
// If Google says "redirect_uri_mismatch", add http://localhost:8765 to the OAuth client's authorised redirect URIs.
// To stop the token expiring after 7 days, set the OAuth consent screen's publishing status to "In production" first.
import fs from "fs";
import http from "http";

const SAVE = process.argv.includes("--save");
const PORT = Number(process.env.REAUTH_PORT || 8765);
const REDIRECT = `http://localhost:${PORT}`;
// What the app actually calls: Drive (create and copy files), Sheets (timesheets and trackers), Gmail send (notifications),
// YouTube upload (TKT-0358: class recordings as unlisted videos; sign in as the owner of the DivergenCIE channel).
const SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/youtube.upload"];

const { GOOGLE_OAUTH_CLIENT_ID: clientId, GOOGLE_OAUTH_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are not set. Run with: node --env-file=.env.local scripts/ops/google-reauth.mjs");
  process.exit(1);
}

const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
url.search = new URLSearchParams({ client_id: clientId, redirect_uri: REDIRECT, response_type: "code", scope: SCOPES.join(" "), access_type: "offline", prompt: "consent" }).toString();

function saveToEnvFile(token) {
  const file = ".env.local";
  if (!fs.existsSync(file)) { console.error(`--save: ${file} not found in ${process.cwd()}. Run this from the project folder.`); return; }
  const text = fs.readFileSync(file, "utf8");
  if (!/^GOOGLE_OAUTH_REFRESH_TOKEN=.*$/m.test(text)) { console.error("--save: no GOOGLE_OAUTH_REFRESH_TOKEN line in .env.local, nothing written."); return; }
  const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.copyFileSync(file, backup);
  fs.writeFileSync(file, text.replace(/^GOOGLE_OAUTH_REFRESH_TOKEN=.*$/m, () => `GOOGLE_OAUTH_REFRESH_TOKEN=${token}`));
  console.log(`\nSaved the new token in ${file} (old file kept as ${backup}).`);
}

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
    if (SAVE) saveToEnvFile(data.refresh_token);
    console.log("\nNext: set GOOGLE_OAUTH_REFRESH_TOKEN to this value in Vercel (Production) and in .env.local, then redeploy.");
  }
  server.close();
});
server.listen(PORT, () => console.log(`Open this link and sign in as the DivergenCIE Gmail account:\n\n${url}\n\nWaiting for Google on ${REDIRECT} ...`));
