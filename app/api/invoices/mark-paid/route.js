import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { uploadPaymentProof } from "@/lib/storage";
import { logAudit } from "@/lib/logging";

// Payment proof is a receipt/screenshot, never a code file -- images and
// PDF are the only real shapes that make sense. Extension AND Content-Type
// both checked (the client controls both, so this isn't a real trust
// boundary on its own, but it does close the specific gap a red-team pass
// found: no validation at all, size or type, meant anything could be
// uploaded and later served back with the attacker-chosen Content-Type).
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

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
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Payment proof must be 10MB or smaller." }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Payment proof must be a JPG, PNG, or PDF." }, { status: 400 });
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
