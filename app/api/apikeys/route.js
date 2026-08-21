import { NextResponse } from "next/server";
import { readDB, writeDB, deleteRecords } from "@/lib/db";
import { signApiKey } from "@/lib/session";
import { requireSelfOrManagement, requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Mints a long-lived Bearer token (see lib/session.js's signApiKey) for
// CLI/MCP/agent use — the token itself is never stored, only returned once
// in this response; the DB record is bookkeeping only (id/label/expiry for
// Management's "issued keys" list), not what authenticates future requests.
//
// body: { userId, label?, expiresInDays? }
// Self-service (a user minting their own key, e.g. the CLI's `login`
// bootstrap flow) or Management minting a key on behalf of anyone.
export async function POST(req) {
  const { userId, label, expiresInDays } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const { session, error: authError } = requireSelfOrManagement(req, userId);
  if (authError) return authError;

  const db = await readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const expiresInSeconds =
    expiresInDays !== undefined ? Math.max(0, Number(expiresInDays)) * 60 * 60 * 24 : undefined;
  const { token, apiKeyId, iat, exp } = signApiKey({
    userId: user.UserID,
    userType: user.UserType,
    ...(expiresInSeconds !== undefined ? { expiresInSeconds } : {}),
  });

  const record = {
    ApiKeyID: apiKeyId,
    UserID: user.UserID,
    UserType: user.UserType,
    Label: (label || "").trim(),
    CreatedAt: iat,
    ExpiresAt: exp,
  };
  db.apiKeys = db.apiKeys || [];
  db.apiKeys.push(record);
  await writeDB(db, ["apiKeys"]);
  // The token itself is never logged (or stored anywhere) — only the
  // bookkeeping record, same as what's already shown in Management's
  // "issued keys" list.
  await logAudit({ actorUserId: session.userId, action: "create", entityType: "ApiKey", entityId: apiKeyId, summary: `Issued API key for ${user.UserID}${label ? ` ("${label}")` : ""}`, snapshot: record });

  return NextResponse.json({
    token,
    apiKeyId,
    userId: user.UserID,
    userType: user.UserType,
    createdAt: iat,
    expiresAt: exp,
  });
}

// Management-only: lists every issued key's bookkeeping record (never the
// token itself, which was only ever returned once at creation time).
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ apiKeys: db.apiKeys || [] });
}

// body: { apiKeyId }
// Removes the bookkeeping record only — does NOT cryptographically revoke
// an already-issued token before its own expiry (see lib/session.js's
// signApiKey comment). Self-service (a user deleting their own key) or
// Management deleting anyone's.
export async function DELETE(req) {
  const { apiKeyId } = await req.json();
  if (!apiKeyId) {
    return NextResponse.json({ error: "apiKeyId is required." }, { status: 400 });
  }

  const db = await readDB();
  const record = (db.apiKeys || []).find((k) => k.ApiKeyID === apiKeyId);
  if (!record) return NextResponse.json({ error: "API key not found." }, { status: 404 });

  const { session, error } = requireSelfOrManagement(req, record.UserID);
  if (error) return error;

  db.apiKeys = db.apiKeys.filter((k) => k.ApiKeyID !== apiKeyId);
  await deleteRecords(db, [{ collection: "apiKeys", ids: [apiKeyId] }]);
  await logAudit({ actorUserId: session.userId, action: "revoke", entityType: "ApiKey", entityId: apiKeyId, summary: `Revoked API key for ${record.UserID}`, snapshot: record });
  return NextResponse.json({ ok: true });
}
