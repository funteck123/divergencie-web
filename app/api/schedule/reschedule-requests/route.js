import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireSession, requireManagement } from "@/lib/authz";

// Self-service reschedule proposals for an existing ScheduleItem — separate
// from Management's own direct reschedule (PATCH /api/schedule, applies
// immediately). A request here only takes effect once Management approves
// it (see PATCH below), at which point it sets the exact same
// RescheduledDate/RescheduledTime fields Management's direct path sets —
// same end state, different approval requirement.

// True if userId is tied to this ScheduleItem's Service — enrolled directly
// (covers Student/Teacher/Staff/Ambassador, since enrollments link any
// UserID to a ServiceID the same way regardless of role), or is a Parent
// of an enrolled Student. Keeps reschedule requests scoped to people
// actually in the class, not any authenticated account.
function isTiedToSlot(db, userId, slot) {
  const matchesSlot = (e) => e.ServiceID === slot.ServiceID && (!slot.BatchID || e.BatchID === slot.BatchID);
  if (db.enrollments.some((e) => e.UserID === userId && matchesSlot(e))) return true;
  const user = db.users.find((u) => u.UserID === userId);
  if (user?.UserType === "Parent" && Array.isArray(user.StudentIDs)) {
    return user.StudentIDs.some((sid) => db.enrollments.some((e) => e.UserID === sid && matchesSlot(e)));
  }
  return false;
}

// Management-only: pending requests joined with their ScheduleItem + requester name.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  function nameOf(userId) {
    return db.users.find((u) => u.UserID === userId)?.Name || userId;
  }
  const pending = (db.rescheduleRequests || [])
    .filter((r) => r.Status === "Pending")
    .map((r) => ({
      ...r,
      RequesterName: nameOf(r.RequestedBy),
      Slot: db.scheduleItems.find((s) => s.ScheduleID === r.ScheduleItemID) || null,
    }));
  return NextResponse.json({ rescheduleRequests: pending });
}

// body: { scheduleId, userId, requestedDate, requestedTime }
export async function POST(req) {
  const { scheduleId, userId, requestedDate, requestedTime } = await req.json();
  const { error } = requireSession(req);
  if (error) return error;

  if (!scheduleId || !userId || !requestedDate || !requestedTime) {
    return NextResponse.json({ error: "scheduleId, userId, requestedDate, and requestedTime are required." }, { status: 400 });
  }

  const db = await readDB();
  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
  if (!slot) return NextResponse.json({ error: "Schedule item not found." }, { status: 404 });

  if (!isTiedToSlot(db, userId, slot)) {
    return NextResponse.json({ error: "You're not enrolled in this class." }, { status: 403 });
  }

  const alreadyPending = (db.rescheduleRequests || []).some((r) => r.ScheduleItemID === scheduleId && r.Status === "Pending");
  if (alreadyPending) {
    return NextResponse.json({ error: "A reschedule request is already pending for this class." }, { status: 409 });
  }

  const request = {
    RescheduleRequestID: nextId(db, "RSR"),
    ScheduleItemID: scheduleId,
    RequestedBy: userId,
    RequestedDate: requestedDate,
    RequestedTime: requestedTime,
    Status: "Pending",
  };
  db.rescheduleRequests = db.rescheduleRequests || [];
  db.rescheduleRequests.push(request);
  await writeDB(db);

  return NextResponse.json({ rescheduleRequest: request });
}

// body: { requestId, action: "approve" | "reject" }
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { requestId, action } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject." }, { status: 400 });
  }

  const db = await readDB();
  const request = (db.rescheduleRequests || []).find((r) => r.RescheduleRequestID === requestId);
  if (!request) return NextResponse.json({ error: "Reschedule request not found." }, { status: 404 });
  if (request.Status !== "Pending") {
    return NextResponse.json({ error: `Request already ${request.Status}.` }, { status: 400 });
  }

  if (action === "reject") {
    request.Status = "Rejected";
    await writeDB(db);
    return NextResponse.json({ rescheduleRequest: request });
  }

  const slot = db.scheduleItems.find((s) => s.ScheduleID === request.ScheduleItemID);
  if (!slot) return NextResponse.json({ error: "Schedule item no longer exists." }, { status: 404 });

  slot.RescheduledDate = request.RequestedDate;
  slot.RescheduledTime = request.RequestedTime;
  request.Status = "Approved";
  await writeDB(db);

  return NextResponse.json({ rescheduleRequest: request, scheduleItem: slot });
}
