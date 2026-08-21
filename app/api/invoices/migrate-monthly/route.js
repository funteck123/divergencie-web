import { NextResponse } from "next/server";
import { readDB, writeDB, nextId, deleteRecords } from "@/lib/db";
import { rateById } from "@/lib/billing";
import { getRateToINR, convertINRAmount } from "@/lib/fxRates";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// One-time migration: every pre-existing invoice is in the old flat shape
// (ServiceID/BatchID/Amount directly on the invoice, one per Student/
// Service/Batch/month). After app/api/invoices/route.js's rewrite, only
// OneOff-billed invoices should stay that shape — every Monthly/Hourly one
// needs folding into a single combined Invoice per (StudentID, Year,
// Month) with a LineItems[] array. This route does that fold, once,
// against whatever's currently in db.invoices.
//
// Safe to call repeatedly with dryRun (default) — it never writes. Only
// `{ apply: true }` writes. Idempotent: an invoice that already has
// LineItems, or that resolves as OneOff, is left completely alone, so
// re-running after a partial apply (or just to sanity-check nothing
// changed) is harmless.
//
// billingType classification: resolved via the CURRENT Service/Batch rate
// config (rateById), same lookup the app already trusts elsewhere — not
// re-derived from the invoice's old numbers, which can't reliably tell
// Monthly from Hourly after the fact. An invoice whose Service/Batch/rate
// no longer resolves (deleted Service, edited-away rate) is classified
// "ambiguous" and left untouched rather than guessed at — listed
// separately in the response for manual review.
export async function POST(req) {
  const { session, error: authError } = requireManagement(req);
  if (authError) return authError;

  const { apply } = await req.json().catch(() => ({}));
  const dryRun = apply !== true;

  const db = await readDB();
  const backupSnapshot = JSON.parse(JSON.stringify(db.invoices));

  const oldFlatInvoices = db.invoices.filter((i) => !Array.isArray(i.LineItems));

  const groups = new Map(); // "StudentID|Year|Month" -> old invoice[]
  const untouchedOneOff = [];
  const ambiguous = [];

  for (const inv of oldFlatInvoices) {
    const service = db.services.find((s) => s.ServiceID === inv.ServiceID);
    if (!service) {
      ambiguous.push({ InvoiceID: inv.InvoiceID, reason: "Service no longer exists." });
      continue;
    }
    const enrollment = db.enrollments.find((e) => e.UserID === inv.StudentID && e.ServiceID === inv.ServiceID && e.BatchID === inv.BatchID);
    const matchedRate = rateById(service, inv.BatchID, enrollment?.RateID);
    if (!matchedRate) {
      ambiguous.push({ InvoiceID: inv.InvoiceID, reason: "No matching rate found for this Service/Batch." });
      continue;
    }
    if (matchedRate.BillingType === "OneOff") {
      untouchedOneOff.push(inv.InvoiceID);
      continue;
    }
    const key = `${inv.StudentID}|${inv.Year}|${inv.Month}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(inv);
  }

  const combinedInvoices = [];
  const mergeReport = [];
  for (const [key, group] of groups) {
    const [studentId, yearStr, monthStr] = key.split("|");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const lineItems = group.map((inv) => ({
      ServiceID: inv.ServiceID,
      BatchID: inv.BatchID || "",
      ScheduledHours: inv.ScheduledHours,
      AttendedHours: inv.AttendedHours,
      Amount: inv.Amount,
      Currency: inv.Currency || "INR",
      ...(inv.Note ? { Note: inv.Note } : {}),
    }));

    const inrAmount = Math.round(group.reduce((sum, inv) => sum + (Number(inv.INRAmount) || 0), 0) * 100) / 100;
    const inrDue = Math.round(group.reduce((sum, inv) => sum + (Number(inv.INRDue) || 0), 0) * 100) / 100;
    // Status only ever holds "Draft" or "Sent" in this app (payment is
    // tracked separately via StudentPaidFlag, not a "Paid" status value) —
    // combined stays Draft only if every merged invoice was still Draft,
    // otherwise Sent, so a month never gets prematurely hidden from or
    // shown to the student relative to what was already true.
    const status = group.every((inv) => inv.Status === "Draft") ? "Draft" : "Sent";
    const studentPaidFlag = group.every((inv) => inv.StudentPaidFlag === true);
    const proofPaths = [...new Set(group.map((inv) => inv.PaymentProofPath).filter(Boolean))];

    const studentCurrency = db.users.find((u) => u.UserID === studentId)?.Currency || "INR";
    const convertedAmount = await convertINRAmount(db, inrAmount, studentCurrency, year, month);

    const combined = {
      InvoiceID: await nextId(db, "INV"),
      StudentID: studentId,
      Year: year,
      Month: month,
      LineItems: lineItems,
      Amount: convertedAmount != null ? convertedAmount : inrAmount,
      Currency: convertedAmount != null ? studentCurrency : "INR",
      INRAmount: inrAmount,
      INRDue: inrDue,
      Status: status,
      StudentPaidFlag: studentPaidFlag,
      ...(proofPaths[0] ? { PaymentProofPath: proofPaths[0] } : {}),
    };
    combinedInvoices.push(combined);
    mergeReport.push({
      newInvoiceId: combined.InvoiceID,
      studentId,
      period: `${month}/${year}`,
      mergedFromInvoiceIds: group.map((inv) => inv.InvoiceID),
      subjectCount: lineItems.length,
      status,
      studentPaidFlag,
      ...(proofPaths.length > 1 ? { warning: `${proofPaths.length} distinct payment proofs found — only the first was kept; review the others manually.` } : {}),
    });
  }

  const summary = {
    dryRun,
    totalInvoicesBefore: db.invoices.length,
    oneOffUntouched: untouchedOneOff.length,
    ambiguousSkipped: ambiguous.length,
    ambiguousDetail: ambiguous,
    mergedGroups: combinedInvoices.length,
    invoicesRemoved: [...groups.values()].reduce((sum, g) => sum + g.length, 0),
    invoicesAfter: db.invoices.length - [...groups.values()].reduce((sum, g) => sum + g.length, 0) + combinedInvoices.length,
    mergeReport,
  };

  if (dryRun) {
    // No writeDB — this is purely a preview. backupSnapshot is included so
    // the caller has a full pre-migration snapshot to save before ever
    // calling apply:true.
    return NextResponse.json({ ...summary, backupSnapshot });
  }

  const mergedOldIds = new Set([...groups.values()].flat().map((inv) => inv.InvoiceID));
  db.invoices = db.invoices.filter((i) => !mergedOldIds.has(i.InvoiceID));
  db.invoices.push(...combinedInvoices);
  await writeDB(db, ["invoices"]);
  await deleteRecords(db, [{ collection: "invoices", ids: [...mergedOldIds] }]);

  await logAudit({
    actorUserId: session.userId,
    action: "migrate",
    entityType: "Invoice",
    entityId: "monthly-consolidation",
    summary: `Migrated ${summary.invoicesRemoved} invoice(s) into ${summary.mergedGroups} combined monthly invoice(s); ${summary.oneOffUntouched} OneOff left untouched, ${summary.ambiguousSkipped} ambiguous skipped.`,
    snapshot: summary,
  });

  return NextResponse.json(summary);
}
