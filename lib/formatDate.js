// App-wide date display standard (TKT-0007): DD/MM/YYYY, 24-hour time
// where a time is shown alongside. Display only — every actual date INPUT
// in the app is a native <input type="date">, which is always internally
// "yyyy-mm-dd" regardless of what's shown on screen, so nothing here
// touches how dates are stored, submitted, or read back.
//
// Accepts a Date, an ISO/"yyyy-mm-dd" string, or anything `new Date()` can
// parse. Returns "—" for anything that doesn't parse to a valid date,
// same "never show garbage" convention the rest of the app already uses
// for missing values.
function toDate(input) {
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(input) {
  const d = toDate(input);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatDateTime(input) {
  const d = toDate(input);
  if (!d) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${min}`;
}

// TKT-0279: short weekday name for a "yyyy-mm-dd" ScheduleItem Date, so the
// schedule table doesn't force the reader to work out the day themselves.
// Parses the "yyyy-mm-dd" string as a plain calendar date (not a UTC
// instant) -- new Date("yyyy-mm-dd") parses as UTC midnight, which
// getDay()/toLocaleDateString would then read back in the browser's local
// timezone, silently naming the wrong weekday for any viewer west of UTC.
export function formatDay(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
  }
  const d = toDate(input);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
