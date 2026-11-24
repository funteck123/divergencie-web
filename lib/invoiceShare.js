// 24 Nov 2026 (owner): the invoice link in the fee message must open the PDF without a login. A link carries a signed, expiring token for ONE invoice:
// it opens that invoice's PDF and nothing else. The token is an HMAC of the invoice id and the expiry with the site's secret, so it cannot be guessed or edited.
import crypto from "crypto";

const DEFAULT_DAYS = 60, MAX_DAYS = 180;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set, so no invoice link can be made.");
  return s;
}

function signature(invoiceId, exp) {
  return crypto.createHmac("sha256", secret()).update(`invoice-pdf|${invoiceId}|${exp}`).digest("base64url").slice(0, 32);
}

/** A token for one invoice, valid for `days` days (1 to 180, default 60). */
export function makeInvoiceShareToken(invoiceId, days = DEFAULT_DAYS, now = Date.now()) {
  const d = Math.min(MAX_DAYS, Math.max(1, Math.floor(Number(days) || DEFAULT_DAYS)));
  const exp = Math.floor(now / 1000) + d * 86400;
  return { token: `${exp}.${signature(invoiceId, exp)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

/** True only for an unexpired token that was made for exactly this invoice. Never throws: a missing secret, a bad token or another invoice's token is false. */
export function verifyInvoiceShareToken(invoiceId, token, now = Date.now()) {
  try {
    const [expText, sig] = String(token || "").split(".");
    const exp = Number(expText);
    if (!invoiceId || !sig || !Number.isInteger(exp) || exp * 1000 < now) return false;
    const want = Buffer.from(signature(invoiceId, exp)), got = Buffer.from(sig);
    return want.length === got.length && crypto.timingSafeEqual(want, got);
  } catch {
    return false;
  }
}
