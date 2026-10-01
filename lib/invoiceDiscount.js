// Invoice discounts (TKT-0320). Pure functions, no imports, safe on server and client.
//
// Four optional fields on an invoice record (absent means none):
//   DiscountPercent  percentage off the subtotal, 0 to 100
//   CustomDiscount   fixed amount off, in the invoice's own currency, 0 or more
//   CouponCode       text, the code the student used
//   CouponPercent    the coupon's discount as a percentage, 0 to 100
//
// Amount and INRAmount stay the GROSS subtotal (the sum of the line items). The discount reduces
// INRDue, which is what every "due" figure, reminder and Balance Due box already reads. Two
// derived fields are stored: DiscountAmount (invoice currency) and INRDiscount.
//
//   percent part = subtotal x DiscountPercent / 100
//   coupon part  = subtotal x CouponPercent / 100   (both percentages are scaled down together
//                                                    if they add up to more than 100)
//   custom part  = CustomDiscount, never more than what is left after the two parts above
//   total discount = percent part + coupon part + custom part, never more than the subtotal

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));

// The four keys that make up a discount on a record, used to carry it over when a draft is rebuilt.
export const DISCOUNT_KEYS = ["DiscountPercent", "CustomDiscount", "CouponCode", "CouponPercent"];

export function discountBreakdown(invoice) {
  const gross = round2(invoice?.Amount);
  const pct = clamp(invoice?.DiscountPercent, 0, 100);
  const cpct = clamp(invoice?.CouponPercent, 0, 100);
  const scale = pct + cpct > 100 ? 100 / (pct + cpct) : 1;
  const percentAmount = round2((gross * pct * scale) / 100);
  const couponAmount = round2((gross * cpct * scale) / 100);
  const customAmount = round2(Math.min(Math.max(0, Number(invoice?.CustomDiscount) || 0), Math.max(0, gross - percentAmount - couponAmount)));
  const total = round2(percentAmount + couponAmount + customAmount);
  return { gross, percentAmount, couponAmount, customAmount, total, net: round2(gross - total) };
}

// Recomputes DiscountAmount / INRDiscount from the invoice's current subtotal and discount fields,
// and moves INRDue by the change in INRDiscount, so partial payments already recorded in INRDue are
// kept. Safe to call any number of times: with nothing changed it does nothing, and an invoice that
// never had a discount is left untouched.
export function applyInvoiceDiscount(invoice) {
  const d = discountBreakdown(invoice);
  const oldINR = round2(invoice.INRDiscount);
  if (d.total === 0 && oldINR === 0 && !invoice.DiscountAmount) return d;
  const inrGross = round2(invoice.INRAmount);
  const inrDiscount = d.total === 0 || d.gross === 0 ? 0 : round2((d.total * inrGross) / d.gross);
  invoice.DiscountAmount = d.total;
  invoice.INRDiscount = inrDiscount;
  if (inrDiscount !== oldINR) invoice.INRDue = Math.max(0, round2((Number(invoice.INRDue) || 0) + oldINR - inrDiscount));
  return d;
}

// "" and null clear a number (treated as 0).
const num = (v) => (v === "" || v === null ? 0 : Number(v));

// Returns an error message, or null when every supplied field is valid. Only supplied fields are checked.
export function validateDiscountInput({ discountPercent, customDiscount, couponCode, couponPercent }) {
  for (const [label, v] of [["discountPercent", discountPercent], ["couponPercent", couponPercent]]) {
    if (v === undefined) continue;
    const n = num(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return `${label} must be a number from 0 to 100.`;
  }
  if (customDiscount !== undefined) {
    const n = num(customDiscount);
    if (!Number.isFinite(n) || n < 0 || n > 1e9) return "customDiscount must be 0 or more.";
  }
  if (couponCode !== undefined && couponCode !== null && String(couponCode).trim().length > 40) return "couponCode must be 40 characters or fewer.";
  return null;
}

// Copies the supplied discount fields onto the invoice (the caller validates first).
export function setDiscountFields(invoice, { discountPercent, customDiscount, couponCode, couponPercent }) {
  if (discountPercent !== undefined) invoice.DiscountPercent = round2(num(discountPercent));
  if (customDiscount !== undefined) invoice.CustomDiscount = round2(num(customDiscount));
  if (couponCode !== undefined) invoice.CouponCode = String(couponCode ?? "").trim();
  if (couponPercent !== undefined) invoice.CouponPercent = round2(num(couponPercent));
}

// Rows for the PDF summary block: [label, value]. `currency` is the label prefix, `scale` converts
// invoice-currency amounts to the displayed currency (1 when they are the same).
export function discountSummaryRows(invoice, currency, scale = 1) {
  const d = discountBreakdown(invoice);
  if (d.total <= 0) return null;
  const money = (n) => `${currency} ${round2(n * scale).toFixed(2)}`;
  const rows = [["Subtotal:", money(d.gross)]];
  if (d.percentAmount > 0) rows.push([`Discount (${round2(invoice.DiscountPercent)}%):`, `-${money(d.percentAmount)}`]);
  if (d.couponAmount > 0) rows.push([`Coupon ${String(invoice.CouponCode || "").trim()} (${round2(invoice.CouponPercent)}%):`.replace("Coupon  ", "Coupon "), `-${money(d.couponAmount)}`]);
  if (d.customAmount > 0) rows.push(["Custom discount:", `-${money(d.customAmount)}`]);
  return rows;
}
