import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { drawPayslipPDF } from "@/lib/pdfDoc";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const paycheckId = searchParams.get("paycheckId");

  const db = readDB();
  const paycheck = db.paychecks.find((p) => p.PaycheckID === paycheckId);
  if (!paycheck) return NextResponse.json({ error: "Paycheck not found." }, { status: 404 });

  const staff = db.users.find((u) => u.UserID === paycheck.StaffID);
  const service = db.services.find((s) => s.ServiceID === paycheck.ServiceID);

  // YTD Gross = sum of this staff's paychecks in the same year, through the
  // month of this payslip — the other statutory YTD lines (EPF/SOCSO/EIS/
  // PCB) stay 0.00 since we don't collect those figures.
  const ytdGross = db.paychecks
    .filter((p) => p.StaffID === paycheck.StaffID && p.Year === paycheck.Year && p.Month <= paycheck.Month)
    .reduce((sum, p) => sum + (Number(p.Amount) || 0), 0);

  const buffer = await drawPayslipPDF({
    company: "DivergenCIE Coaching",
    period: `END-${MONTH_ABBR[paycheck.Month - 1]}-${paycheck.Year}`,
    emplNo: paycheck.StaffID,
    name: staff?.Name || paycheck.StaffID,
    department: staff?.Department || staff?.StaffRole || "",
    icPassport: "",
    epfNo: "",
    socsoNo: "",
    taxNo: "",
    earnings: [{ label: service?.Name || paycheck.ServiceID, rate: "", amount: paycheck.Amount }],
    grossPay: paycheck.Amount,
    deductions: [],
    nettPay: paycheck.Amount,
    ytd: [
      { label: "YTD Basic", value: 0 },
      { label: "YTD Gross", value: ytdGross },
      { label: "YTD Employee EPF", value: 0 },
      { label: "YTD Employer EPF", value: 0 },
      { label: "YTD Employee SOCSO", value: 0 },
      { label: "YTD Employer SOCSO", value: 0 },
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
