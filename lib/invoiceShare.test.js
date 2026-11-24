import test from "node:test";
import assert from "node:assert/strict";
import { makeInvoiceShareToken, verifyInvoiceShareToken } from "./invoiceShare.js";

process.env.SESSION_SECRET = "test-secret-for-invoice-links";
const T0 = Date.parse("2026-11-24T00:00:00Z");

test("a token opens its own invoice until it expires", () => {
  const { token, expiresAt } = makeInvoiceShareToken("INV-0116", 60, T0);
  assert.equal(expiresAt, "2027-01-23T00:00:00.000Z");
  assert.equal(verifyInvoiceShareToken("INV-0116", token, T0 + 1000), true);
  assert.equal(verifyInvoiceShareToken("INV-0116", token, T0 + 59 * 86400 * 1000), true);
  assert.equal(verifyInvoiceShareToken("INV-0116", token, T0 + 61 * 86400 * 1000), false);
});
test("a token does not open another invoice, and an edited token fails", () => {
  const { token } = makeInvoiceShareToken("INV-0116", 60, T0);
  assert.equal(verifyInvoiceShareToken("INV-0117", token, T0), false);
  const [exp, sig] = token.split(".");
  assert.equal(verifyInvoiceShareToken("INV-0116", `${Number(exp) + 86400 * 365}.${sig}`, T0), false);
  assert.equal(verifyInvoiceShareToken("INV-0116", `${exp}.${sig.slice(0, -1)}x`, T0), false);
});
test("empty, garbage and missing values are false, never an error", () => {
  for (const bad of [undefined, null, "", "abc", "1.2", ".", "x.y"]) assert.equal(verifyInvoiceShareToken("INV-0116", bad, T0), false);
  assert.equal(verifyInvoiceShareToken("", "1.2", T0), false);
});
test("the number of days is limited to 1 to 180", () => {
  assert.equal(makeInvoiceShareToken("A", 9999, T0).expiresAt, new Date(T0 + 180 * 86400 * 1000).toISOString());
  assert.equal(makeInvoiceShareToken("A", 0, T0).expiresAt, new Date(T0 + 60 * 86400 * 1000).toISOString());
  assert.equal(makeInvoiceShareToken("A", -5, T0).expiresAt, new Date(T0 + 86400 * 1000).toISOString());
});
test("without the secret nothing verifies", () => {
  const { token } = makeInvoiceShareToken("INV-0116", 60, T0);
  const keep = process.env.SESSION_SECRET; delete process.env.SESSION_SECRET;
  assert.equal(verifyInvoiceShareToken("INV-0116", token, T0), false);
  assert.throws(() => makeInvoiceShareToken("INV-0116"));
  process.env.SESSION_SECRET = keep;
});
