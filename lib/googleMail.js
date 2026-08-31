import { getOAuthAccessToken } from "./googleAuth";

// Sends real email via the Gmail API, as divergenciecoaching@gmail.com --
// reuses the same OAuth grant already used for Drive/Sheets (its scope
// includes https://mail.google.com/, confirmed via tokeninfo before this
// was written, see study/agent-notes/20-*.md and 21-*.md for the rest of
// that grant's history). Gmail's API takes a raw base64url-encoded RFC 2822
// message, not a simple {to, subject, body} POST body -- built by hand here
// since there's no existing mail library in this codebase yet.
function buildRawMessage({ to, subject, text }) {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
  ];
  const message = lines.join("\r\n");
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// to: a single address or an array of addresses (sent as one message with
// multiple To: recipients, not one send per address).
export async function sendEmail({ to, subject, text }) {
  const accessToken = await getOAuthAccessToken();
  const toHeader = Array.isArray(to) ? to.join(", ") : to;
  const raw = buildRawMessage({ to: toHeader, subject, text });

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`sendEmail: Gmail API send failed: ${JSON.stringify(data)}`);
  return data;
}
