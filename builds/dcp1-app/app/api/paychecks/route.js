import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount } from "@/lib/billing";

export async function GET() {
  const db = readDB();
  return NextResponse.json({ paychecks: db.paychecks });
}

// action "generate": drafts one Paycheck per Staff enrollment for {year, month}
// action "manual": drafts a single Paycheck for an arbitrary staffId/serviceId/
// year/month/amount — for one-off cases the bulk generator doesn't cover.
export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  if (action === "manual") {
    const { staffId, serviceId, year, month, amount } = body;
    if (!staffId || !serviceId || !year || !month || amount === undefined) {
      return NextResponse.json(
        { error: "staffId, serviceId, year, month, and amount are required." },
        { status: 400 }
      );
    }
    const db = readDB();
    const y = Number(year);
    const m = Number(month);
    const dup = db.paychecks.find(
      (p) => p.StaffID === staffId && p.ServiceID === serviceId && p.Year === y && p.Month === m
    );
    if (dup) {
      return NextResponse.json(
        { error: `A paycheck already exists for this Staff/Service in ${m}/${y}.` },
        { status: 400 }
      );
    }
    const paycheck = {
      PaycheckID: nextId(db, "PAY"),
      StaffID: staffId,
      ServiceID: serviceId,
      Year: y,
      Month: m,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: Number(amount) || 0,
      INRAmount: 0,
      INRDue: 0,
      Status: "Draft",
    };
    db.paychecks.push(paycheck);
    writeDB(db);
    return NextResponse.json({ paycheck });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const db = readDB();

  const staffIds = new Set(db.users.filter((u) => u.UserType === "Staff").map((u) => u.UserID));
  const staffEnrollments = db.enrollments.filter((e) => staffIds.has(e.UserID));

  const created = [];
  for (const enr of staffEnrollments) {
    const exists = db.paychecks.find(
      (p) => p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.Year === year && p.Month === month
    );
    if (exists) continue;

    const { scheduledHours, attendedHours, amount } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      year,
      month,
    });

    const paycheck = {
      PaycheckID: nextId(db, "PAY"),
      StaffID: enr.UserID,
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
    db.paychecks.push(paycheck);
    created.push(paycheck);
  }
  writeDB(db);
  return NextResponse.json({ created });
}

// body: { paycheckId, amount, inrAmount, inrDue, status, staffReceivedFlag }
export async function PATCH(req) {
  const { paycheckId, amount, inrAmount, inrDue, status, staffReceivedFlag } = await req.json();
  const db = readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  if (amount !== undefined) paycheck.Amount = Number(amount);
  if (inrAmount !== undefined) paycheck.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
  if (status !== undefined) paycheck.Status = status;
  if (staffReceivedFlag !== undefined) paycheck.StaffReceivedFlag = Boolean(staffReceivedFlag);

  writeDB(db);
  return NextResponse.json({ paycheck });
}
