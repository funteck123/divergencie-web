import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { uploadPaymentProof } from "@/lib/storage";
import { logAudit } from "@/lib/logging";

// Marking an invoice paid (by the student themselves or their parent)
// requires a payment-proof attachment — separate from the plain PATCH
// /api/invoices route, which still handles "mark as unpaid" (no attachment
// needed) and Management's own field edits.
export async function POST(req) {
  const form = await req.formData();
  const invoiceId = form.get("invoiceId");
  const file = form.get("file");

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });
  }
  if (!file || typeof file === "string" || file.size === 0) {
    return NextResponse.json({ error: "A payment proof attachment is required to mark as paid." }, { status: 400 });
  }

  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const { session, error } = requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  const path = await uploadPaymentProof(invoiceId, file);
  invoice.StudentPaidFlag = true;
  invoice.PaymentProofPath = path;
  // TKT-0033: when payment was actually confirmed received, not just the
  // invoice's own creation/edit time.
  invoice.PaidAt = new Date().toISOString();
  await writeDB(db, ["invoices"]);
  await logAudit({ actorUserId: session.userId, action: "edit", entityType: "Invoice", entityId: invoiceId, summary: `Marked invoice ${invoiceId} as paid with proof attached` });

  return NextResponse.json({ invoice });
}
