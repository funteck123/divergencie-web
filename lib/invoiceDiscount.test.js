import test from "node:test";
import assert from "node:assert/strict";
import { discountBreakdown, applyInvoiceDiscount, validateDiscountInput, setDiscountFields, discountSummaryRows } from "./invoiceDiscount.js";

const inv = (extra = {}) => ({ Currency: "SAR", Amount: 1000, INRAmount: 25000, INRDue: 25000, ...extra });

test("an invoice with no discount is left exactly as it was", () => {
  const i = inv();
  const before = JSON.stringify(i);
  applyInvoiceDiscount(i);
  assert.equal(JSON.stringify(i), before);
});

test("percent, coupon and custom parts add up and never exceed the subtotal", () => {
  const d = discountBreakdown(inv({ DiscountPercent: 10, CouponPercent: 5, CustomDiscount: 50 }));
  assert.deepEqual(d, { gross: 1000, percentAmount: 100, couponAmount: 50, customAmount: 50, total: 200, net: 800 });
  const over = discountBreakdown(inv({ DiscountPercent: 80, CouponPercent: 80, CustomDiscount: 500 }));
  assert.equal(over.total, 1000);
  assert.equal(over.net, 0);
  const customOnly = discountBreakdown(inv({ CustomDiscount: 5000 }));
  assert.equal(customOnly.customAmount, 1000);
});

test("the discount lowers INRDue, keeps recorded payments, and is idempotent", () => {
  const i = inv({ INRDue: 15000 }); // 10000 INR already paid
  i.DiscountPercent = 10;
  applyInvoiceDiscount(i);
  assert.equal(i.DiscountAmount, 100);
  assert.equal(i.INRDiscount, 2500);
  assert.equal(i.INRDue, 12500);
  applyInvoiceDiscount(i);
  assert.equal(i.INRDue, 12500);
  // Raising the discount lowers the due again; removing it puts the amount back.
  i.CustomDiscount = 100;
  applyInvoiceDiscount(i);
  assert.equal(i.INRDue, 10000);
  i.DiscountPercent = 0;
  i.CustomDiscount = 0;
  applyInvoiceDiscount(i);
  assert.equal(i.INRDiscount, 0);
  assert.equal(i.INRDue, 15000);
});

test("INRDue never goes below zero", () => {
  const i = inv({ INRDue: 1000, DiscountPercent: 100 });
  applyInvoiceDiscount(i);
  assert.equal(i.INRDue, 0);
});

test("when the subtotal changes the discount follows it", () => {
  const i = inv({ DiscountPercent: 10 });
  applyInvoiceDiscount(i);
  assert.equal(i.INRDue, 22500);
  // a line item adds 500 SAR (12500 INR): the caller raises Amount, INRAmount and INRDue first
  i.Amount = 1500; i.INRAmount = 37500; i.INRDue += 12500;
  applyInvoiceDiscount(i);
  assert.equal(i.DiscountAmount, 150);
  assert.equal(i.INRDiscount, 3750);
  assert.equal(i.INRDue, 33750);
});

test("INR invoices discount one to one", () => {
  const i = { Currency: "INR", Amount: 6000, INRAmount: 6000, INRDue: 6000, CustomDiscount: 500 };
  applyInvoiceDiscount(i);
  assert.equal(i.INRDue, 5500);
});

test("validation", () => {
  assert.equal(validateDiscountInput({}), null);
  assert.equal(validateDiscountInput({ discountPercent: "", customDiscount: "", couponPercent: 0, couponCode: "" }), null);
  assert.match(validateDiscountInput({ discountPercent: 101 }), /0 to 100/);
  assert.match(validateDiscountInput({ couponPercent: -1 }), /0 to 100/);
  assert.match(validateDiscountInput({ customDiscount: -5 }), /0 or more/);
  assert.match(validateDiscountInput({ discountPercent: "abc" }), /0 to 100/);
  assert.match(validateDiscountInput({ couponCode: "x".repeat(41) }), /40/);
});

test("fields are stored as numbers, and blank clears them", () => {
  const i = inv();
  setDiscountFields(i, { discountPercent: "12.5", customDiscount: "30", couponCode: "  SAVE10 ", couponPercent: "5" });
  assert.deepEqual([i.DiscountPercent, i.CustomDiscount, i.CouponCode, i.CouponPercent], [12.5, 30, "SAVE10", 5]);
  setDiscountFields(i, { discountPercent: "", couponCode: "" });
  assert.deepEqual([i.DiscountPercent, i.CouponCode], [0, ""]);
});

test("PDF rows list subtotal and each discount, or nothing when there is none", () => {
  assert.equal(discountSummaryRows(inv(), "SAR"), null);
  const rows = discountSummaryRows(inv({ DiscountPercent: 10, CouponCode: "SAVE5", CouponPercent: 5, CustomDiscount: 50 }), "SAR");
  assert.deepEqual(rows, [["Subtotal:", "SAR 1000.00"], ["Discount (10%):", "-SAR 100.00"], ["Coupon SAVE5 (5%):", "-SAR 50.00"], ["Custom discount:", "-SAR 50.00"]]);
});
