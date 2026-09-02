import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { getSession, sessionCookieFor, impersonationCookieFor } from "@/lib/session";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// "Log in as" -- lets Management view/use an account exactly as that user
// would, without ever learning or resetting their password. Built to
// replace a proposed change to make stored passwords viewable again, which
// would have reopened the plaintext-password-leak incident lib/passwords.js's
// one-way hashing exists to prevent (any Management-authenticated caller
// getting back every real account's actual password). This way nothing
// about the account's real credential is ever touched or exposed.
//
// body: { userId: <target account to log in as> }
export async function POST(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const db = await readDB();
  const target = db.users.find((u) => u.UserID === userId);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Never let Management impersonate another Management account -- this
  // isn't a "view what a student sees" tool, it's a privilege-escalation
  // vector if it's ever allowed to target a fellow admin. requireManagement
  // above already blocks starting a SECOND impersonation from inside an
  // active one for free (an impersonated session's own userType is the
  // target's, not "Management", so it fails that check before reaching here).
  if (target.UserType === "Management") {
    return NextResponse.json({ error: "Cannot impersonate a Management account." }, { status: 403 });
  }

  const { Notes: _notes, ...targetSafe } = target;
  const res = NextResponse.json({ user: targetSafe, impersonatorUserId: session.userId });
  const cookie = impersonationCookieFor(target, session.userId);
  res.cookies.set(cookie.name, cookie.value, cookie.options);

  await logAudit({
    actorUserId: session.userId,
    action: "impersonate",
    entityType: "User",
    entityId: target.UserID,
    summary: `Logged in as ${target.UserType} "${target.Name}"`,
  });

  return res;
}

// Ends an active impersonation and hands the session back to the real
// Management account that started it -- reads impersonatorUserId off the
// CURRENT (impersonated) session cookie rather than trusting a client-sent
// value, so a target user themselves can't forge a "stop" call into
// escalating to someone else's account.
export async function DELETE(req) {
  const session = getSession(req);
  if (!session?.impersonatorUserId) {
    return NextResponse.json({ error: "Not currently impersonating." }, { status: 400 });
  }

  const db = await readDB();
  const actor = db.users.find((u) => u.UserID === session.impersonatorUserId);
  if (!actor) return NextResponse.json({ error: "Original account not found." }, { status: 404 });

  const { Notes: _notes, ...actorSafe } = actor;
  const res = NextResponse.json({ user: actorSafe });
  const cookie = sessionCookieFor(actor);
  res.cookies.set(cookie.name, cookie.value, cookie.options);

  await logAudit({
    actorUserId: actor.UserID,
    action: "stop-impersonate",
    entityType: "User",
    entityId: session.userId,
    summary: `Stopped impersonating ${session.userType} account ${session.userId}`,
  });

  return res;
}
