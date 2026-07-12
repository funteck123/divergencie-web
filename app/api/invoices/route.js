import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf } from "@/lib/billing";
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
    const dup = db.invoices.find(
      (i) => i.StudentID === studentId && i.ServiceID === serviceId && i.Year === y && i.Month === m
    );
    if (dup) {
      return NextResponse.json(
        { error: `An invoice already exists for this Student/Service in ${m}/${y}.` },
        { status: 400 }
      );
    }
    const service = db.services.find((s) => s.ServiceID === serviceId);
    const enrollment = db.enrollments.find((e) => e.UserID === studentId && e.ServiceID === serviceId);
    const currency = enrollment?.Currency || (service ? ratesOf(service)[0].Currency : "INR");
    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: studentId,
      ServiceID: serviceId,
      Year: y,
      Month: m,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: Number(amount) || 0,
      Currency: currency,
      INRAmount: 0,
      INRDue: 0,
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
    const exists = db.invoices.find(
      (i) => i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.Year === year && i.Month === month
    );
    if (exists) continue;

    const { scheduledHours, attendedHours, amount, currency } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      year,
      month,
    });

    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: enr.UserID,
      ServiceID: enr.ServiceID,
      Year: year,
      Month: month,
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
      // Flags a $0 draft that's $0 because no schedule data exists for this
      // Service/month (missing occurrences), not because the service is
      // legitimately free — Management should check for a schedule gap.
      ...(scheduledHours <= 0 ? { Note: "No scheduled hours found for this Service/month." } : {}),
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
