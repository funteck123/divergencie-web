import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf, rateById, isEnrollmentActiveForMonth } from "@/lib/billing";
import { getRateToINR } from "@/lib/fxRates";
import { requireManagement, requireSelfOrManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

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
  const { session, error: authError } = requireManagement(req);
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
    const service = db.services.find((s) => s.ServiceID === serviceId);
    const enrollment = db.enrollments.find((e) => e.UserID === staffId && e.ServiceID === serviceId);
    const batchId = enrollment?.BatchID;

    const dup = db.paychecks.find(
      (p) => p.StaffID === staffId && p.ServiceID === serviceId && p.BatchID === batchId && p.Year === y && p.Month === m
    );
    if (dup) {
      return NextResponse.json(
        { error: `A paycheck already exists for this Staff/Service in ${m}/${y}.` },
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
      const already = db.paychecks.some((p) => p.StaffID === staffId && p.ServiceID === serviceId && p.BatchID === batchId);
      if (already) {
        return NextResponse.json(
          { error: "This is a One-off rate — a paycheck for this Staff/Service already exists and none further will be created." },
          { status: 400 }
        );
      }
    }

    const currency = enrollment?.Currency || (service ? ratesOf(service, batchId)[0].Currency : "INR");
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
      BatchID: batchId || "",
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
    await logAudit({ actorUserId: session.userId, action: "create", entityType: "Paycheck", entityId: paycheck.PaycheckID, summary: `Manual paycheck for ${staffId} — ${paycheck.Currency} ${paycheck.Amount}`, snapshot: paycheck });
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
    if (!isEnrollmentActiveForMonth(enr, year, month)) continue;

    const service = db.services.find((s) => s.ServiceID === enr.ServiceID);
    const matchedRate = service ? rateById(service, enr.BatchID, enr.RateID) : null;
    const isOneOff = matchedRate?.BillingType === "OneOff";

    // OneOff: exactly one paycheck ever for this Staff/Service/Batch,
    // regardless of month. Monthly/Hourly: the usual one-per-month dedup.
    const exists = isOneOff
      ? db.paychecks.some((p) => p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.BatchID === enr.BatchID)
      : db.paychecks.some(
          (p) => p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.BatchID === enr.BatchID && p.Year === year && p.Month === month
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
    // See the matching comment in app/api/invoices/route.js — OneOff-billed
    // services have no recurring schedule by design, so zero scheduledHours
    // there is normal, not a warning-worthy state.
    const zeroScheduleWarning = scheduledHours <= 0 && billingType !== "OneOff";

    const paycheck = {
      PaycheckID: nextId(db, "PAY"),
      StaffID: enr.UserID,
      ServiceID: enr.ServiceID,
      BatchID: enr.BatchID || "",
      Year: year,
      Month: month,
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      INRAmount: fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0,
      INRDue: 0,
      Status: "Draft",
      ...(zeroScheduleWarning
        ? { Note: "$0 — no scheduled hours found for this Service/month. Check the Batch's schedule or its billing type." }
        : {}),
    };
    db.paychecks.push(paycheck);
    created.push(paycheck);
  }
  await writeDB(db);
  // One summary entry for the whole batch — see the matching comment in
  // app/api/invoices/route.js.
  await logAudit({
    actorUserId: session.userId,
    action: "generate",
    entityType: "Paycheck",
    entityId: `${month}/${year}`,
    summary: `Generated ${created.length} draft paycheck(s) for ${month}/${year}`,
    snapshot: { paycheckIds: created.map((p) => p.PaycheckID) },
  });
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
  const { session, error } = managementOnly
    ? requireManagement(req)
    : requireSelfOrManagement(req, paycheck.StaffID);
  if (error) return error;

  const before = JSON.parse(JSON.stringify(paycheck));
  if (scheduledHours !== undefined) paycheck.ScheduledHours = Number(scheduledHours);
  if (attendedHours !== undefined) paycheck.AttendedHours = Number(attendedHours);
  if (amount !== undefined) paycheck.Amount = Number(amount);
  if (inrAmount !== undefined) paycheck.INRAmount = Number(inrAmount);
  if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
  if (status !== undefined) paycheck.Status = status;
  if (staffReceivedFlag !== undefined) paycheck.StaffReceivedFlag = Boolean(staffReceivedFlag);

  await writeDB(db);
  await logAudit({
    actorUserId: session.userId,
    action: "edit",
    entityType: "Paycheck",
    entityId: paycheck.PaycheckID,
    summary: managementOnly ? `Edited paycheck ${paycheck.PaycheckID}` : `Staff self-reported paycheck ${paycheck.PaycheckID} as ${staffReceivedFlag ? "received" : "not received"}`,
    snapshot: { before, after: paycheck },
  });
  return NextResponse.json({ paycheck });
}

// body: { paycheckId }
export async function DELETE(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { paycheckId } = await req.json();
  const db = await readDB();
  const index = db.paychecks.findIndex((p) => p.PaycheckID === paycheckId);
  if (index === -1) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const [deleted] = db.paychecks.splice(index, 1);
  await writeDB(db);
  await logAudit({ actorUserId: session.userId, action: "delete", entityType: "Paycheck", entityId: paycheckId, summary: `Deleted paycheck ${paycheckId}`, snapshot: deleted });
  return NextResponse.json({ ok: true });
}
