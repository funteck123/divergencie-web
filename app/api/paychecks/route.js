import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, ratesOf, rateById, isEnrollmentActiveForMonth } from "@/lib/billing";
import { getRateToINR, convertINRAmount } from "@/lib/fxRates";
import { requireManagement, requireSelfOrManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Mirrors app/api/invoices/route.js exactly (see the comment block there for
// the full rationale) — same two coexisting shapes, same reasoning, just
// Staff/Teacher/Ambassador instead of Student:
//
// - OneOff-billed: unchanged flat shape — ServiceID/BatchID/Amount/Currency
//   directly on the paycheck, one ever per Staff+Service+Batch.
// - Monthly/Hourly-billed: ONE combined Paycheck per (StaffID, Year, Month),
//   LineItems[]: { ServiceID, BatchID, ScheduledHours, AttendedHours,
//   Amount, Currency, Note? }. Amount/Currency is the total converted into
//   the staff's own profile Currency; INRAmount/INRDue are Management's
//   internal INR accounting figures. Status/StaffReceivedFlag are a single
//   field for the whole month.

function staffCurrencyOf(db, staffId) {
  return db.users.find((u) => u.UserID === staffId)?.Currency || "INR";
}

async function lineItemINR(db, lineItem, year, month) {
  const rate = await getRateToINR(db, lineItem.Currency, year, month);
  if (rate == null) return 0;
  return Math.round((Number(lineItem.Amount) || 0) * rate * 100) / 100;
}

// invoice.Currency-equivalent freezing — see the matching comment in
// app/api/invoices/route.js for why this never reassigns Currency.
async function refreshStaffTotal(db, paycheck) {
  const converted = await convertINRAmount(db, paycheck.INRAmount, paycheck.Currency, paycheck.Year, paycheck.Month);
  if (converted != null) paycheck.Amount = converted;
}

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  return NextResponse.json({ paychecks: db.paychecks });
}

// action "generate": drafts/extends paychecks for {year, month} — OneOff
// enrollments get their own standalone paycheck (unchanged, one ever);
// Monthly/Hourly enrollments each become a LineItem on that staff member's
// one combined paycheck for the month, creating it if it doesn't exist yet.
// action "manual": adds a single ad-hoc LineItem (or standalone OneOff-
// shaped paycheck) for cases the bulk generator doesn't cover.
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
    const matchedRate = service ? rateById(service, batchId, enrollment?.RateID) : null;
    const currency = enrollment?.Currency || (service ? ratesOf(service, batchId)[0].Currency : "INR");
    const paycheckAmount = Number(amount) || 0;

    if (matchedRate?.BillingType === "OneOff") {
      const already = db.paychecks.some(
        (p) => !p.LineItems && p.StaffID === staffId && p.ServiceID === serviceId && p.BatchID === batchId
      );
      if (already) {
        return NextResponse.json(
          { error: "This is a One-off rate — a paycheck for this Staff/Service already exists and none further will be created." },
          { status: 400 }
        );
      }
      const fxRate = await getRateToINR(db, currency, y, m);
      const paycheckINRAmount = fxRate != null ? Math.round(paycheckAmount * fxRate * 100) / 100 : 0;
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
        INRAmount: paycheckINRAmount,
        INRDue: paycheckINRAmount,
        Status: "Draft",
      };
      db.paychecks.push(paycheck);
      await writeDB(db);
      await logAudit({ actorUserId: session.userId, action: "create", entityType: "Paycheck", entityId: paycheck.PaycheckID, summary: `Manual OneOff paycheck for ${staffId} — ${paycheck.Currency} ${paycheck.Amount}`, snapshot: paycheck });
      return NextResponse.json({ paycheck });
    }

    let paycheck = db.paychecks.find((p) => p.LineItems && p.StaffID === staffId && p.Year === y && p.Month === m);
    if (!paycheck) {
      paycheck = {
        PaycheckID: nextId(db, "PAY"),
        StaffID: staffId,
        Year: y,
        Month: m,
        LineItems: [],
        Amount: 0,
        Currency: staffCurrencyOf(db, staffId),
        INRAmount: 0,
        INRDue: 0,
        Status: "Draft",
      };
      db.paychecks.push(paycheck);
    }
    const lineItem = { ServiceID: serviceId, BatchID: batchId || "", ScheduledHours: null, AttendedHours: null, Amount: paycheckAmount, Currency: currency };
    paycheck.LineItems.push(lineItem);
    const liINR = await lineItemINR(db, lineItem, y, m);
    paycheck.INRAmount = Math.round((paycheck.INRAmount + liINR) * 100) / 100;
    paycheck.INRDue = Math.round((paycheck.INRDue + liINR) * 100) / 100;
    await refreshStaffTotal(db, paycheck);
    await writeDB(db);
    await logAudit({ actorUserId: session.userId, action: "edit", entityType: "Paycheck", entityId: paycheck.PaycheckID, summary: `Added manual line item to ${paycheck.PaycheckID} for ${staffId} — ${currency} ${paycheckAmount}`, snapshot: paycheck });
    return NextResponse.json({ paycheck });
  }

  if (action !== "generate") {
    return NextResponse.json({ error: "action must be generate or manual." }, { status: 400 });
  }
  const { year, month } = body;
  const y = Number(year);
  const m = Number(month);
  const db = await readDB();

  const staffIds = new Set(
    db.users.filter((u) => ["Teacher", "Staff", "Ambassador"].includes(u.UserType)).map((u) => u.UserID)
  );
  const staffEnrollments = db.enrollments.filter((e) => staffIds.has(e.UserID));

  const createdOneOffs = [];
  const createdLineItems = [];
  const touchedPaycheckIds = new Set();

  for (const enr of staffEnrollments) {
    if (!isEnrollmentActiveForMonth(enr, y, m)) continue;

    const service = db.services.find((s) => s.ServiceID === enr.ServiceID);
    const matchedRate = service ? rateById(service, enr.BatchID, enr.RateID) : null;
    const isOneOff = matchedRate?.BillingType === "OneOff";

    if (isOneOff) {
      const already = db.paychecks.some(
        (p) => !p.LineItems && p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.BatchID === enr.BatchID
      );
      if (already) continue;

      const { amount, currency } = computeHoursAndAmount(db, { userId: enr.UserID, serviceId: enr.ServiceID, batchId: enr.BatchID, year: y, month: m });
      const fxRate = await getRateToINR(db, currency, y, m);
      const paycheckINRAmount = fxRate != null ? Math.round(amount * fxRate * 100) / 100 : 0;
      const paycheck = {
        PaycheckID: nextId(db, "PAY"),
        StaffID: enr.UserID,
        ServiceID: enr.ServiceID,
        BatchID: enr.BatchID || "",
        Year: y,
        Month: m,
        ScheduledHours: 0,
        AttendedHours: 0,
        Amount: amount,
        Currency: currency,
        INRAmount: paycheckINRAmount,
        INRDue: paycheckINRAmount,
        Status: "Draft",
      };
      db.paychecks.push(paycheck);
      createdOneOffs.push(paycheck);
      continue;
    }

    let paycheck = db.paychecks.find((p) => p.LineItems && p.StaffID === enr.UserID && p.Year === y && p.Month === m);
    if (paycheck?.LineItems.some((li) => li.ServiceID === enr.ServiceID && li.BatchID === enr.BatchID)) continue;

    // Also skip if an OLD flat-shape paycheck already covers this exact
    // Staff/Service/Batch/Year/Month — see the matching comment/fix in
    // app/api/invoices/route.js.
    const oldFlatAlreadyExists = db.paychecks.some(
      (p) => !p.LineItems && p.StaffID === enr.UserID && p.ServiceID === enr.ServiceID && p.BatchID === enr.BatchID && p.Year === y && p.Month === m
    );
    if (oldFlatAlreadyExists) continue;

    const { scheduledHours, attendedHours, amount, currency, billingType } = computeHoursAndAmount(db, {
      userId: enr.UserID,
      serviceId: enr.ServiceID,
      batchId: enr.BatchID,
      year: y,
      month: m,
    });
    const zeroScheduleWarning = scheduledHours <= 0;
    const lineItem = {
      ServiceID: enr.ServiceID,
      BatchID: enr.BatchID || "",
      ScheduledHours: scheduledHours,
      AttendedHours: attendedHours,
      Amount: amount,
      Currency: currency,
      ...(zeroScheduleWarning
        ? { Note: "$0 — no scheduled hours found for this Service/month. Check the Batch's schedule or its billing type." }
        : {}),
    };

    if (!paycheck) {
      paycheck = {
        PaycheckID: nextId(db, "PAY"),
        StaffID: enr.UserID,
        Year: y,
        Month: m,
        LineItems: [],
        Amount: 0,
        Currency: staffCurrencyOf(db, enr.UserID),
        INRAmount: 0,
        INRDue: 0,
        Status: "Draft",
      };
      db.paychecks.push(paycheck);
    }
    paycheck.LineItems.push(lineItem);
    const liINR = await lineItemINR(db, lineItem, y, m);
    paycheck.INRAmount = Math.round((paycheck.INRAmount + liINR) * 100) / 100;
    paycheck.INRDue = Math.round((paycheck.INRDue + liINR) * 100) / 100;
    touchedPaycheckIds.add(paycheck.PaycheckID);
    createdLineItems.push({ paycheckId: paycheck.PaycheckID, lineItem });
  }

  for (const paycheckId of touchedPaycheckIds) {
    const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
    await refreshStaffTotal(db, paycheck);
  }

  await writeDB(db);
  await logAudit({
    actorUserId: session.userId,
    action: "generate",
    entityType: "Paycheck",
    entityId: `${m}/${y}`,
    summary: `Generated ${createdOneOffs.length} OneOff paycheck(s) and ${createdLineItems.length} line item(s) across ${touchedPaycheckIds.size} paycheck(s) for ${m}/${y}`,
    snapshot: { oneOffPaycheckIds: createdOneOffs.map((p) => p.PaycheckID), touchedPaycheckIds: [...touchedPaycheckIds] },
  });
  const created = [...createdOneOffs, ...createdLineItems.map((c) => c.lineItem)];
  return NextResponse.json({ created });
}

