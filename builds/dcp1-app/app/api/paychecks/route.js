import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount } from "@/lib/billing";

export async function GET() {
  const db = readDB();
  return NextResponse.json({ paychecks: db.paychecks });
}

export async function POST(req) {
  const { action, year, month } = await req.json();
  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate." }, { status: 400 });
  }
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

export async function PATCH(req) {
  const { paycheckId, amount, inrAmount, inrDue, status } = await req.json();
  const db = readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  if (amount !== undefined) paycheck.Amount = Number(amount);
  if (inrAmount !== undefined) paycheck.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
  if (status !== undefined) paycheck.Status = status;

  writeDB(db);
  return NextResponse.json({ paycheck });
}
