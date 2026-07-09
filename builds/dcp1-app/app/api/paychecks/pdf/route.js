import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawDocumentPDF } from "@/lib/pdfDoc";

const TERMS =
  "This payslip reflects hours attended against your enrolled Service for the period shown. " +
  "Amounts are calculated from scheduled and attended hours and are subject to correction if attendance " +
  "records are later amended. DivergenCIE Coaching is not liable for payments made to incorrect account " +
  "details on file.\n\n" +
  "For any delays or issues, please notify us at divergenCIE@outlook.com. Thank you for teaching with us!";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const paycheckId = searchParams.get("paycheckId");

  const db = readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const staff = db.users.find((u) => u.UserID === paycheck.StaffID);
  const service = db.services.find((s) => s.ServiceID === paycheck.ServiceID);

  const dueDate = new Date(paycheck.Year, paycheck.Month - 1, 1);
  const buffer = await drawDocumentPDF({
    docType: "Paycheck",
    docNumber: paycheck.PaycheckID,
    issueDate: new Date(),
    dueDate,
    paymentTerms: "Monthly Payment",
    companyLine: "DivergenCIE Coaching",
    partyLabel: staff?.UserType === "Teacher" ? "Teacher Name" : "Staff Name",
    partyName: staff?.Name || paycheck.StaffID,
    secondaryLabel: "Service",
    secondaryValue: service?.Name || paycheck.ServiceID,
    balanceLabel: "Amount Due:",
    currency: service?.Currency || "INR",
    balance: paycheck.Amount,
    // Quantity is always 1 (one payout line for this month), Rate equals
    // the actual Amount paid — see the matching comment in
    // api/invoices/pdf/route.js for why AttendedHours can't be mixed with
    // Service.Rate as a quantity/rate pair.
    lineItems: [
      {
        item: service?.Name || paycheck.ServiceID,
        quantity: 1,
        rate: paycheck.Amount,
        amount: paycheck.Amount,
      },
    ],
    taxPercent: 0,
    discountPercent: 0,
    total: paycheck.Amount,
    terms: TERMS,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Paycheck_${paycheck.PaycheckID}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
