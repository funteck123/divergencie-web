import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { drawDocumentPDF } from "@/lib/pdfDoc";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { convertRecordTotal, convertINRAmount } from "@/lib/fxRates";
import { amountDueInOwnCurrency, lineItemName } from "@/lib/billing";

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

  // Legacy invoices predate the Currency field entirely (created when INR
  // was the only currency in the system) — fall back to the Service's own
  // Currency (a stable historical fact), never to the Student's CURRENT
  // profile Currency, which may have changed since this invoice was billed
  // and would mislabel an old INR invoice as whatever currency the student
  // uses today.
  const invoiceCurrency = invoice.Currency || service?.Currency || "INR";
  // The item table stays in whatever currency this invoice was actually
  // billed in (its own native record of the charge) — but the headline
  // figures (Balance Due box, and the final Total line) are always shown in
  // the student's OWN currency, converted via lib/fxRates.js, falling back
  // to the native currency/amount if a conversion genuinely can't be
  // resolved (so the document is never left blank).
  const studentCurrency = student?.Currency || "INR";
  const fxRatesBefore = Object.keys(db.fxRates || {}).length;
  const convertedTotalAmount = await convertRecordTotal(db, invoice, studentCurrency);
  const convertedDueAmount = await convertINRAmount(db, invoice.INRDue, studentCurrency, invoice.Year, invoice.Month);
  if (Object.keys(db.fxRates || {}).length !== fxRatesBefore) await writeDB(db);

  const displayCurrency = convertedTotalAmount != null ? studentCurrency : invoiceCurrency;
  const displayTotal = convertedTotalAmount != null ? convertedTotalAmount : invoice.Amount;
  const displayDueCurrency = convertedDueAmount != null ? studentCurrency : invoiceCurrency;
  const displayDue = convertedDueAmount != null ? convertedDueAmount : amountDueInOwnCurrency(invoice, invoiceCurrency);

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
    secondaryValue: service?.Course || (service ? lineItemName(service, invoice.BatchID) : invoice.ServiceID),
    balanceLabel: "Balance Due:",
    // Balance Due is the outstanding amount (from INR Due), in the
    // student's own currency — NOT the invoice's gross Amount.
    currency: displayDueCurrency,
    balance: displayDue,
    // Total line has its own independent currency/amount pair — see
    // totalCurrency below — since its conversion can succeed/fail
    // independently of Balance Due's.
    // Quantity is always 1 (one billing line for this month), Rate equals
    // the actual Amount charged — Quantity x Rate must equal Amount on a
    // real invoice. Service.Rate is a monthly figure, not per-hour, so it
    // can't be mixed with AttendedHours as a quantity (that produced a
    // Quantity x Rate that didn't match Amount at all).
    lineItems: [
      {
        item: service ? lineItemName(service, invoice.BatchID) : invoice.ServiceID,
        quantity: 1,
        rate: invoice.Amount,
        amount: invoice.Amount,
        currency: invoiceCurrency,
      },
    ],
    taxPercent: 0,
    discountPercent: 0,
    // The final Total line is the full charge, converted into the
    // student's own currency — the item table above still shows the
    // native billed amount, so nothing about the original charge is lost.
    total: displayTotal,
    totalCurrency: displayCurrency,
    terms: TERMS,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice_${invoice.InvoiceID}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
