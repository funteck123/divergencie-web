import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { requireManagement, requireSession } from "@/lib/authz";
import { isEnrollmentActiveForMonth } from "@/lib/billing";
import { logAudit } from "@/lib/logging";

// A meaningful chunk of ScheduleItems (generated before per-Batch schedules
// existed) have no BatchID recorded at all, even though the Service they
// belong to now has real Batches and the Enrollment against it DOES carry a
// BatchID — under strict equality this silently broke roster/authorization
// lookups for exactly those legacy sessions (a Teacher/Student got "You're
// not enrolled" on their own real session). A slot with no BatchID matches
// any enrollment for that Service regardless of the enrollment's own Batch;
// a slot that DOES have a BatchID still requires an exact match.
function batchMatches(slotBatchId, enrollmentBatchId) {
  if (!slotBatchId) return true;
  return slotBatchId === enrollmentBatchId;
}

// GET /api/attendance                            — Management only, every record (admin Schedule tab)
// GET /api/attendance?scheduleItemId=SCH-xxxx     — that one session's roster + attendance, for
//   Management OR any Teacher/Student actively enrolled in that session's own Service+Batch (so the
//   Teacher/Student dashboards can show "who else is in this session, what's been logged so far"
//   without needing Management access). Roster is every actively-enrolled Teacher/Student for that
//   Service+Batch — not just people who already have an attendance record — so a not-yet-logged
//   person still shows up with a way to log them.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scheduleItemId = searchParams.get("scheduleItemId");

  if (!scheduleItemId) {
    const { error } = requireManagement(req);
    if (error) return error;
    const db = await readDB();
    return NextResponse.json({ attendanceItems: db.attendanceItems });
  }

  const { session, error } = requireSession(req);
  if (error) return error;

  const db = await readDB();
  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleItemId);
  if (!slot) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  const [y, m] = slot.Date.split("-").map(Number);
  let roster = db.enrollments
    .filter((e) => e.ServiceID === slot.ServiceID && batchMatches(slot.BatchID, e.BatchID) && isEnrollmentActiveForMonth(e, y, m))
    .map((e) => {
      const u = db.users.find((u) => u.UserID === e.UserID);
      return u ? { userId: u.UserID, name: u.Name, userType: u.UserType } : null;
    })
    .filter((r) => r && ["Teacher", "Student"].includes(r.userType));

  if (session.userType !== "Management" && !roster.some((r) => r.userId === session.userId)) {
    return NextResponse.json({ error: "You're not enrolled in this session." }, { status: 403 });
  }

  // TKT-0073: Management still sees the full roster (oversight), but a
  // Teacher/Student's own view of their own session shouldn't expose their
  // co-enrolled peers of the same type -- a Teacher only needs to see
  // themselves and the Students, a Student only themselves and the
  // Teacher(s). Self always sorts first.
  if (session.userType === "Teacher") {
    roster = roster.filter((r) => r.userType !== "Teacher" || r.userId === session.userId);
  } else if (session.userType === "Student") {
    roster = roster.filter((r) => r.userType !== "Student" || r.userId === session.userId);
  }
  roster.sort((a, b) => (a.userId === session.userId ? -1 : b.userId === session.userId ? 1 : 0));

  const attendanceItems = db.attendanceItems.filter((a) => a.ScheduleItemID === scheduleItemId);
  return NextResponse.json({ roster, attendanceItems });
}

// TKT-0037: attendance used to be one record per (session, subject) — a
// session's own participant logs their own row, full stop. Now more than
// one person's *perspective* on the same subject's attendance can coexist
// (a Student logs their own; the co-enrolled Teacher can also log a record
// about that same Student — and vice versa, a Student can log a record
// about the Teacher). Both stay forever as history; AcceptedForBilling
// marks which single one billing actually uses. See markAccepted below for
// how a new record affects existing ones for the same (session, subject).
function activeEnrollmentFor(db, userId, serviceId, batchId, dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return db.enrollments.find(
    (e) =>
      e.UserID === userId &&
      e.ServiceID === serviceId &&
      batchMatches(batchId, e.BatchID) &&
      isEnrollmentActiveForMonth(e, y, m)
  );
}

