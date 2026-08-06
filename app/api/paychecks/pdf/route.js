import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawPayslipPDF } from "@/lib/pdfDoc";
import { FIXED_DEPARTMENT } from "@/app/api/users/route";
import { requireSelfOrManagement } from "@/lib/authz";
import { lineItemName } from "@/lib/billing";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
// Employer SOCSO Category 1 is ~1.75% of gross wage (statutory table
// simplified to a flat rate here — we don't model the real banded table).
const EMPLOYER_SOCSO_RATE = 0.0175;

// YTD Gross for a staff member through a given month — for a monthly
// (LineItems) paycheck this sums every LineItem's own Amount (each still in
// its own native currency, same simplification the pre-existing code
// already made by summing Amount across possibly-different-currency
// paychecks); for a legacy OneOff/flat paycheck it's just Amount.
function grossOf(paycheck) {
  if (Array.isArray(paycheck.LineItems)) {
    return paycheck.LineItems.reduce((sum, li) => sum + (Number(li.Amount) || 0), 0);
  }
  return Number(paycheck.Amount) || 0;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const paycheckId = searchParams.get("paycheckId");

  const db = await readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const { error } = requireSelfOrManagement(req, paycheck.StaffID);
  if (error) return error;

  const staff = db.users.find((u) => u.UserID === paycheck.StaffID);
  // Falls back to the fixed Teacher/Ambassador Department if the account
  // predates that field being stamped on creation/conversion.
  const department = staff?.Department || FIXED_DEPARTMENT[staff?.UserType] || "";
  const staffCurrency = staff?.Currency || "INR";

  // YTD Gross = sum of this staff's paychecks in the same year, through the
  // month of this payslip — the other statutory YTD lines (EPF/EIS/PCB)
  // stay 0.00 since we don't collect those figures; YTD Employer SOCSO is
  // derived from YTD Gross at the same flat rate as the current month.
  const ytdGross = db.paychecks
    .filter((p) => p.StaffID === paycheck.StaffID && p.Year === paycheck.Year && p.Month <= paycheck.Month)
    .reduce((sum, p) => sum + grossOf(p), 0);

  let earnings, grossPay, currency, employerSocso, convertedTotal;

  if (Array.isArray(paycheck.LineItems)) {
    // Monthly combined paycheck: Amount/Currency are ALREADY the total
    // converted into the staff's own currency (computed at generate/edit
    // time — see app/api/paychecks/route.js). Earnings table stays
    // itemized per subject in each one's own native billed currency, same
    // "nothing about the original charge is lost" principle as invoices.
    earnings = paycheck.LineItems.map((li) => {
      const service = db.services.find((s) => s.ServiceID === li.ServiceID);
      return {
        item: service ? lineItemName(service, li.BatchID) : li.ServiceID || "Manual line item",
        quantity: 1,
        rate: li.Amount,
        amount: li.Amount,
        currency: li.Currency,
      };
    });
    grossPay = paycheck.Amount;
    currency = paycheck.Currency;
    employerSocso = Math.round(paycheck.Amount * EMPLOYER_SOCSO_RATE * 100) / 100;
  } else {
    const service = db.services.find((s) => s.ServiceID === paycheck.ServiceID);
    // Legacy invoices predate the Currency field entirely — fall back to
    // the Service's own Currency (a stable historical fact), never to the
    // staff's CURRENT profile Currency, which may have changed since this
    // paycheck was billed.
    const billedCurrency = paycheck.Currency || service?.Currency || "INR";
    earnings = [{ item: service ? lineItemName(service, paycheck.BatchID) : paycheck.ServiceID, quantity: 1, rate: paycheck.Amount, amount: paycheck.Amount, currency: billedCurrency }];
    grossPay = paycheck.Amount;
    currency = billedCurrency;
    employerSocso = Math.round(paycheck.Amount * EMPLOYER_SOCSO_RATE * 100) / 100;
    // Optional converted-total line: only when the staff's own Currency
    // genuinely differs from what this legacy paycheck was billed in, and
    // only when it's INR — INRAmount is the one converted figure a legacy
    // record always has.
    if (staffCurrency !== billedCurrency && staffCurrency === "INR") {
      convertedTotal = { currency: "INR", amount: paycheck.INRAmount };
    }
  }
  const ytdEmployerSocso = Math.round(ytdGross * EMPLOYER_SOCSO_RATE * 100) / 100;

  const buffer = await drawPayslipPDF({
    company: "DivergenCIE Coaching",
    registeredAs: "Intelligent Institute of Education",
    regNo: "UDYAM-JH-01-0013549 | Ministry of MSME, Govt. of India",
    period: `END-${MONTH_ABBR[paycheck.Month - 1]}-${paycheck.Year}`,
    emplNo: paycheck.StaffID,
    name: staff?.Name || paycheck.StaffID,
    department,
    role: staff?.Role || "",
    currency,
    // The header "Currency:" row is the staff's own home/payroll currency —
    // a distinct concept from the billed currency above (e.g. an INR-paid
    // teacher billed in USD for a specific service still has "INR" as their
    // own payroll currency here).
    staffCurrency,
    icPassport: staff?.PassportNumber || "",
    epfNo: "",
    socsoNo: "",
    taxNo: "",
    earnings,
    grossPay,
    deductions: [],
    nettPay: grossPay,
    employerSocso,
    ...(convertedTotal ? { convertedTotal } : {}),
    ytd: [
      { label: "YTD Basic", value: 0 },
      { label: "YTD Gross", value: ytdGross },
      { label: "YTD Employee EPF", value: 0 },
      { label: "YTD Employer EPF", value: 0 },
      { label: "YTD Employee SOCSO", value: 0 },
      { label: "YTD Employer SOCSO", value: ytdEmployerSocso },
      { label: "YTD Employee EIS", value: 0 },
      { label: "YTD Employer EIS", value: 0 },
      { label: "YTD Income Tax PCB", value: 0 },
    ],
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Payslip_${paycheck.PaycheckID}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
