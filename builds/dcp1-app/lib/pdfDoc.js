import path from "path";
import { createCanvas, loadImage, registerFont } from "canvas";

// Matches the layout in planning/invoice generator/DC Invoice B18 Howard
// 2025 Nov.pdf (A4, 595x842pt) — logo top-left, title top-right, brown/tan
// accent palette, a fixed-height item table padded with blank rows, and a
// Terms paragraph at the bottom. Reused for both Invoices (Student) and
// Paychecks (Teacher/Staff) via one parameterized drawDocumentPDF().

const ASSETS_DIR = path.join(process.cwd(), "lib", "schedule-image", "assets");
const FONT_PATH = path.join(ASSETS_DIR, "Roboto.ttf");
const FONT_BOLD_PATH = path.join(ASSETS_DIR, "Roboto.ttf");
registerFont(FONT_PATH, { family: "Roboto" });
registerFont(FONT_BOLD_PATH, { family: "Roboto", weight: "bold" });

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_L = 42;
const MARGIN_R = 553;

const BROWN = "#8B5E34";
const BROWN_DARK = "#5C4326";
const TAN = "#DCC9A6";
const BORDER = "#8B5E34";
const TABLE_ROWS = 10;

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function rightText(ctx, text, x, y) {
  ctx.textAlign = "right";
  ctx.fillText(text, x, y);
}