// Who may log a record about `subjectUserId` for this specific session,
// beyond logging their own (always allowed). Deliberately narrow, not the
// fully symmetric "anyone enrolled can mark anyone" — only a Teacher<->
// Student pair, both actively enrolled in the exact same Service+Batch as
// the session itself. Staff/Ambassador attendance stays self-only.
function canLogOnBehalfOf(db, callerId, subjectUserId, slot) {
  if (callerId === subjectUserId) return true;
  const caller = db.users.find((u) => u.UserID === callerId);
  const subject = db.users.find((u) => u.UserID === subjectUserId);
  if (!caller || !subject) return false;
  const validPair =
    (caller.UserType === "Teacher" && subject.UserType === "Student") ||
    (caller.UserType === "Student" && subject.UserType === "Teacher");
  if (!validPair) return false;
  const callerEnrolled = activeEnrollmentFor(db, callerId, slot.ServiceID, slot.BatchID, slot.Date);
  const subjectEnrolled = activeEnrollmentFor(db, subjectUserId, slot.ServiceID, slot.BatchID, slot.Date);
  return !!callerEnrolled && !!subjectEnrolled;
}

// A brand-new record's AcceptedForBilling, and which existing records (for
// the same session+subject) need to flip to false because of it:
//   - New record is the subject's own (self-authored): always accepted --
//     self regains priority even over an existing other-authored record
//     that was previously accepted by default (see next case).
//   - New record is authored by someone else, and no record exists yet for
//     this subject+session at all: accepted by default (this is what
//     saves the "student never logs -> $0 invoice" case, TKT-0035) --
//     stays accepted only until the subject's own record shows up.
//   - New record is authored by someone else, and a self-record already
//     exists: NOT accepted -- sits alongside as a flagged alternative,
//     surfaced to Management, who can flip acceptance explicitly.
function resolveAcceptance(existingForSubject, isSelf) {
  if (isSelf) return { accepted: true, demoteOthers: true };
  if (existingForSubject.length === 0) return { accepted: true, demoteOthers: false };
  const hasSelf = existingForSubject.some((r) => r.UserID === r.LoggedBy);
  return { accepted: !hasSelf, demoteOthers: false };
}

// body: { scheduleItemId, userId, status, loggedDuration }
// `userId` is the subject the record is about; the actual author is always
// the caller's own session (never client-supplied) -- LoggedBy previously
// (bug) always equaled the subject's id even when someone else logged it.
export async function POST(req) {
  const { scheduleItemId, userId, status, loggedDuration } = await req.json();
  const { session, error } = requireSession(req);
  if (error) return error;

  const db = await readDB();

  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleItemId);
  if (!slot) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  if (session.userType !== "Management" && !canLogOnBehalfOf(db, session.userId, userId, slot)) {
    return NextResponse.json(
      { error: "You can only log your own attendance, or (if a Teacher/Student pair co-enrolled in this session's Batch) each other's." },
      { status: 403 }
    );
  }

  const existingForSubject = db.attendanceItems.filter(
    (a) => a.ScheduleItemID === scheduleItemId && a.UserID === userId
  );
  const alreadyByThisAuthor = existingForSubject.find((a) => a.LoggedBy === session.userId);
  if (alreadyByThisAuthor) {
    return NextResponse.json({ error: "You've already logged attendance for this person for this session." }, { status: 400 });
  }

  const isSelf = session.userId === userId;
  const { accepted, demoteOthers } = resolveAcceptance(existingForSubject, isSelf);
  if (demoteOthers) {
    for (const other of existingForSubject) other.AcceptedForBilling = false;
  }

  const item = {
    AttendanceID: await nextId(db, "ATT"),
    ScheduleItemID: scheduleItemId,
    UserID: userId,
    Date: slot.Date,
    Status: status || "Present",
    ScheduledDuration: Number(slot.Duration) || 0,
    LoggedDuration: Number(loggedDuration ?? slot.Duration) || 0,
    LoggedBy: session.userId,
    LoggedAt: new Date().toISOString(),
    AcceptedForBilling: accepted,
  };
  db.attendanceItems.push(item);
  await writeDB(db, ["attendanceItems"]);
  return NextResponse.json({ attendanceItem: item });
}

