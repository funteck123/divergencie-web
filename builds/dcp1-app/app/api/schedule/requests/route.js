import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

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

    item.Status = "Scheduled";

    // Every Trial is for a real Service, and approving one requires paying a
    // month in advance for that Service — this is a flat MonthlyCost charge,
    // not the attendance-prorated formula used for ongoing Student billing
    // (there's no attendance yet).
    const slot = db.scheduleItems.find((s) => s.ScheduleID === item.ScheduleItemID);
    const service = db.services.find((s) => s.ServiceID === item.ServiceID);
    const slotDate = slot ? new Date(slot.Date) : new Date();
    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: item.TrialAccID,
      ServiceID: item.ServiceID,
      Year: slotDate.getFullYear(),
      Month: slotDate.getMonth() + 1,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: service ? Number(service.MonthlyCost) || 0 : 0,
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
      Note: "One-month advance — Trial",
    };
    db.invoices.push(invoice);

    writeDB(db);
    return NextResponse.json({ trialItem: item, invoice });
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
