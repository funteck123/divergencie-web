import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Every helper returns { session, error }: `error` is a ready-to-return
// NextResponse (401/403) when the check fails, `session` is null in that
// case — callers just do `const { session, error } = requireX(req); if
// (error) return error;`. Management always passes every check (it's the
// staff role that manages every other account).

export function requireSession(req) {
  const session = getSession(req);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  return { session, error: null };
}

export function requireManagement(req) {
  const { session, error } = requireSession(req);
  if (error) return { session: null, error };
  if (session.userType !== "Management") {
    return { session: null, error: NextResponse.json({ error: "Management only." }, { status: 403 }) };
  }
  return { session, error: null };
}

// The caller must be Management, or must BE the account identified by
// targetUserId (self-service: viewing/editing your own record).
export function requireSelfOrManagement(req, targetUserId) {
  const { session, error } = requireSession(req);
  if (error) return { session: null, error };
  if (session.userType !== "Management" && session.userId !== targetUserId) {
    return { session: null, error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { session, error: null };
}

// Same as requireSelfOrManagement, plus: a Parent whose StudentIDs includes
// targetUserId (a Parent viewing their own child's invoice/schedule/etc).
export function requireSelfOrParentOrManagement(req, db, targetUserId) {
  const { session, error } = requireSession(req);
  if (error) return { session: null, error };
  if (session.userType === "Management" || session.userId === targetUserId) {
    return { session, error: null };
  }
  if (session.userType === "Parent") {
    const parent = db.users.find((u) => u.UserID === session.userId);
    if (parent?.StudentIDs?.includes(targetUserId)) {
      return { session, error: null };
    }
  }
  return { session: null, error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
}
