import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

// Pending Trial/Interview requests, joined with slot + requester name, for
// Management to approve or reject.
export async function GET() {
  const db = readDB();

  function nameOf(userId) {
    return db.users.find((u) => u.UserID === userId)?.Name || userId;
  }
  function slotOf(scheduleId) {
    return db.scheduleItems.find((s) => s.ScheduleID === scheduleId) || null;
  }

  const pendingTrials = db.trialItems
    .filter((t) => t.Status === "Pending")
    .map((t) => ({ ...t, RequesterName: nameOf(t.TrialAccID), Slot: slotOf(t.ScheduleItemID) }));

  const pendingInterviews = db.interviewItems
    .filter((i) => i.Status === "Pending")
    .map((i) => ({ ...i, RequesterName: nameOf(i.InterviewAccID), Slot: slotOf(i.ScheduleItemID) }));

  return NextResponse.json({ pendingTrials, pendingInterviews });
}

// body: { type: "Trial" | "Interview", id, action: "approve" | "reject" }
export async function PATCH(req) {
  const { type, id, action } = await req.json();
  if (!["Trial", "Interview"].includes(type) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "type must be Trial/Interview, action approve/reject." }, { status: 400 });
  }

  const db = readDB();

  if (type === "Trial") {
    const item = db.trialItems.find((t) => t.TrialID === id);
    if (!item) return NextResponse.json({ error: "Trial request not found." }, { status: 404 });
    if (item.Status !== "Pending") {
      return NextResponse.json({ error: `Request already ${item.Status}.` }, { status: 400 });
    }

    if (action === "reject") {
      item.Status = "Rejected";
      writeDB(db);
      return NextResponse.json({ trialItem: item });
    }

    // Approving a Trial slot only schedules the session — no billing happens
    // here. A Trial exists to decide whether to add the Service to the
    // Student account; billing only starts if/when Management does that via
    // POST /api/trial-enroll, after feedback comes in.
    item.Status = "Scheduled";
    writeDB(db);
    return NextResponse.json({ trialItem: item });
  }

  const item = db.interviewItems.find((i) => i.InterviewID === id);
  if (!item) return NextResponse.json({ error: "Interview request not found." }, { status: 404 });
  if (item.Status !== "Pending") {
    return NextResponse.json({ error: `Request already ${item.Status}.` }, { status: 400 });
  }

  item.Status = action === "approve" ? "Scheduled" : "Rejected";
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}
