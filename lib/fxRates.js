// fawazahmed0/currency-api (free, no API key, no rate limits, historical
// dates built into the URL) — covers ~340 currencies including crypto, so
// effectively every real ISO 4217 code our own Currency dropdown offers
// (unlike Frankfurter's ECB-only 30 currencies, which left most of the
// dropdown unfillable). jsdelivr is the primary CDN, with a pages.dev
// mirror as a fallback if jsdelivr has a bad day.
const SOURCES = [
  (date, from) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${from}.json`,
  (date, from) => `https://${date}.currency-api.pages.dev/v1/currencies/${from}.json`,
];

function cacheKey(currency, year, month) {
  return `${currency}-${year}-${String(month).padStart(2, "0")}`;
}

// The rate as of the 1st of the invoice's/paycheck's own month (not
// "today") — e.g. a July 2026 invoice always uses the Jul 1 2026 rate,
// regardless of when it's actually generated or edited. Cached in
// db.fxRates (persisted like counters) so the same currency+month is only
// ever fetched once, and so historical invoices/paychecks keep using the
// rate that was actually in effect even if fetched long after the fact.
// Returns null (not 0) when a rate genuinely couldn't be found (a currency
// this source doesn't track, or both mirrors are down) — callers leave INR
// Amount at 0 for Management to fill in by hand in that case.
export async function getRateToINR(db, currency, year, month) {
  if (!currency || currency === "INR") return 1;

  db.fxRates = db.fxRates || {};
  const key = cacheKey(currency, year, month);
  if (db.fxRates[key] != null) return db.fxRates[key];

  const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const from = currency.toLowerCase();

  for (const buildUrl of SOURCES) {
    try {
      const res = await fetch(buildUrl(dateStr, from));
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data?.[from]?.inr;
      if (typeof rate !== "number") continue;
      db.fxRates[key] = rate;
      return rate;
    } catch {
      // Try the next mirror; if all fail, fall through to null below.
    }
  }
  return null;
}
