// 24 Nov 2026 (owner): the invoice link in the fee message opens the PDF without a login, and it does not expire.
// A link carries a signature for ONE invoice: the HMAC-SHA256 of the invoice id with the site secret, 43 characters (256 bits). It cannot be guessed or edited,
// and it opens that invoice's PDF and nothing else. Links made earlier with an expiry date ("<expiry>.<signature>") keep working until that date.
import crypto from "crypto";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set, so no invoice link can be made.");
  return s;
}

const sign = (text) => crypto.createHmac("sha256", secret()).update(text).digest("base64url");

/** The token for one invoice. */
export function makeInvoiceShareToken(invoiceId) {
  return { token: sign(`invoice-pdf|${invoiceId}`) };
}

function same(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** True only for a token that was made for exactly this invoice. Never throws: a missing secret, a bad token or another invoice's token is false. */
export function verifyInvoiceShareToken(invoiceId, token, now = Date.now()) {
  try {
    const text = String(token || "");
    if (!invoiceId || !text) return false;
    if (!text.includes(".")) return same(sign(`invoice-pdf|${invoiceId}`), text);
    const [expText, sig] = text.split(".");
    const exp = Number(expText);
    if (!sig || !Number.isInteger(exp) || exp * 1000 < now) return false;
    return same(sign(`invoice-pdf|${invoiceId}|${exp}`).slice(0, 32), sig);
  } catch {
    return false;
  }
}