// data: {
//   docType: "Invoice" | "Paycheck", docNumber, issueDate: Date, dueDate: Date,
//   paymentTerms, companyLine, partyLabel, partyName, secondaryLabel, secondaryValue,
//   balanceLabel, currency, balance,
//   lineItems: [{ item, quantity, rate, amount }],
//   taxPercent, discountPercent, total, terms
// }
export async function drawDocumentPDF(data) {
  const canvas = createCanvas(PAGE_W, PAGE_H, "pdf");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Logo
  try {
    const logo = await loadImage(path.join(ASSETS_DIR, "logo.png"));
    const logoW = 92;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, MARGIN_L, 34, logoW, logoH);
  } catch {
    // logo optional — document still renders without it
  }

  // Title + doc number, top-right
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BROWN;
  ctx.font = "bold 34px Roboto";
  rightText(ctx, data.docType, MARGIN_R, 66);
  ctx.font = "10px Roboto";
  rightText(ctx, data.docNumber, MARGIN_R, 82);

  // Date / Payment Terms / Due Date block, right-aligned
  ctx.font = "10px Roboto";
  const metaRows = [
    ["Date:", fmtDate(data.issueDate)],
    ["Payment Terms:", data.paymentTerms],
    ["Due Date:", fmtDate(data.dueDate)],
  ];
  let my = 112;
  for (const [label, value] of metaRows) {
    ctx.fillStyle = BROWN_DARK;
    rightText(ctx, label, MARGIN_R - 90, my);
    ctx.fillStyle = "#333333";
    rightText(ctx, value, MARGIN_R, my);
    my += 16;
  }

  // Company line + Balance Due box
  const rowY = 168;
  ctx.fillStyle = "#222222";
  ctx.font = "13px Roboto";
  ctx.textAlign = "left";
  ctx.fillText(data.companyLine, MARGIN_L, rowY);

  const boxW = 190;
  const boxH = 26;
  const boxX = MARGIN_R - boxW;
  const boxY = rowY - 18;
  ctx.fillStyle = TAN;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = BROWN_DARK;
  ctx.font = "10px Roboto";
  ctx.textAlign = "left";
  ctx.fillText(data.balanceLabel, boxX + 8, boxY + 17);
  ctx.font = "bold 13px Roboto";
  ctx.textAlign = "right";
  ctx.fillText(`${data.currency} ${Number(data.balance).toFixed(2)}`, boxX + boxW - 8, boxY + 18);

  // Party / secondary name block
  const partyY = 210;
  ctx.fillStyle = BROWN_DARK;
  ctx.font = "10px Roboto";
  ctx.textAlign = "left";
  ctx.fillText(`${data.partyLabel}:`, MARGIN_L, partyY);
  ctx.fillText(`${data.secondaryLabel}:`, MARGIN_L + 160, partyY);
  ctx.fillStyle = "#222222";
  ctx.font = "11px Roboto";
  ctx.fillText(data.partyName, MARGIN_L, partyY + 18);
  ctx.fillText(data.secondaryValue, MARGIN_L + 160, partyY + 18);

  // Item table
  const tableTop = 254;
  const tableLeft = MARGIN_L;
  const tableRight = MARGIN_R;
  const colX = {
    sno: tableLeft,
    item: tableLeft + 40,
    qty: tableLeft + 288,
    rate: tableLeft + 368,
    amount: tableLeft + 438,
  };
  const rowH = 24;
  const headerH = 22;

  ctx.fillStyle = TAN;
  ctx.fillRect(tableLeft, tableTop, tableRight - tableLeft, headerH);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(tableLeft, tableTop, tableRight - tableLeft, headerH);

  ctx.fillStyle = BROWN_DARK;
  ctx.font = "bold 10px Roboto";
  ctx.textAlign = "left";
  ctx.fillText("S. No.", colX.sno + 6, tableTop + 15);
  ctx.fillText("Item", colX.item + 6, tableTop + 15);
  ctx.textAlign = "right";
  ctx.fillText("Quantity", colX.rate - 8, tableTop + 15);
  ctx.fillText("Rate", colX.amount - 8, tableTop + 15);
  ctx.fillText("Amount", tableRight - 6, tableTop + 15);

  let y = tableTop + headerH;
  for (let i = 0; i < TABLE_ROWS; i++) {
    const item = data.lineItems[i];
    ctx.strokeStyle = BORDER;
    ctx.strokeRect(tableLeft, y, tableRight - tableLeft, rowH);
    if (item) {
      ctx.fillStyle = "#222222";
      ctx.font = "10px Roboto";
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), colX.sno + 6, y + 16);
      ctx.fillText(item.item, colX.item + 6, y + 16);
      ctx.textAlign = "right";
      ctx.fillText(String(item.quantity), colX.rate - 8, y + 16);
      ctx.fillText(Number(item.rate).toFixed(2), colX.amount - 8, y + 16);
      ctx.fillText(Number(item.amount).toFixed(2), tableRight - 6, y + 16);
    }
    y += rowH;
  }

  // Tax / Discount / Total
  let sy = y + 30;
  ctx.font = "10px Roboto";
  const summaryRows = [
    ["Tax:", `${data.taxPercent}%`],
    ["Discount:", `${data.discountPercent}%`],
  ];
  for (const [label, value] of summaryRows) {
    ctx.fillStyle = BROWN_DARK;
    rightText(ctx, label, MARGIN_R - 90, sy);
    ctx.fillStyle = "#333333";
    rightText(ctx, value, MARGIN_R, sy);
    sy += 16;
  }
  ctx.fillStyle = BROWN_DARK;
  ctx.font = "bold 10px Roboto";
  rightText(ctx, "Total:", MARGIN_R - 90, sy);
  ctx.fillStyle = "#222222";
  rightText(ctx, Number(data.total).toFixed(2), MARGIN_R, sy);

  // Terms block
  const termsY = 700;
  ctx.fillStyle = BROWN_DARK;
  ctx.font = "9px Roboto";
  ctx.textAlign = "left";
  ctx.fillText("Terms:", MARGIN_L, termsY);
  const words = data.terms.split(" ");
  const maxWidth = MARGIN_R - MARGIN_L;
  let line = "";
  let ty = termsY + 14;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, MARGIN_L, ty);
      line = word;
      ty += 12;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, MARGIN_L, ty);

  return canvas.toBuffer("application/pdf");
}

