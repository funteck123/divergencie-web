import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawPayslipPDF } from "@/lib/pdfDoc";
import { FIXED_DEPARTMENT } from "@/app/api/users/route";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
// Employer SOCSO Category 1 is ~1.75% of gross wage (statutory table
// simplified to a flat rate here — we don't model the real banded table).
const EMPLOYER_SOCSO_RATE = 0.0175;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const paycheckId = searchParams.get("paycheckId");

  const db = readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

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

  const buffer = await drawPayslipPDF({
    company: "DivergenCIE Coaching",
    period: `END-${MONTH_ABBR[paycheck.Month - 1]}-${paycheck.Year}`,
    emplNo: paycheck.StaffID,
    name: staff?.Name || paycheck.StaffID,
    department,
    role: staff?.Role || "",
    // Final total is shown in the Staff/Teacher/Ambassador's Currency, not
    // the Service's (Service.Currency is only the rate's denomination).
    currency: staff?.Currency || service?.Currency || "INR",
    icPassport: staff?.PassportNumber || "",
    epfNo: "",
    socsoNo: "",
    taxNo: "",
    earnings: [{ item: service?.Name || paycheck.ServiceID, quantity: 1, rate: paycheck.Amount, amount: paycheck.Amount }],
    grossPay: paycheck.Amount,
    deductions: [],
    nettPay: paycheck.Amount,
    employerSocso,
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
