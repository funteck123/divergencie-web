import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { signedProofUrl } from "@/lib/storage";

// GET ?invoiceId=... — redirects to a short-lived signed URL for the
// invoice's payment-proof attachment. Same viewers as the invoice itself
// (the paying student/parent, or Management).
export async function GET(req) {
  const invoiceId = new URL(req.url).searchParams.get("invoiceId");
  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (!invoice.PaymentProofPath) return NextResponse.json({ error: "No proof attached." }, { status: 404 });

  const { error } = requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  const url = await signedProofUrl(invoice.PaymentProofPath);
  return NextResponse.redirect(url);
}
