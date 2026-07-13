import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { drawDocumentPDF } from "@/lib/pdfDoc";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { convertRecordTotal } from "@/lib/fxRates";

const TERMS =
  "Payment ensures the delivery of services; missed classes will be rescheduled or compensated. " +
  "All sales are final, and no refunds or exchanges are offered—please review your order carefully " +
  "before confirming. Payments must be made by the due date, with penalties incurred for late payments. " +
  "DivergenCIE Coaching is not liable for incorrect payments. By making payment, you agree to these terms.\n\n" +
  "For any delays or issues, please notify us at divergenCIE@outlook.com. Let us help you get A*. We care!";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const { error } = requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  const student = db.users.find((u) => u.UserID === invoice.StudentID);
  const service = db.services.find((s) => s.ServiceID === invoice.ServiceID);

  const invoiceCurrency = invoice.Currency || student?.Currency || service?.Currency || "INR";
  // Extra "Total (<student's own currency>)" line — only when it actually
  // differs from what this invoice was billed in (no INR-only restriction;
  // convertRecordTotal supports any target currency by pivoting through the
  // invoice's own already-frozen INRAmount, see lib/fxRates.js).
  const studentCurrency = student?.Currency || "INR";
  let convertedTotal = null;
  if (studentCurrency !== invoiceCurrency) {
    const fxRatesBefore = Object.keys(db.fxRates || {}).length;
    const amount = await convertRecordTotal(db, invoice, studentCurrency);
    if (amount != null) convertedTotal = { currency: studentCurrency, amount };
    if (Object.keys(db.fxRates || {}).length !== fxRatesBefore) await writeDB(db);
  }

  const dueDate = new Date(invoice.Year, invoice.Month - 1, 1);
  const buffer = await drawDocumentPDF({
    docType: "Invoice",
    docNumber: invoice.InvoiceID,
    issueDate: new Date(),
    dueDate,
    paymentTerms: "Advance Payment",
    companyLine: "DivergenCIE Coaching",
    partyLabel: "Student Name",
    partyName: student?.Name || invoice.StudentID,
    secondaryLabel: "Class Name",
    secondaryValue: service?.CourseClass || service?.Name || invoice.ServiceID,
    balanceLabel: "Balance Due:",
    // A Service can offer several currencies now — the invoice itself
    // records which one this bill was actually generated in (the
    // enrollment's chosen currency), falling back to the Student's own
    // Currency only for older invoices created before this field existed.
    currency: invoiceCurrency,
    balance: invoice.Amount,
    // Quantity is always 1 (one billing line for this month), Rate equals
    // the actual Amount charged — Quantity x Rate must equal Amount on a
    // real invoice. Service.Rate is a monthly figure, not per-hour, so it
    // can't be mixed with AttendedHours as a quantity (that produced a
    // Quantity x Rate that didn't match Amount at all).
    lineItems: [
      {
        item: service?.Name || invoice.ServiceID,
        quantity: 1,
        rate: invoice.Amount,
        amount: invoice.Amount,
      },
    ],
    taxPercent: 0,
    discountPercent: 0,
    total: invoice.Amount,
    terms: TERMS,
    ...(convertedTotal ? { convertedTotal } : {}),
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice_${invoice.InvoiceID}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
