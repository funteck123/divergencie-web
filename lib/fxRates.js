// Currencies Frankfurter (ECB reference rates, free/no API key) actually
// covers — our own Currency dropdown lists every active ISO 4217 currency,
// which is far broader, so plenty of real currencies simply have no rate
// source here and INR Amount is left for Management to fill in by hand,
// same as before this feature existed.
const SUPPORTED = new Set([
  "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
  "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK",
  "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
]);

function cacheKey(currency, year, month) {
  return `${currency}-${year}-${String(month).padStart(2, "0")}`;
}

// The rate as of the 1st of the invoice's/paycheck's own month (not
// "today") — e.g. a July 2026 invoice always uses the Jul 1 2026 rate,
// regardless of when it's actually generated or edited. Cached in
// db.fxRates (persisted like counters) so the same currency+month is only
// ever fetched once, and so historical invoices/paychecks keep using the
// rate that was actually in effect even if fetched long after the fact.
// Returns null (not 0) when there's no rate to auto-fill, so callers can
// tell "genuinely zero" apart from "couldn't determine a rate" and leave
// INR Amount for Management to enter manually, same as before this existed.
export async function getRateToINR(db, currency, year, month) {
  if (!currency || currency === "INR") return 1;
  if (!SUPPORTED.has(currency)) return null;

  db.fxRates = db.fxRates || {};
  const key = cacheKey(currency, year, month);
  if (db.fxRates[key] != null) return db.fxRates[key];

  const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  try {
    const res = await fetch(`https://api.frankfurter.app/${dateStr}?from=${currency}&to=INR`);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.INR;
    if (typeof rate !== "number") return null;
    db.fxRates[key] = rate;
    return rate;
  } catch {
    // Network hiccup, API down, etc. — never block invoice/paycheck
    // creation over this; INR Amount just stays unfilled.
    return null;
  }
}
