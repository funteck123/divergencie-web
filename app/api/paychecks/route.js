import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf } from "@/lib/billing";
import { getRateToINR } from "@/lib/fxRates";
import { requireManagement, requireSelfOrManagement } from "@/lib/authz";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ paychecks: db.paychecks });
}

// action "generate": drafts one Paycheck per Staff enrollment for {year, month}
// action "manual": drafts a single Paycheck for an arbitrary staffId/serviceId/
// year/month/amount — for one-off cases the bulk generator doesn't cover.
export async function POST(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

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
    const db = await readDB();
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
    const service = db.services.find((s) => s.ServiceID === serviceId);
    const enrollment = db.enrollments.find((e) => e.UserID === staffId && e.ServiceID === serviceId);
    const currency = enrollment?.Currency || (service ? ratesOf(service)[0].Currency : "INR");
    const paycheckAmount = Number(amount) || 0;
    // Auto-filled using the currency's rate as of the 1st of this
    // paycheck's own month — see lib/fxRates.js. Left at 0 (same as before
    // this existed) when there's no rate to auto-fill; Management can
    // always override it either way.
    const fxRate = await getRateToINR(db, currency, y, m);
    const paycheck = {
      PaycheckID: nextId(db, "PAY"),
      StaffID: staffId,
      ServiceID: serviceId,
      Year: y,
      Month: m,
      ScheduledHours: null,
      AttendedHours: null,
      Amount: paycheckAmount,
      Currency: currency,
      INRAmount: fxRate != null ? Math.round(paycheckAmount * fxRate * 100) / 100 : 0,
      INRDue: 0,
      Status: "Draft",
    };
    db.paychecks.push(paycheck);
    await writeDB(db);
    return NextResponse.json({ paycheck });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const db = await readDB();

  const staffIds = new Set(
    db.users.filter((u) => ["Teacher", "Staff", "Ambassador"].includes(u.UserType)).map((u) => u.UserID)
  );
  const staffEnrollments = db.enrollments.filter((e) => staffIds.has(e.UserID));

  const created = [];
  for (const enr of staffEnrollments) {
    const exists = db.paychecks.find(
      (p) => p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.Year === year && p.Month === month
    );
    if (exists) continue;

    const { scheduledHours, attendedHours, amount, currency } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      year,
      month,
    });
    const fxRate = await getRateToINR(db, currency, year, month);

    const paycheck = {
      PaycheckID: nextId(db, "PAY"),
      StaffID: enr.UserID,
      ServiceID: enr.ServiceID,
      Year: year,
      Month: month,
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      INRAmount: fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0,
      INRDue: 0,
      Status: "Draft",
      // Flags a $0 draft that's $0 because no schedule data exists for this
      // Service/month (missing occurrences), not because the payout is
      // legitimately zero — Management should check for a schedule gap.
      ...(scheduledHours <= 0 ? { Note: "No scheduled hours found for this Service/month." } : {}),
    };
    db.paychecks.push(paycheck);
    created.push(paycheck);
  }
  await writeDB(db);
  return NextResponse.json({ created });
}

// body: { paycheckId, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, staffReceivedFlag }
// The Staff/Teacher/Ambassador may only ever toggle staffReceivedFlag on
// their own paycheck — every other field is a Management-only billing edit.
export async function PATCH(req) {
  const { paycheckId, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, staffReceivedFlag } = await req.json();
  const db = await readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const managementOnly = [scheduledHours, attendedHours, amount, inrAmount, inrDue, status].some((v) => v !== undefined);
  const { error } = managementOnly
    ? requireManagement(req)
    : requireSelfOrManagement(req, paycheck.StaffID);
  if (error) return error;

  if (scheduledHours !== undefined) paycheck.ScheduledHours = Number(scheduledHours);
  if (attendedHours !== undefined) paycheck.AttendedHours = Number(attendedHours);
  if (amount !== undefined) paycheck.Amount = Number(amount);
  if (inrAmount !== undefined) paycheck.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
  if (status !== undefined) paycheck.Status = status;
  if (staffReceivedFlag !== undefined) paycheck.StaffReceivedFlag = Boolean(staffReceivedFlag);

  await writeDB(db);
  return NextResponse.json({ paycheck });
}

// body: { paycheckId }
export async function DELETE(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { paycheckId } = await req.json();
  const db = await readDB();
  const index = db.paychecks.findIndex((p) => p.PaycheckID === paycheckId);
  if (index === -1) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  db.paychecks.splice(index, 1);
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
