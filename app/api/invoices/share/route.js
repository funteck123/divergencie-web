import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { makeInvoiceShareToken } from "@/lib/invoiceShare";

// 24 Nov 2026 (owner): Management asks for a link to one invoice's PDF that opens without a login, to paste in the fee message.
// POST { invoiceId, days? } -> { url, expiresAt }. The link opens that one PDF until it expires (60 days by default, at most 180).
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;
  const { invoiceId, days } = await req.json().catch(() => ({}));
  if (!invoiceId) return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });
  const db = await readDB();
  if (!db.invoices.some((i) => i.InvoiceID === invoiceId)) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  let made;
  try {
    made = makeInvoiceShareToken(invoiceId, days);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
  const origin = new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/api/invoices/pdf?invoiceId=${encodeURIComponent(invoiceId)}&t=${made.token}`, expiresAt: made.expiresAt });
}
