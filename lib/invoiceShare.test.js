import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { makeInvoiceShareToken, verifyInvoiceShareToken } from "./invoiceShare.js";

process.env.SESSION_SECRET = "test-secret-for-invoice-links";

test("a token opens its own invoice and does not expire", () => {
  const { token } = makeInvoiceShareToken("INV-0116");
  assert.equal(token.length, 43);
  assert.equal(verifyInvoiceShareToken("INV-0116", token), true);
  assert.equal(verifyInvoiceShareToken("INV-0116", token, Date.now() + 20 * 365 * 86400 * 1000), true);
});
test("a token does not open another invoice, and an edited token fails", () => {
  const { token } = makeInvoiceShareToken("INV-0116");
  assert.equal(verifyInvoiceShareToken("INV-0117", token), false);
  assert.equal(verifyInvoiceShareToken("INV-0116", token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")), false);
  assert.equal(verifyInvoiceShareToken("INV-0116", token.slice(1)), false);
});
test("the tokens of different invoices differ", () => {
  assert.notEqual(makeInvoiceShareToken("INV-0116").token, makeInvoiceShareToken("INV-0117").token);
});
test("empty, garbage and missing values are false, never an error", () => {
  for (const bad of [undefined, null, "", "abc", "1.2", ".", "x.y"]) assert.equal(verifyInvoiceShareToken("INV-0116", bad), false);
  assert.equal(verifyInvoiceShareToken("", "abc"), false);
});
test("a link made earlier with an expiry date works until that date and not after", () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sig = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(`invoice-pdf|INV-0116|${exp}`).digest("base64url").slice(0, 32);
  assert.equal(verifyInvoiceShareToken("INV-0116", `${exp}.${sig}`), true);
  assert.equal(verifyInvoiceShareToken("INV-0116", `${exp}.${sig}`, Date.now() + 2 * 3600 * 1000), false);
  assert.equal(verifyInvoiceShareToken("INV-0117", `${exp}.${sig}`), false);
});
test("without the secret nothing verifies", () => {
  const { token } = makeInvoiceShareToken("INV-0116");
  const keep = process.env.SESSION_SECRET; delete process.env.SESSION_SECRET;
  assert.equal(verifyInvoiceShareToken("INV-0116", token), false);
  assert.throws(() => makeInvoiceShareToken("INV-0116"));
  process.env.SESSION_SECRET = keep;
});
