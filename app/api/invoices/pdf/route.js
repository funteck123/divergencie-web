import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { drawDocumentPDF } from "@/lib/pdfDoc";
import { requireSelfOrParentOrManagement } from "@/lib/authz";
import { convertRecordTotal, convertINRAmount } from "@/lib/fxRates";
import { amountDueInOwnCurrency, lineItemName, invoicePdfFilename, attachmentDisposition, discountBreakdown, discountSummaryRows } from "@/lib/billing";

const TERMS =
  "Payment ensures the delivery of services; missed classes will be rescheduled or compensated. " +
  "All sales are final, and no refunds or exchanges are offered. Please review your order carefully " +
  "before confirming. Payments must be made by the due date, with penalties incurred for late payments. " +
  "DivergenCIE Coaching is not liable for incorrect payments. By making payment, you agree to these terms.\n\n" +
  "For any delays or issues, please notify us at finance@divergencie.co.uk. Let us help you get A*. We care!";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  const db = await readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const { error } = requireSelfOrParentOrManagement(req, db, invoice.StudentID);
  if (error) return error;

  const student = db.users.find((u) => u.UserID === invoice.StudentID);
  const studentCurrency = student?.Currency || "INR";
  const dueDate = new Date(invoice.Year, invoice.Month - 1, 1);
  const fxRatesBefore = Object.keys(db.fxRates || {}).length;

  let buffer;
  if (Array.isArray(invoice.LineItems)) {
    // Monthly combined invoice: Amount/Currency are ALREADY the total
    // converted into the student's own currency (computed at generate/
    // edit time, see app/api/invoices/route.js), no re-conversion
    // needed for the Total line. The item table below stays itemized in
    // each subject's own native billed currency, same "nothing about the
    // original charge is lost" principle as the OneOff path.
    //
    // TKT-0289: Balance Due must convert INRDue into invoice.Currency (the
    // currency frozen on this invoice at creation), not the student's
    // CURRENT profile Currency -- Total is invoice.Amount, already in
    // invoice.Currency. Using the live profile currency here showed a
    // Balance Due in a different currency (and so a different number) than
    // the Total at the bottom of the same PDF whenever the student's
    // profile currency had changed since this invoice was generated.
    const convertedDueAmount = await convertINRAmount(db, invoice.INRDue, invoice.Currency, invoice.Year, invoice.Month);
    const displayDue = convertedDueAmount != null ? convertedDueAmount : invoice.INRDue;
    const displayDueCurrency = convertedDueAmount != null ? invoice.Currency : "INR";

    buffer = await drawDocumentPDF({
      docType: "Invoice",
      docNumber: invoice.InvoiceID,
      issueDate: new Date(),
      dueDate,
      paymentTerms: "Advance Payment",
      companyLine: "DivergenCIE Coaching",
      partyLabel: "Student Name",
      partyName: student?.Name || invoice.StudentID,
      secondaryLabel: "Billing Period",
      secondaryValue: `${invoice.Month}/${invoice.Year}`,
      balanceLabel: "Balance Due:",
      currency: displayDueCurrency,
      balance: displayDue,
      // One row per subject, each in its own native billed currency,
      // Quantity is always 1 (one billing line per subject this month),
      // Rate equals the actual Amount charged for that subject.
      lineItems: invoice.LineItems.map((li) => {
        const service = db.services.find((s) => s.ServiceID === li.ServiceID);
        return {
          item: service ? lineItemName(service, li.BatchID) : li.ServiceID || "Manual line item",
          quantity: 1,
          rate: li.Amount,
          amount: li.Amount,
          currency: li.Currency,
        };
      }),
      // TKT-0320: subtotal, each discount and the net total when the invoice has a discount.
      summaryRows: discountSummaryRows(invoice, invoice.Currency || "INR") || undefined,
      discountPercent: 0,
      total: discountBreakdown(invoice).net,
      totalCurrency: invoice.Currency,
      terms: TERMS,
    });
  } else {
    const service = db.services.find((s) => s.ServiceID === invoice.ServiceID);
    // Legacy invoices predate the Currency field entirely (created when INR
    // was the only currency in the system), fall back to the Service's own
    // Currency (a stable historical fact), never to the Student's CURRENT
    // profile Currency, which may have changed since this invoice was billed
    // and would mislabel an old INR invoice as whatever currency the student
    // uses today.
    const invoiceCurrency = invoice.Currency || service?.Currency || "INR";
    const convertedTotalAmount = await convertRecordTotal(db, invoice, studentCurrency);
    const convertedDueAmount = await convertINRAmount(db, invoice.INRDue, studentCurrency, invoice.Year, invoice.Month);

    const displayCurrency = convertedTotalAmount != null ? studentCurrency : invoiceCurrency;
    const displayTotal = convertedTotalAmount != null ? convertedTotalAmount : invoice.Amount;
    const displayDueCurrency = convertedDueAmount != null ? studentCurrency : invoiceCurrency;
    const displayDue = convertedDueAmount != null ? convertedDueAmount : amountDueInOwnCurrency(invoice, invoiceCurrency);

    buffer = await drawDocumentPDF({
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
      currency: displayDueCurrency,
      balance: displayDue,
      lineItems: [
        {
          item: service ? lineItemName(service, invoice.BatchID) : invoice.ServiceID,
          quantity: 1,
          rate: invoice.Amount,
          amount: invoice.Amount,
          currency: invoiceCurrency,
        },
      ],
      // TKT-0320: shown in the displayed currency, scaled from the invoice's own amounts.
      summaryRows: discountSummaryRows(invoice, displayCurrency, invoice.Amount ? displayTotal / invoice.Amount : 1) || undefined,
      discountPercent: 0,
      total: invoice.Amount ? displayTotal * (discountBreakdown(invoice).net / invoice.Amount) : displayTotal,
      totalCurrency: displayCurrency,
      terms: TERMS,
    });
  }
  if (Object.keys(db.fxRates || {}).length !== fxRatesBefore) await writeDB(db, []);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDisposition(invoicePdfFilename(invoice, student)),
      "Cache-Control": "no-store",
    },
  });
}
