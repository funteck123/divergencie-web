import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { rateById } from "@/lib/billing";
import { getRateToINR, convertINRAmount } from "@/lib/fxRates";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// Mirrors app/api/invoices/migrate-monthly/route.js exactly — see the
// comment block there for the full rationale. Same one-time fold of every
// pre-existing flat-shape Paycheck into a combined Paycheck per (StaffID,
// Year, Month), OneOff-billed ones left untouched, dry-run by default.
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { apply } = await req.json().catch(() => ({}));
  const dryRun = apply !== true;

  const db = await readDB();
  const backupSnapshot = JSON.parse(JSON.stringify(db.paychecks));

  const oldFlatPaychecks = db.paychecks.filter((p) => !Array.isArray(p.LineItems));

  const groups = new Map(); // "StaffID|Year|Month" -> old paycheck[]
  const untouchedOneOff = [];
  const ambiguous = [];

  for (const pay of oldFlatPaychecks) {
    const service = db.services.find((s) => s.ServiceID === pay.ServiceID);
    if (!service) {
      ambiguous.push({ PaycheckID: pay.PaycheckID, reason: "Service no longer exists." });
      continue;
    }
    const enrollment = db.enrollments.find((e) => e.UserID === pay.StaffID && e.ServiceID === pay.ServiceID && e.BatchID === pay.BatchID);
    const matchedRate = rateById(service, pay.BatchID, enrollment?.RateID);
    if (!matchedRate) {
      ambiguous.push({ PaycheckID: pay.PaycheckID, reason: "No matching rate found for this Service/Batch." });
      continue;
    }
    if (matchedRate.BillingType === "OneOff") {
      untouchedOneOff.push(pay.PaycheckID);
      continue;
    }
    const key = `${pay.StaffID}|${pay.Year}|${pay.Month}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pay);
  }

  const combinedPaychecks = [];
  const mergeReport = [];
  for (const [key, group] of groups) {
    const [staffId, yearStr, monthStr] = key.split("|");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const lineItems = group.map((pay) => ({
      ServiceID: pay.ServiceID,
      BatchID: pay.BatchID || "",
      ScheduledHours: pay.ScheduledHours,
      AttendedHours: pay.AttendedHours,
      Amount: pay.Amount,
      Currency: pay.Currency || "INR",
      ...(pay.Note ? { Note: pay.Note } : {}),
    }));

    const inrAmount = Math.round(group.reduce((sum, pay) => sum + (Number(pay.INRAmount) || 0), 0) * 100) / 100;
    const inrDue = Math.round(group.reduce((sum, pay) => sum + (Number(pay.INRDue) || 0), 0) * 100) / 100;
    // Status only ever holds "Draft" or "Sent" in this app (payment is
    // tracked separately via StaffReceivedFlag, not a "Paid" status value)
    // — combined stays Draft only if every merged paycheck was still
    // Draft, otherwise Sent.
    const status = group.every((pay) => pay.Status === "Draft") ? "Draft" : "Sent";
    const staffReceivedFlag = group.every((pay) => pay.StaffReceivedFlag === true);

    const staffCurrency = db.users.find((u) => u.UserID === staffId)?.Currency || "INR";
    const convertedAmount = await convertINRAmount(db, inrAmount, staffCurrency, year, month);

    const combined = {
      PaycheckID: await nextId(db, "PAY"),
      StaffID: staffId,
      Year: year,
      Month: month,
      LineItems: lineItems,
      Amount: convertedAmount != null ? convertedAmount : inrAmount,
      Currency: convertedAmount != null ? staffCurrency : "INR",
      INRAmount: inrAmount,
      INRDue: inrDue,
      Status: status,
      StaffReceivedFlag: staffReceivedFlag,
    };
    combinedPaychecks.push(combined);
    mergeReport.push({
      newPaycheckId: combined.PaycheckID,
      staffId,
      period: `${month}/${year}`,
      mergedFromPaycheckIds: group.map((pay) => pay.PaycheckID),
      subjectCount: lineItems.length,
      status,
      staffReceivedFlag,
    });
  }

  const summary = {
    dryRun,
    totalPaychecksBefore: db.paychecks.length,
    oneOffUntouched: untouchedOneOff.length,
    ambiguousSkipped: ambiguous.length,
    ambiguousDetail: ambiguous,
    mergedGroups: combinedPaychecks.length,
    paychecksRemoved: [...groups.values()].reduce((sum, g) => sum + g.length, 0),
    paychecksAfter: db.paychecks.length - [...groups.values()].reduce((sum, g) => sum + g.length, 0) + combinedPaychecks.length,
    mergeReport,
  };

  if (dryRun) {
    return NextResponse.json({ ...summary, backupSnapshot });
  }

  const mergedOldIds = new Set([...groups.values()].flat().map((pay) => pay.PaycheckID));
  db.paychecks = db.paychecks.filter((p) => !mergedOldIds.has(p.PaycheckID));
  db.paychecks.push(...combinedPaychecks);
  await writeDB(db, ["paychecks"]);
  await deleteRecords(db, [{ collection: "paychecks", ids: [...mergedOldIds] }]);

  await logAudit({
    actorUserId: session.userId,
    action: "migrate",
    entityType: "Paycheck",
    entityId: "monthly-consolidation",
    summary: `Migrated ${summary.paychecksRemoved} paycheck(s) into ${summary.mergedGroups} combined monthly paycheck(s); ${summary.oneOffUntouched} OneOff left untouched, ${summary.ambiguousSkipped} ambiguous skipped.`,
    snapshot: summary,
  });

  return NextResponse.json(summary);
}
