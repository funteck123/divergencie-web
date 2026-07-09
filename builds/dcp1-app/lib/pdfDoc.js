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
