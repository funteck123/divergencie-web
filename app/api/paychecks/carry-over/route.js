import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { computeHoursAndAmount, describeSkipped, lineItemINR, nextMonthOf, rateById, refreshStaffTotal, splitByActiveEnrollment, userCurrencyOf } from "@/lib/billing";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Paycheck twin of /api/invoices/carry-over (TKT-0406). POST { paycheckId } -- a new Draft paycheck for the NEXT month for the same staff
// member, subjects and batches. A paycheck is pay for logged hours, so last month's amounts are NOT copied: each line is priced at the
// subject's CURRENT FULL rate for the new month (a monthly rate in full; an hourly rate times that month's scheduled hours), with the
// scheduled hours filled and the attended hours empty. The hours are added later by hand or by Rebuild Drafts once attendance is logged.
// A line whose enrollment has ended (or not started, or does not exist) in the new month is left out and named in the reply; so is a
// one-off rate and a subject with no amount that month. Refuses a one-off paycheck, a paycheck with no line left, and a staff member who
// already has a paycheck for that month. Management only. A separate route so the classic paychecks route stays unchanged.
export async function POST(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const paycheckId = body?.paycheckId;
  if (!paycheckId) return NextResponse.json({ error: "paycheckId is required." }, { status: 400 });

  const db = await readDB();
  const src = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!src) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });
  if (!Array.isArray(src.LineItems)) return NextResponse.json({ error: "A one-off paycheck is not repeated, so it cannot be carried over." }, { status: 400 });

  const { year: y, month: m } = nextMonthOf(src.Year, src.Month);
  const existing = db.paychecks.find((p) => p.StaffID === src.StaffID && p.Year === y && p.Month === m);
  if (existing) {
    return NextResponse.json({ error: `This staff member already has a paycheck for ${m}/${y} (${existing.PaycheckID}). Delete it first if you need to recreate it.` }, { status: 400 });
  }

  const { kept, skipped } = splitByActiveEnrollment(db, src.StaffID, src.LineItems, y, m);
  const lines = [];
  const seen = new Set();
  for (const { line, enrollment } of kept) {
    const key = `${line.ServiceID}|${enrollment.BatchID || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const service = db.services.find((s) => s.ServiceID === line.ServiceID);
    const rate = service ? rateById(service, enrollment.BatchID, enrollment.RateID) : null;
    if (!rate) {
      skipped.push({ ServiceID: line.ServiceID, BatchID: enrollment.BatchID || "", reason: "service or rate not found" });
      continue;
    }
    if (rate.BillingType === "OneOff") {
      skipped.push({ ServiceID: line.ServiceID, BatchID: enrollment.BatchID || "", reason: "one-off rate, not repeated" });
      continue;
    }
    const full = computeHoursAndAmount(db, { userId: src.StaffID, serviceId: line.ServiceID, batchId: enrollment.BatchID, year: y, month: m, assumePresentIfUnlogged: false, fullFeeMode: true });
    if (!(full.amount > 0)) {
      skipped.push({ ServiceID: line.ServiceID, BatchID: enrollment.BatchID || "", reason: `no amount for ${m}/${y}, no scheduled classes` });
      continue;
    }
    lines.push({ ServiceID: line.ServiceID, BatchID: enrollment.BatchID || "", ScheduledHours: full.scheduledHours || null, AttendedHours: null, Amount: full.amount, Currency: full.currency });
  }
  const skippedText = describeSkipped(db, skipped);
  if (lines.length === 0) {
    return NextResponse.json({ error: `Nothing to carry over to ${m}/${y}: ${skippedText.join("; ")}.` }, { status: 400 });
  }

  const copy = {
    PaycheckID: await nextId(db, "PAY"),
    StaffID: src.StaffID,
    Year: y,
    Month: m,
    LineItems: lines,
    Amount: 0,
    Currency: src.Currency || userCurrencyOf(db, src.StaffID),
    INRAmount: 0,
    INRDue: 0,
    Status: "Draft",
  };
  for (const li of lines) copy.INRAmount = Math.round((copy.INRAmount + (await lineItemINR(db, li, y, m))) * 100) / 100;
  copy.INRDue = copy.INRAmount;
  db.paychecks.push(copy);
  await refreshStaffTotal(db, copy);
  await writeDB(db, ["paychecks"]);
  await logAudit({ actorUserId: session.userId, action: "create", entityType: "Paycheck", entityId: copy.PaycheckID, summary: `Carried ${src.PaycheckID} (${src.Month}/${src.Year}) over to ${m}/${y} for ${src.StaffID} at the current full rate: ${lines.length} line item(s), ${copy.Currency} ${copy.Amount}${skipped.length ? `; skipped: ${skippedText.join("; ")}` : ""}` });
  return NextResponse.json({ paycheck: copy, skipped: skippedText });
}
