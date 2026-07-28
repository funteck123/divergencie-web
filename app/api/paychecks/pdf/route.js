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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const paycheckId = searchParams.get("paycheckId");

  const db = await readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const { error } = requireSelfOrManagement(req, paycheck.StaffID);
  if (error) return error;

  const staff = db.users.find((u) => u.UserID === paycheck.StaffID);
  const service = db.services.find((s) => s.ServiceID === paycheck.ServiceID);
  // Falls back to the fixed Teacher/Ambassador Department if the account
  // predates that field being stamped on creation/conversion.
  const department = staff?.Department || FIXED_DEPARTMENT[staff?.UserType] || "";

  // YTD Gross = sum of this staff's paychecks in the same year, through the
  // month of this payslip — the other statutory YTD lines (EPF/EIS/PCB)
  // stay 0.00 since we don't collect those figures; YTD Employer SOCSO is
  // derived from YTD Gross at the same flat rate as the current month.
  const ytdGross = db.paychecks
    .filter((p) => p.StaffID === paycheck.StaffID && p.Year === paycheck.Year && p.Month <= paycheck.Month)
    .reduce((sum, p) => sum + (Number(p.Amount) || 0), 0);
  const employerSocso = Math.round(paycheck.Amount * EMPLOYER_SOCSO_RATE * 100) / 100;
  const ytdEmployerSocso = Math.round(ytdGross * EMPLOYER_SOCSO_RATE * 100) / 100;

  // Optional converted-total line: only shown when the staff's own Currency
  // genuinely differs from what this paycheck was billed in, and only when
  // it's INR — INRAmount is the one converted figure we always have (FX rate
  // as of the 1st of this paycheck's own month), so it's only safe to label
  // as "the staff's currency" when that currency really is INR.
  const staffCurrency = staff?.Currency || "INR";
  const paycheckCurrency = paycheck.Currency || staffCurrency;
  const showConvertedTotal = staffCurrency !== paycheckCurrency && staffCurrency === "INR";

  const billedCurrency = paycheck.Currency || service?.Currency || "INR";

  const buffer = await drawPayslipPDF({
    company: "DivergenCIE Coaching",
    registeredAs: "Intelligent Institute of Education",
    regNo: "UDYAM-JH-01-0013549 | Ministry of MSME, Govt. of India",
    period: `END-${MONTH_ABBR[paycheck.Month - 1]}-${paycheck.Year}`,
    emplNo: paycheck.StaffID,
    name: staff?.Name || paycheck.StaffID,
    department,
    role: staff?.Role || "",
    // Payslip totals must show the currency the paycheck was actually billed
    // in (Paycheck.Currency, from the enrollment's resolved rate). Legacy
    // paychecks predating this field fall back to the Service's own
    // Currency (a stable historical fact), never to the staff's CURRENT
    // profile Currency — that can change after the fact and would mislabel
    // an old INR paycheck as whatever currency the staff uses today.
    currency: billedCurrency,
    // The header "Currency:" row is the staff's own home/payroll currency —
    // a distinct concept from the billed currency above (e.g. an INR-paid
    // teacher billed in USD for a specific service still has "INR" as their
    // own payroll currency here).
    staffCurrency,
    icPassport: staff?.PassportNumber || "",
    epfNo: "",
    socsoNo: "",
    taxNo: "",
    earnings: [{ item: service ? lineItemName(service, paycheck.BatchID) : paycheck.ServiceID, quantity: 1, rate: paycheck.Amount, amount: paycheck.Amount, currency: billedCurrency }],
    grossPay: paycheck.Amount,
    deductions: [],
    nettPay: paycheck.Amount,
    employerSocso,
    ...(showConvertedTotal ? { convertedTotal: { currency: "INR", amount: paycheck.INRAmount } } : {}),
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
