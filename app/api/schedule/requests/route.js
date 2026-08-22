import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { BOOKING_TYPES, isSlotBooked } from "@/lib/scheduleGen";
import { requireManagement } from "@/lib/authz";

// Pending Trial/Interview requests, joined with slot + requester name, for
// Management to approve or reject.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();

  function nameOf(userId) {
    return db.users.find((u) => u.UserID === userId)?.Name || userId;
  }
  // The interviewItem itself doesn't record which of the three Interview
  // tracks it's for, that lives on the requester's own UserType
  // (TeacherInterviewAcc/StaffInterviewAcc/AmbassadorInterviewAcc). Expose it
  // as RequesterType so Management's approve/reject buttons can send the
  // right booking type back to PATCH.
  function typeOf(userId) {
    return db.users.find((u) => u.UserID === userId)?.UserType || null;
  }
  function slotOf(scheduleId) {
    return db.scheduleItems.find((s) => s.ScheduleID === scheduleId) || null;
  }

  const pendingTrials = db.trialItems
    .filter((t) => t.Status === "Pending")
    .map((t) => ({ ...t, RequesterName: nameOf(t.TrialAccID), Slot: slotOf(t.ScheduleItemID) }));

  const pendingInterviews = db.interviewItems
    .filter((i) => i.Status === "Pending")
    .map((i) => ({
      ...i,
      RequesterName: nameOf(i.InterviewAccID),
      RequesterType: typeOf(i.InterviewAccID),
      Slot: slotOf(i.ScheduleItemID),
    }));

  return NextResponse.json({ pendingTrials, pendingInterviews });
}

// body: { type: "Trial"|"TeacherInterview"|"StaffInterview"|"AmbassadorInterview", id, action: "approve" | "reject", scheduleId? }
// scheduleId is required when approving a Trial or Interview request
// (TKT-0080/TKT-0021: the requester never picked a slot themselves, this
// is where Management assigns one, either an existing open-pool slot or
// one freshly created via POST /api/schedule just before this call).
// Ignored for reject (no slot needed).
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { type, id, action, scheduleId } = await req.json();
  if (!BOOKING_TYPES.includes(type) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: `type must be one of ${BOOKING_TYPES.join("/")}, action approve/reject.` }, { status: 400 });
  }

  const db = await readDB();

  if (type === "Trial") {
    const item = db.trialItems.find((t) => t.TrialID === id);
    if (!item) return NextResponse.json({ error: "Trial request not found." }, { status: 404 });
    if (item.Status !== "Pending") {
      return NextResponse.json({ error: `Request already ${item.Status}.` }, { status: 400 });
    }

    if (action === "reject") {
      item.Status = "Rejected";
      await writeDB(db, ["trialItems"]);
      return NextResponse.json({ trialItem: item });
    }

    // TKT-0080: the requester never picked a slot themselves anymore,
    // Management assigns one here, same as Interview below. Approving only
    // schedules the session, no billing happens here. A Trial exists to
    // decide whether to add the Service to the Student account; billing
    // only starts if/when Management does that via POST /api/trial-enroll,
    // after feedback comes in.
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required to approve a Trial request." }, { status: 400 });
    }
    const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
    if (!slot) return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    if (slot.ServiceID !== item.ServiceID) {
      return NextResponse.json({ error: "That slot isn't for the same Service this request is for." }, { status: 400 });
    }
    if (isSlotBooked(db, scheduleId)) {
      return NextResponse.json({ error: "That slot is already booked." }, { status: 409 });
    }

    item.ScheduleItemID = scheduleId;
    item.Status = "Scheduled";
    await writeDB(db, ["trialItems"]);
    return NextResponse.json({ trialItem: item });
  }

  const item = db.interviewItems.find((i) => i.InterviewID === id);
  if (!item) return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
  if (item.Status !== "Pending") {
    return NextResponse.json({ error: `Request already ${item.Status}.` }, { status: 400 });
  }

  if (action === "reject") {
    item.Status = "Rejected";
    await writeDB(db, ["interviewItems"]);
    return NextResponse.json({ interviewItem: item });
  }

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId is required to approve an Interview request." }, { status: 400 });
  }
  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
  if (!slot) return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  if (slot.ServiceID !== item.ServiceID) {
    return NextResponse.json({ error: "That slot isn't for the same Service this request is for." }, { status: 400 });
  }
  if (isSlotBooked(db, scheduleId)) {
    return NextResponse.json({ error: "That slot is already booked." }, { status: 409 });
  }

  item.ScheduleItemID = scheduleId;
  item.Status = "Scheduled";
  await writeDB(db, ["interviewItems"]);
  return NextResponse.json({ interviewItem: item });
}
