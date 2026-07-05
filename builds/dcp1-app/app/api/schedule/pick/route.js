import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

// body: { scheduleId, userId, type: "Trial" | "Interview" }
export async function POST(req) {
  const { scheduleId, userId, type } = await req.json();
  const db = readDB();

  const slot = db.scheduleItems.find((s) => s.ScheduleID === scheduleId);
  if (!slot) return NextResponse.json({ error: "Slot not found." }, { status: 404 });

  // First-come-first-served: reject if someone already booked this slot.
  const alreadyTaken =
    db.trialItems.some((t) => t.ScheduleItemID === scheduleId) ||
    db.interviewItems.some((i) => i.ScheduleItemID === scheduleId);
  if (alreadyTaken) {
    return NextResponse.json({ error: "This slot was just taken by someone else." }, { status: 409 });
  }

  if (type === "Trial") {
    const item = {
      TrialID: nextId(db, "TRI"),
      TrialAccID: userId,
      ScheduleItemID: scheduleId,
      ServiceID: slot.ServiceID,
      Feedback: "",
      Status: "Scheduled",
    };
    db.trialItems.push(item);

    // Every Trial is for a real Service, and booking one requires paying a
    // month in advance for that Service — this is a flat MonthlyCost charge,
    // not the attendance-prorated formula used for ongoing Student billing
    // (there's no attendance yet).
    const service = db.services.find((s) => s.ServiceID === slot.ServiceID);
    const slotDate = new Date(slot.Date);
    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: userId,
      ServiceID: slot.ServiceID,
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

  if (type === "Interview") {
    const item = {
      InterviewID: nextId(db, "IVW"),
      InterviewAccID: userId,
      ScheduleItemID: scheduleId,
      ServiceID: slot.ServiceID,
      TaskSubmissionLink: "",
      Status: "Scheduled",
    };
    db.interviewItems.push(item);
    writeDB(db);
    return NextResponse.json({ interviewItem: item });
  }

  return NextResponse.json({ error: "type must be Trial or Interview." }, { status: 400 });
}
