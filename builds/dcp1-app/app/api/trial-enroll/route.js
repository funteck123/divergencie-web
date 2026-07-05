import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

// Management's action after reading a Trial's Feedback and deciding it went
// well: add the trialed Service to the Student account and bill one month
// in advance, starting from the current month (not whatever month the trial
// session itself fell on). This is the only outcome a Trial produces —
// account creation (Convert) is a separate, unrelated Management decision
// that must already have happened.
// body: { trialId }
export async function POST(req) {
  const { trialId } = await req.json();
  const db = readDB();

  const trial = db.trialItems.find((t) => t.TrialID === trialId);
  if (!trial) return NextResponse.json({ error: "Trial not found." }, { status: 404 });
  if (trial.Status !== "FeedbackSubmitted") {
    return NextResponse.json({ error: "Feedback must be submitted before adding the Service." }, { status: 400 });
  }
  if (trial.ServiceAdded) {
    return NextResponse.json({ error: "Service already added for this Trial." }, { status: 400 });
  }

  const trialAcc = db.users.find((u) => u.UserID === trial.TrialAccID);
  if (!trialAcc || trialAcc.Status !== "Converted" || !trialAcc.ConvertedToUserID) {
    return NextResponse.json(
      { error: "Convert this account to Student first, then add the Service." },
      { status: 400 }
    );
  }
  const studentId = trialAcc.ConvertedToUserID;

  const service = db.services.find((s) => s.ServiceID === trial.ServiceID);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  let enrollment = db.enrollments.find((e) => e.UserID === studentId && e.ServiceID === trial.ServiceID);
  if (!enrollment) {
    enrollment = { EnrolmentID: nextId(db, "ENR"), UserID: studentId, ServiceID: trial.ServiceID };
    db.enrollments.push(enrollment);
  }

  const now = new Date();
  const invoice = {
    InvoiceID: nextId(db, "INV"),
    StudentID: studentId,
    ServiceID: trial.ServiceID,
    Year: now.getFullYear(),
    Month: now.getMonth() + 1,
    ScheduledHours: null,
    AttendedHours: null,
    Amount: Number(service.MonthlyCost) || 0,
    INRAmount: 0,
    INRDue: 0,
    Status: "Draft",
    Note: "One-month advance — new enrollment from Trial",
  };
  db.invoices.push(invoice);

  trial.ServiceAdded = true;
  writeDB(db);

  return NextResponse.json({ enrollment, invoice });
}
