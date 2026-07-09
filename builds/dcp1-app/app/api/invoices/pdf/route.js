import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawDocumentPDF } from "@/lib/pdfDoc";

const TERMS =
  "Payment ensures the delivery of services; missed classes will be rescheduled or compensated. " +
  "All sales are final, and no refunds or exchanges are offered—please review your order carefully " +
  "before confirming. Payments must be made by the due date, with penalties incurred for late payments. " +
  "DivergenCIE Coaching is not liable for incorrect payments. By making payment, you agree to these terms.\n\n" +
  "For any delays or issues, please notify us at divergenCIE@outlook.com. Let us help you get A*. We care!";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  const db = readDB();
  const invoice = db.invoices.find((i) => i.InvoiceID === invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const student = db.users.find((u) => u.UserID === invoice.StudentID);
  const service = db.services.find((s) => s.ServiceID === invoice.ServiceID);

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
    currency: service?.Currency || "INR",
    balance: invoice.Amount,
    lineItems: [
      {
        item: service?.Name || invoice.ServiceID,
        quantity: invoice.AttendedHours ?? 1,
        rate: service?.Rate ?? invoice.Amount,
        amount: invoice.Amount,
      },
    ],
    taxPercent: 0,
    discountPercent: 0,
    total: invoice.Amount,
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