// Matches the layout in planning/payslip generator/A0271.2026-02-End Month
// .Payslip.PDF — a plain boxed key/value header, a gray section-bar table
// for the current month's Earnings/Deductions, and a second boxed table for
// Year-To-Date figures. Unlike drawDocumentPDF (branded invoice look), this
// is a flat statutory-payslip style with no logo/color accents. The
// Earnings/Deductions line-item columns (S.No/Item/Quantity/Rate/Amount)
// mirror drawDocumentPDF's item table so the two documents stay symmetrical
// even though their visual styles differ.
//
// data: {
//   company, period, emplNo, name, department, role, icPassport, epfNo, socsoNo, taxNo,
//   earnings: [{ item, quantity, rate, amount }], grossPay,
//   deductions: [{ item, quantity, rate, amount }], nettPay,
//   employerSocso,
//   ytd: [{ label, value }],
// }
const PS_GRAY = "#C7C7C7";
const PS_GRAY_LIGHT = "#E4E4E4";
const PS_BORDER = "#999999";
const PS_TEXT = "#000000";
const PS_TABLE_W = MARGIN_R - MARGIN_L;

function psRow(ctx, x, y, w, h, fill) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = PS_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export async function drawPayslipPDF(data) {
  const canvas = createCanvas(PAGE_W, PAGE_H, "pdf");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PS_TEXT;

  // Header key/value box
  const headerRows = [
    ["Company:", data.company],
    ["Period:", data.period],
    ["Empl No.:", data.emplNo],
    ["Name:", data.name],
    ["Department:", data.department],
    ["Role:", data.role],
    ["IC/Passport:", data.icPassport],
    ["EPF No.:", data.epfNo],
    ["SOCSO No.:", data.socsoNo],
    ["TAX No.:", data.taxNo],
  ];
  const headerRowH = 16;
  const headerTop = 40;
  const headerH = headerRows.length * headerRowH;
  psRow(ctx, MARGIN_L, headerTop, PS_TABLE_W, headerH, PS_GRAY_LIGHT);
  ctx.fillStyle = PS_TEXT;
  ctx.font = "10px Roboto";
  ctx.textAlign = "left";
  let hy = headerTop + 12;
  for (const [label, value] of headerRows) {
    ctx.font = "bold 10px Roboto";
    ctx.fillText(label, MARGIN_L + 8, hy);
    ctx.font = "10px Roboto";
    ctx.fillText(value || "", MARGIN_L + 140, hy);
    hy += headerRowH;
  }

  // CURRENT MONTH PAYROLL DETAIL
  let y = headerTop + headerH + 24;
  const sectionH = 20;
  psRow(ctx, MARGIN_L, y, PS_TABLE_W, sectionH, PS_GRAY);
  ctx.fillStyle = PS_TEXT;
  ctx.font = "bold 11px Roboto";
  ctx.textAlign = "center";
  ctx.fillText("CURRENT MONTH PAYROLL DETAIL", MARGIN_L + PS_TABLE_W / 2, y + 14);
  y += sectionH;

  const colSno = MARGIN_L + 8;
  const colItem = MARGIN_L + 46;
  const colQty = MARGIN_R - 170;
  const colRate = MARGIN_R - 100;
  const colAmount = MARGIN_R - 8;
  const lineH = 16;

  function payrollTable(title, rows, totalLabel, totalValue) {
    const headH = 16;
    psRow(ctx, MARGIN_L, y, PS_TABLE_W, headH, PS_GRAY_LIGHT);
    ctx.fillStyle = PS_TEXT;
    ctx.font = "bold 9px Roboto";
    ctx.textAlign = "left";
    ctx.fillText(title, MARGIN_L + 8, y + 11);
    y += headH;

    const colHeadH = 14;
    psRow(ctx, MARGIN_L, y, PS_TABLE_W, colHeadH, null);
    ctx.fillStyle = PS_TEXT;
    ctx.font = "bold 8px Roboto";
    ctx.textAlign = "left";
    ctx.fillText("S.No.", colSno, y + 10);
    ctx.fillText("Item", colItem, y + 10);
    ctx.textAlign = "right";
    ctx.fillText("Quantity", colQty, y + 10);
    ctx.fillText("Rate", colRate, y + 10);
    ctx.fillText("Amount", colAmount, y + 10);
    y += colHeadH;

    rows.forEach((r, i) => {
      psRow(ctx, MARGIN_L, y, PS_TABLE_W, lineH, null);
      ctx.fillStyle = PS_TEXT;
      ctx.font = "9px Roboto";
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), colSno, y + 12);
      ctx.fillText(r.item, colItem, y + 12);
      ctx.textAlign = "right";
      ctx.fillText(String(r.quantity ?? 1), colQty, y + 12);
      ctx.fillText(Number(r.rate).toFixed(2), colRate, y + 12);
      ctx.fillText(Number(r.amount).toFixed(2), colAmount, y + 12);
      y += lineH;
    });
    if (rows.length === 0) {
      psRow(ctx, MARGIN_L, y, PS_TABLE_W, lineH, null);
      ctx.font = "9px Roboto";
      ctx.textAlign = "left";
      ctx.fillStyle = "#777777";
      ctx.fillText("—", colSno, y + 12);
      y += lineH;
    }

    psRow(ctx, MARGIN_L, y, PS_TABLE_W, lineH, PS_GRAY_LIGHT);
    ctx.fillStyle = PS_TEXT;
    ctx.font = "bold 10px Roboto";
    ctx.textAlign = "left";
    ctx.fillText(totalLabel, MARGIN_L + 8, y + 12);
    ctx.textAlign = "right";
    ctx.fillText(Number(totalValue).toFixed(2), colAmount, y + 12);
    y += lineH;
  }

  payrollTable("EARNINGS", data.earnings, "GROSS PAY", data.grossPay);
  y += 4;
  payrollTable("DEDUCTIONS", data.deductions, "NETT PAY", data.nettPay);

  // Employer SOCSO — auto-calculated (1.75% of Gross Pay), sits right below
  // Nett Pay same as the reference payslip. Everything else identity-wise
  // (IC/EPF/SOCSO No./TAX No.) stays blank since we don't collect it.
  psRow(ctx, MARGIN_L, y, PS_TABLE_W, lineH, null);
  ctx.fillStyle = PS_TEXT;
  ctx.font = "9px Roboto";
  ctx.textAlign = "left";
  ctx.fillText("Employer SOCSO", MARGIN_L + 8, y + 12);
  ctx.textAlign = "right";
  ctx.fillText(Number(data.employerSocso).toFixed(2), colAmount, y + 12);
  y += lineH;

  // YEAR-TO-DATE PAYROLL DETAIL
  y += 24;
  psRow(ctx, MARGIN_L, y, PS_TABLE_W, sectionH, PS_GRAY);
  ctx.fillStyle = PS_TEXT;
  ctx.font = "bold 11px Roboto";
  ctx.textAlign = "center";
  ctx.fillText("YEAR-TO-DATE PAYROLL DETAIL", MARGIN_L + PS_TABLE_W / 2, y + 14);
  y += sectionH;

  const ytdRowH = 16;
  for (const { label, value } of data.ytd) {
    psRow(ctx, MARGIN_L, y, PS_TABLE_W, ytdRowH, PS_GRAY_LIGHT);
    ctx.fillStyle = PS_TEXT;
    ctx.font = "10px Roboto";
    ctx.textAlign = "left";
    ctx.fillText(label, MARGIN_L + 8, y + 12);
    ctx.textAlign = "right";
    ctx.fillText(Number(value).toFixed(2), colAmount, y + 12);
    y += ytdRowH;
  }

  return canvas.toBuffer("application/pdf");
}
