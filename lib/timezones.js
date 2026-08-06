// Every IANA timezone the runtime knows about, grouped so the common ones
// for this school (UK, India, Saudi, Pakistan, UAE) sort first in any
// dropdown built from TIMEZONE_GROUPS. Legacy Timezone values ("India",
// "Saudi") predate this and are normalized on read via normalizeTimezone.

const COMMON = [
  { value: "Europe/London", label: "UK" },
  { value: "Asia/Kolkata", label: "India" },
  { value: "Asia/Riyadh", label: "Saudi" },
  { value: "Asia/Karachi", label: "Pakistan" },
  { value: "Asia/Dubai", label: "UAE" },
];
const COMMON_VALUES = new Set(COMMON.map((c) => c.value));

function friendlyLabel(id) {
  return id.replace(/_/g, " ");
}

const ALL_TIMEZONE_IDS = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

const OTHERS = ALL_TIMEZONE_IDS.filter((id) => !COMMON_VALUES.has(id))
  .sort()
  .map((id) => ({ value: id, label: friendlyLabel(id) }));

export const TIMEZONE_GROUPS = [
  { label: "Common", options: COMMON },
  { label: "All timezones", options: OTHERS },
];

const VALID_TIMEZONES = new Set([...COMMON_VALUES, ...OTHERS.map((o) => o.value)]);

const LEGACY_TIMEZONES = { India: "Asia/Kolkata", Saudi: "Asia/Riyadh" };

export function isValidTimezone(tz) {
  return VALID_TIMEZONES.has(tz);
}

export function normalizeTimezone(tz) {
  return LEGACY_TIMEZONES[tz] || tz || "Asia/Kolkata";
}

export function timezoneLabel(tz) {
  const id = normalizeTimezone(tz);
  const common = COMMON.find((c) => c.value === id);
  return common ? common.label : friendlyLabel(id);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_INDEX = Object.fromEntries(DAY_NAMES.map((d, i) => [d, i]));

// Offset (minutes, localTime = UTC + offset) of `timeZone` at the instant
// `utcInstant` — derived from Intl's own wall-clock formatting of that
// instant, so it's automatically correct for DST-observing zones, not just
// fixed-offset ones.
function offsetMinutesAt(utcInstant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(utcInstant)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  // Some ICU builds format midnight as "24" under hour12:false — normalize
  // it back to "00" so Date.UTC doesn't roll into the next day.
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(hour), Number(parts.minute), Number(parts.second));
  return Math.round((asUTC - utcInstant.getTime()) / 60000);
}

// Converts a RECURRING weekly Day + "HH:MM" (as stored on a Batch
// Occurrence — see EMPTY_OCC in the management dashboard) from one IANA
// timezone to another. Anchored to the next real calendar date matching
// that weekday (from today) so DST is resolved correctly for zones that
// observe it (this school's common zones — India, Saudi, Pakistan, UAE —
// are all fixed-offset, but Europe/London isn't). The day of week in the
// result can differ from the input (e.g. a late-night class can roll to
// the next calendar day in a timezone further east).
export function convertWeeklyTime(day, time, fromTz, toTz) {
  const dayIdx = DAY_INDEX[day];
  const [h, m] = (time || "").split(":").map(Number);
  if (dayIdx === undefined || !Number.isFinite(h) || !Number.isFinite(m)) return { day, time };
  if (!fromTz || !toTz || fromTz === toTz) return { day, time };

  const today = new Date();
  const todayUTCMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysAhead = (dayIdx - new Date(todayUTCMidnight).getUTCDay() + 7) % 7;
  const anchor = new Date(todayUTCMidnight + daysAhead * 86400000);
  const [ay, am, ad] = [anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()];

  // Sample fromTz's offset at midday on the anchor date — safely clear of
  // any DST transition (which always happens overnight) — then apply it
  // to the actual stored wall-clock time on that same date.
  const middayUTC = new Date(Date.UTC(ay, am, ad, 12, 0, 0));
  const fromOffset = offsetMinutesAt(middayUTC, fromTz);
  const utcInstant = new Date(Date.UTC(ay, am, ad, h, m, 0) - fromOffset * 60000);

  const toOffset = offsetMinutesAt(utcInstant, toTz);
  const toLocal = new Date(utcInstant.getTime() + toOffset * 60000);

  return {
    day: DAY_NAMES[toLocal.getUTCDay()],
    time: `${String(toLocal.getUTCHours()).padStart(2, "0")}:${String(toLocal.getUTCMinutes()).padStart(2, "0")}`,
  };
}
