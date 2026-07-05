import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { serviceGroupOf, requiredGroupForBookingType, groupMatches } from "@/lib/scheduleGen";

// body: { scheduleId, userId, type: "Trial" | "Interview" }
// Multiple accounts may request the same slot ("double booking") — Management
// approves one via PATCH /api/schedule/requests, which is what actually locks
// the slot (see isSlotBooked). This route only records a Pending request.
export async function POST(req) {
  const { scheduleId, userId, type } = await req.json();
  const db = readDB();

  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
  if (!slot) return NextResponse.json({ error: "Slot not found." }, { status: 404 });

  if (!["Trial", "Interview"].includes(type)) {
    return NextResponse.json({ error: "type must be Trial or Interview." }, { status: 400 });
  }
  const requiredGroup = requiredGroupForBookingType(type);
  if (!groupMatches(serviceGroupOf(db, slot.ServiceID), requiredGroup)) {
    return NextResponse.json(
      { error: `${type} accounts can only book ${requiredGroup} (or Both) group services.` },
      { status: 400 }
    );
  }

  if (type === "Trial") {
    const alreadyRequested = db.trialItems.some(
      (t) => t.ScheduleItemID === scheduleId && t.TrialAccID === userId && t.Status !== "Rejected"
    );
    if (alreadyRequested) {
      return NextResponse.json({ error: "You already requested this slot." }, { status: 409 });
    }
    const item = {
      TrialID: nextId(db, "TRI"),
      TrialAccID: userId,
      ScheduleItemID: scheduleId,
      ServiceID: slot.ServiceID,
      Feedback: "",
      Status: "Pending",
      ServiceAdded: false,
    };
    db.trialItems.push(item);
    writeDB(db);
    return NextResponse.json({ trialItem: item });
  }

  const alreadyRequested = db.interviewItems.some(
    (i) => i.ScheduleItemID === scheduleId && i.InterviewAccID === userId && i.Status !== "Rejected"
  );
  if (alreadyRequested) {
    return NextResponse.json({ error: "You already requested this slot." }, { status: 409 });
  }
  const item = {
    InterviewID: nextId(db, "IVW"),
    InterviewAccID: userId,
    ScheduleItemID: scheduleId,
    ServiceID: slot.ServiceID,
    TaskSubmissionLink: "",
    TaskFeedback: "",
    Status: "Pending",
  };
  db.interviewItems.push(item);
  writeDB(db);
  return NextResponse.json({ interviewItem: item });
}
