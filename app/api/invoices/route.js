import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf, rateById, isEnrollmentActiveForMonth } from "@/lib/billing";
import { getRateToINR } from "@/lib/fxRates";
import { requireManagement, requireSelfOrParentOrManagement } from "@/lib/authz";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ invoices: db.invoices });
}

// action "generate": drafts one Invoice per Student enrollment for {year, month}
// (skips ones that already exist for that user+service+year+month)
// action "manual": drafts a single Invoice for an arbitrary studentId/serviceId/
// year/month/amount — for one-off cases the bulk generator doesn't cover.
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const body = await req.json();
  const { action } = body;

  if (action === "manual") {
    const { studentId, serviceId, year, month, amount } = body;
    if (!studentId || !serviceId || !year || !month || amount === undefined) {
      return NextResponse.json(
        { error: "studentId, serviceId, year, month, and amount are required." },
        { status: 400 }
      );
    }
    const db = await readDB();
    const y = Number(year);
    const m = Number(month);
    const service = db.services.find((s) => s.ServiceID === serviceId);
    // A student may hold more than one enrollment in the same Service now
    // (different Batches), so this resolves to whichever enrollment is
    // passed/found first — fine for the manual one-off path, which a human
    // is filling in directly.
    const enrollment = db.enrollments.find((e) => e.UserID === studentId && e.ServiceID === serviceId);
    const batchId = enrollment?.BatchID;

    const dup = db.invoices.find(
      (i) => i.StudentID === studentId && i.ServiceID === serviceId && i.BatchID === batchId && i.Year === y && i.Month === m
    );
    if (dup) {
      return NextResponse.json(
        { error: `An invoice already exists for this Student/Service in ${m}/${y}.` },
        { status: 400 }
      );
    }

    if (enrollment && !isEnrollmentActiveForMonth(enrollment, y, m)) {
      return NextResponse.json(
        { error: `This enrollment is not active in ${m}/${y} (Start/End Date range).` },
        { status: 400 }
      );
    }
    const matchedRate = service ? rateById(service, batchId, enrollment?.RateID) : null;
    if (matchedRate?.BillingType === "OneOff") {
      const already = db.invoices.some((i) => i.StudentID === studentId && i.ServiceID === serviceId && i.BatchID === batchId);
      if (already) {
        return NextResponse.json(
          { error: "This is a One-off rate — an invoice for this Student/Service already exists and none further will be created." },
          { status: 400 }
        );
      }
    }

    const currency = enrollment?.Currency || (service ? ratesOf(service, batchId)[0].Currency : "INR");
    const invoiceAmount = Number(amount) || 0;
    // Auto-filled using the currency's rate as of the 1st of this invoice's
    // own month (not "today") — see lib/fxRates.js. Left at 0, same as
    // before this existed, when there's no rate to auto-fill (unsupported
    // currency, or the FX source is unreachable); Management can always
    // override it either way.
    const fxRate = await getRateToINR(db, currency, y, m);
    const invoiceINRAmount = fxRate != null ? Math.round(invoiceAmount * fxRate * 100) / 100 : 0;
    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: studentId,
      ServiceID: serviceId,
      BatchID: batchId || "",
      Year: y,
      Month: m,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: invoiceAmount,
      Currency: currency,
      INRAmount: invoiceINRAmount,
      // A freshly created invoice is fully unpaid — defaults to the full
      // amount outstanding, not 0 (0 reads as "nothing owed", which is
      // wrong for a brand-new Draft). Management can adjust as payments
      // come in.
      INRDue: invoiceINRAmount,
      Status: "Draft",
    };
    db.invoices.push(invoice);
    await writeDB(db);
    return NextResponse.json({ invoice });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const db = await readDB();

  const studentIds = new Set(db.users.filter((u) => u.UserType === "Student").map((u) => u.UserID));
  const studentEnrollments = db.enrollments.filter((e) => studentIds.has(e.UserID));

  const created = [];
  for (const enr of studentEnrollments) {
    if (!isEnrollmentActiveForMonth(enr, year, month)) continue;

    const service = db.services.find((s) => s.ServiceID === enr.ServiceID);
    const matchedRate = service ? rateById(service, enr.BatchID, enr.RateID) : null;
    const isOneOff = matchedRate?.BillingType === "OneOff";

    // OneOff: exactly one invoice ever for this Student/Service/Batch,
    // regardless of month. Monthly/Hourly: the usual one-per-month dedup.
    // Both scoped by BatchID too, so a student holding two enrollments in
    // the same Service (different Batches) gets one invoice per Batch.
    const exists = isOneOff
      ? db.invoices.some((i) => i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.BatchID === enr.BatchID)
      : db.invoices.some(
          (i) => i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.BatchID === enr.BatchID && i.Year === year && i.Month === month
        );
    if (exists) continue;

    const { scheduledHours, attendedHours, amount, currency, billingType } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      batchId: enr.BatchID,
      year,
      month,
    });
    const fxRate = await getRateToINR(db, currency, year, month);
    const invoiceINRAmount = fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0;
    // A OneOff-billed service (Books, Counselling, Admissions, ...) has no
    // recurring schedule by design — zero scheduledHours there is normal,
    // not a problem, so it's not worth flagging. For Monthly/Hourly billing
    // though, zero scheduledHours means computeHoursAndAmount necessarily
    // produced a $0 amount (see lib/billing.js) with no schedule to justify
    // it — that's the case Management actually needs to catch and fix
    // (missing Occurrences on the Batch, or a billing type left on the
    // wrong default).
    const zeroScheduleWarning = scheduledHours <= 0 && billingType !== "OneOff";

    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: enr.UserID,
      ServiceID: enr.ServiceID,
      BatchID: enr.BatchID || "",
      Year: year,
      Month: month,
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      INRAmount: invoiceINRAmount,
      // Same as the manual-create path above: a fresh Draft invoice is
      // fully unpaid, so it defaults to the full amount due, not 0.
      INRDue: invoiceINRAmount,
      Status: "Draft",
      ...(zeroScheduleWarning
        ? { Note: "$0 — no scheduled hours found for this Service/month. Check the Batch's schedule or its billing type." }
        : {}),
    };
    db.invoices.push(invoice);
    created.push(invoice);
  }
  await writeDB(db);
  return NextResponse.json({ created });
}

// body: { invoiceId, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, studentPaidFlag }
// The Student (or their Parent) may only ever toggle studentPaidFlag on
// their own invoice — every other field is a Management-only billing edit.
export async function PATCH(req) {
  const { invoiceId, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, studentPaidFlag } = await req.json();
  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const managementOnly = [scheduledHours, attendedHours, amount, inrAmount, inrDue, status].some((v) => v !== undefined);
  const { error } = managementOnly
    ? requireManagement(req)
    : requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  if (scheduledHours !== undefined) invoice.ScheduledHours = Number(scheduledHours);
  if (attendedHours !== undefined) invoice.AttendedHours = Number(attendedHours);
  if (amount !== undefined) invoice.Amount = Number(amount);
  if (inrAmount !== undefined) invoice.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
  if (status !== undefined) invoice.Status = status;
  if (studentPaidFlag !== undefined) invoice.StudentPaidFlag = Boolean(studentPaidFlag);

  await writeDB(db);
  return NextResponse.json({ invoice });
}

// body: { invoiceId }
export async function DELETE(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { invoiceId } = await req.json();
  const db = await readDB();
  const index = db.invoices.findIndex((i) => i.InvoiceID === invoiceId);
  if (index === -1) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  db.invoices.splice(index, 1);
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