// body: { attendanceId } -- Management-only: flips AcceptedForBilling to
// true on this record and false on every other record for the same
// (ScheduleItemID, UserID) pair. Neither record is ever deleted -- both
// remain as permanent history; this only changes which one billing reads.
//
// Also stamps ResolvedBy/ResolvedAt on the now-accepted record -- this is
// what actually lifts the Send-block in app/api/invoices + app/api/paychecks
// (see computeHoursAndAmount's hasUnresolvedAttendance in lib/billing.js).
// Two disagreeing records existing is not itself what blocks Sending --
// an unreviewed disagreement is (e.g. a self-record auto-accepted on
// creation over an already-conflicting other-authored one, with nobody
// having looked at it yet). Once Management explicitly calls this route,
// the disagreement is a reviewed, deliberate choice, not an open question
// -- both records keep differing forever as history, but Sending unblocks
// immediately without requiring the values to actually match.
// TKT-0095: no attendance record could ever be edited after submission --
// not even by Management, and not even to fix an honest typo (wrong status,
// wrong hours). The original author still can't touch their own record
// (both perspectives staying as permanent, unedited history is the whole
// point of the two-record design, see resolveAcceptance above) -- but
// Management now can, directly correcting status/loggedDuration on any
// record. Editing a record also accepts it for billing (same effect as the
// plain "Mark correct" call this endpoint already made, just with real
// value changes this time), since Management editing a record is by
// definition the trusted, reviewed value now.
// body: { attendanceId, status?, loggedDuration? }
export async function PATCH(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { attendanceId, status, loggedDuration } = await req.json();
  if (!attendanceId) return NextResponse.json({ error: "attendanceId is required." }, { status: 400 });

  const db = await readDB();
  const record = db.attendanceItems.find((a) => a.AttendanceID === attendanceId);
  if (!record) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });

  if (status !== undefined) record.Status = status;
  if (loggedDuration !== undefined) record.LoggedDuration = Number(loggedDuration) || 0;

  for (const a of db.attendanceItems) {
    if (a.ScheduleItemID === record.ScheduleItemID && a.UserID === record.UserID) {
      a.AcceptedForBilling = a.AttendanceID === attendanceId;
    }
  }
  record.ResolvedBy = session.userId;
  record.ResolvedAt = new Date().toISOString();
  await writeDB(db, ["attendanceItems"]);
  return NextResponse.json({ attendanceItem: record });
}

// TKT-0048: no delete path existed for a single AttendanceItem before
// this. A different situation from PATCH above's "both records stay as
// permanent history" (that's about resolving a genuine billing
// disagreement between two real logs) — this is for a record left
// dangling after its own ScheduleItem was removed (e.g. legacy/orphan
// cleanup), where there's no session left for it to be history of.
// body: { attendanceId }
export async function DELETE(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { attendanceId } = await req.json();
  if (!attendanceId) return NextResponse.json({ error: "attendanceId is required." }, { status: 400 });

  const db = await readDB();
  const index = db.attendanceItems.findIndex((a) => a.AttendanceID === attendanceId);
  if (index === -1) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });

  const [deleted] = db.attendanceItems.splice(index, 1);
  await deleteRecords(db, [{ collection: "attendanceItems", ids: [attendanceId] }]);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "AttendanceItem", entityId: attendanceId, summary: `Deleted attendance record ${attendanceId}`, snapshot: deleted });

  return NextResponse.json({ ok: true });
}
