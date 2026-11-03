import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { carryOverLineItems, nextMonthOf, lineItemINR, refreshStudentTotal, DISCOUNT_KEYS } from "@/lib/billing";
import { requireManagement } from "@/lib/authz";
import { logAudit } from "@/lib/logging";

// TKT-0406: POST { invoiceId } -- a new Draft invoice for the NEXT month with the same subjects, batches, amounts and discount.
// Hours, notes, the Sent and Paid marks and any payment proof are not copied; the old invoice is not touched; the amounts are
// converted again at the new month's exchange rate. Refuses a one-off invoice, and a student who already has an invoice for the
// target month. Management only. A separate route (not an action of /api/invoices) so the classic UI's route stays unchanged.
export async function POST(req) {
  const { session, error } = requireManagement(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const invoiceId = body?.invoiceId;
  if (!invoiceId) return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });

  const db = await readDB();
  const src = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!src) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const items = carryOverLineItems(src);
  if (!items) return NextResponse.json({ error: "A one-off invoice is not repeated, so it cannot be carried over." }, { status: 400 });

  const { year: y, month: m } = nextMonthOf(src.Year, src.Month);
  const existing = db.invoices.find((i) => i.LineItems && i.StudentID === src.StudentID && i.Year === y && i.Month === m);
  if (existing) {
    return NextResponse.json({ error: `This student already has an invoice for ${m}/${y} (${existing.InvoiceID}). Delete it first if you need to recreate it.` }, { status: 400 });
  }

  const copy = {
    InvoiceID: await nextId(db, "INV"),
    StudentID: src.StudentID,
    Year: y,
    Month: m,
    LineItems: items,
    Amount: 0,
    Currency: src.Currency,
    INRAmount: 0,
    INRDue: 0,
    Status: "Draft",
  };
  for (const li of items) copy.INRAmount = Math.round((copy.INRAmount + (await lineItemINR(db, li, y, m))) * 100) / 100;
  copy.INRDue = copy.INRAmount;
  for (const k of DISCOUNT_KEYS) if (src[k] !== undefined && src[k] !== "" && src[k] !== 0) copy[k] = src[k];
  db.invoices.push(copy);
  await refreshStudentTotal(db, copy);
  await writeDB(db, ["invoices"]);
  await logAudit({ actorUserId: session.userId, action: "create", entityType: "Invoice", entityId: copy.InvoiceID, summary: `Carried ${src.InvoiceID} (${src.Month}/${src.Year}) over to ${m}/${y} for ${src.StudentID}: ${items.length} line item(s), ${copy.Currency} ${copy.Amount}` });
  return NextResponse.json({ invoice: copy });
}
