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

// Converts an invoice's/paycheck's total to an arbitrary target currency
// (e.g. the viewing Student/Staff's own profile Currency, which may differ
// from both the record's own Currency AND from INR) — pivots through the
// record's own already-frozen INRAmount rather than re-deriving the
// from-side rate, and only ever fetches live for the to-side. Returns null
// if that lookup fails (unsupported currency, or both mirrors down), same
// convention as getRateToINR itself.
export async function convertRecordTotal(db, record, toCurrency) {
  const target = toCurrency || "INR";
  const recordCurrency = record.Currency || "INR";
  if (target === recordCurrency) return Number(record.Amount) || 0;
  if (target === "INR") return Number(record.INRAmount) || 0;

  const rateToINR = await getRateToINR(db, target, record.Year, record.Month);
  if (rateToINR == null) return null;
  const inrAmount = Number(record.INRAmount) || 0;
  return Math.round((inrAmount / rateToINR) * 100) / 100;
}

// Converts an already-INR-denominated figure (INRDue is always manually
// entered in INR, regardless of the record's own billed Currency) into an
// arbitrary target currency — used for the dashboard's "Total Due
// (<viewer's currency>)" column, a companion to Amount Due (same balance,
// shown in the record's own currency instead). Returns null if the target
// rate can't be resolved, same convention as getRateToINR/convertRecordTotal.
export async function convertINRAmount(db, inrAmount, toCurrency, year, month) {
  const target = toCurrency || "INR";
  const amount = Number(inrAmount) || 0;
  if (target === "INR") return amount;

  const rateToINR = await getRateToINR(db, target, year, month);
  if (rateToINR == null) return null;
  return Math.round((amount / rateToINR) * 100) / 100;
}