// Monthly (LineItems) paycheck body variants:
//   Line-item edit:  { paycheckId, lineItemIndex, scheduledHours?, attendedHours?, amount? } — Management only
//   Paycheck-level:  { paycheckId, status?, inrDue?, staffReceivedFlag? } — status/inrDue Management only,
//                    staffReceivedFlag may also be set by the Staff/Teacher/Ambassador themselves
// OneOff (legacy flat) paycheck body: { paycheckId, scheduledHours?, attendedHours?, amount?, inrAmount?, inrDue?, status?, staffReceivedFlag? } — unchanged.
export async function PATCH(req) {
  const body = await req.json();
  const { paycheckId, lineItemIndex, scheduledHours, attendedHours, amount, inrAmount, inrDue, status, staffReceivedFlag } = body;
  const db = await readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const isLineItemPaycheck = Array.isArray(paycheck.LineItems);
  const managementOnly = [scheduledHours, attendedHours, amount, inrAmount, inrDue, status].some((v) => v !== undefined) || lineItemIndex !== undefined;
  const { session, error } = managementOnly
    ? requireManagement(req)
    : requireSelfOrManagement(req, paycheck.StaffID);
  if (error) return error;

  const before = JSON.parse(JSON.stringify(paycheck));
  let summary;

  if (isLineItemPaycheck && lineItemIndex !== undefined) {
    const li = paycheck.LineItems[lineItemIndex];
    if (!li) return NextResponse.json({ error: "Line item not found." }, { status: 404 });

    const oldLiINR = await lineItemINR(db, li, paycheck.Year, paycheck.Month);
    if (scheduledHours !== undefined) li.ScheduledHours = Number(scheduledHours);
    if (attendedHours !== undefined) li.AttendedHours = Number(attendedHours);
    if (amount !== undefined) li.Amount = Number(amount);
    const newLiINR = await lineItemINR(db, li, paycheck.Year, paycheck.Month);

    const delta = Math.round((newLiINR - oldLiINR) * 100) / 100;
    paycheck.INRAmount = Math.round((paycheck.INRAmount + delta) * 100) / 100;
    paycheck.INRDue = Math.round((paycheck.INRDue + delta) * 100) / 100;
    await refreshStaffTotal(db, paycheck);
    summary = `Edited line item ${lineItemIndex} on paycheck ${paycheck.PaycheckID}`;
  } else if (isLineItemPaycheck) {
    if (status !== undefined) paycheck.Status = status;
    if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
    if (staffReceivedFlag !== undefined) paycheck.StaffReceivedFlag = Boolean(staffReceivedFlag);
    summary = managementOnly ? `Edited paycheck ${paycheck.PaycheckID}` : `Staff self-reported paycheck ${paycheck.PaycheckID} as ${staffReceivedFlag ? "received" : "not received"}`;
  } else {
    if (scheduledHours !== undefined) paycheck.ScheduledHours = Number(scheduledHours);
    if (attendedHours !== undefined) paycheck.AttendedHours = Number(attendedHours);
    if (amount !== undefined) paycheck.Amount = Number(amount);
    if (inrAmount !== undefined) paycheck.INRAmount = Number(inrAmount);
    if (inrDue !== undefined) paycheck.INRDue = Number(inrDue);
    if (status !== undefined) paycheck.Status = status;
    if (staffReceivedFlag !== undefined) paycheck.StaffReceivedFlag = Boolean(staffReceivedFlag);
    summary = managementOnly ? `Edited paycheck ${paycheck.PaycheckID}` : `Staff self-reported paycheck ${paycheck.PaycheckID} as ${staffReceivedFlag ? "received" : "not received"}`;
  }

  await writeDB(db);
  await logAudit({
    actorUserId: session.userId,
    action: "edit",
    entityType: "Paycheck",
    entityId: paycheck.PaycheckID,
    summary,
    snapshot: { before, after: paycheck },
  });
  return NextResponse.json({ paycheck });
}

// body: { paycheckId } — removes the whole paycheck: for a monthly
// (LineItems) paycheck, that's every subject that month at once.
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
