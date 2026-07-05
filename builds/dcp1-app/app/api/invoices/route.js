import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount } from "@/lib/billing";

export async function GET() {
  const db = readDB();
  return NextResponse.json({ invoices: db.invoices });
}

// action "generate": drafts one Invoice per Student enrollment for {year, month}
// (skips ones that already exist for that user+service+year+month)
// action "manual": drafts a single Invoice for an arbitrary studentId/serviceId/
// year/month/amount — for one-off cases the bulk generator doesn't cover.
export async function POST(req) {
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
    const db = readDB();
    const invoice = {
      InvoiceID: nextId(db, "INV"),
      StudentID: studentId,
      ServiceID: serviceId,
      Year: Number(year),
      Month: Number(month),
      ScheduledHours: null,
      AttendedHours: null,
      Amount: Number(amount) || 0,
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
    };
    db.invoices.push(invoice);
    writeDB(db);
    return NextResponse.json({ invoice });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const db = readDB();

  const studentIds = new Set(db.users.filter((u) => u.UserType === "Student").map((u) => u.UserID));
  const studentEnrollments = db.enrollments.filter((e) => studentIds.has(e.UserID));

  const created = [];
  for (const enr of studentEnrollments) {
    const exists = db.invoices.find(
      (i) => i.StudentID === enr.UserID && i.ServiceID === enr.ServiceID && i.Year === year && i.Month === month
    );
    if (exists) continue;

    const { scheduledHours, attendedHours, amount } = computeHoursAndAmount(db, {
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
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
    };
    db.invoices.push(invoice);
    created.push(invoice);
  }
  writeDB(db);
  return NextResponse.json({ created });
}

// body: { invoiceId, amount, inrAmount, inrDue, status }
export async function PATCH(req) {
  const { invoiceId, amount, inrAmount, inrDue, status } = await req.json();
  const db = readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  if (amount !== undefined) invoice.Amount = Number(amount);
  if (inrAmount !== undefined) invoice.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) invoice.INRDue = Number(inrDue);
  if (status !== undefined) invoice.Status = status;

  writeDB(db);
  return NextResponse.json({ invoice });
}
