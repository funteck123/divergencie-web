import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { batchesOf, ratesOf, rateById } from "@/lib/billing";

// Management's action after reading a Trial's Feedback and deciding it went
// well: add the trialed Service to the Student account and bill one month
// in advance, starting from the current month (not whatever month the trial
// session itself fell on). This is the only outcome a Trial produces —
// account creation (Convert) is a separate, unrelated Management decision
// that must already have happened.
// body: { trialId }
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { trialId } = await req.json();
  const db = await readDB();

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

  // Defaults to the Service's first Batch (Trial-eligible services are
  // expected to be single-batch) — Management can move the enrollment to a
  // different Batch/rate afterward (Enrollments tab) if needed.
  const defaultBatch = batchesOf(service)[0];
  let enrollment = db.enrollments.find(
    (e) => e.UserID === studentId && e.ServiceID === trial.ServiceID && e.BatchID === defaultBatch?.BatchID
  );
  if (!enrollment) {
    const defaultRate = ratesOf(service, defaultBatch?.BatchID)[0];
    enrollment = {
      EnrolmentID: await nextId(db, "ENR"),
      UserID: studentId,
      ServiceID: trial.ServiceID,
      BatchID: defaultBatch?.BatchID || "",
      RateID: defaultRate.RateID,
      Currency: defaultRate.Currency,
    };
    db.enrollments.push(enrollment);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Don't double-bill if an invoice for this Student/Service/Batch/month
  // already exists (e.g. bulk "Generate Drafts" already ran for the current
  // month).
  let invoice = db.invoices.find(
    (i) =>
      i.StudentID === studentId &&
      i.ServiceID === trial.ServiceID &&
      i.BatchID === enrollment.BatchID &&
      i.Year === year &&
      i.Month === month
  );
  if (!invoice) {
    invoice = {
      InvoiceID: await nextId(db, "INV"),
      StudentID: studentId,
      ServiceID: trial.ServiceID,
      BatchID: enrollment.BatchID,
      Year: year,
      Month: month,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: rateById(service, enrollment.BatchID, enrollment.RateID).Rate,
      Currency: enrollment.Currency,
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
      Note: "One-month advance — new enrollment from Trial",
    };
    db.invoices.push(invoice);
  }

  trial.ServiceAdded = true;
  await writeDB(db, ["enrollments", "invoices", "trialItems"]);

  return NextResponse.json({ enrollment, invoice });
}
