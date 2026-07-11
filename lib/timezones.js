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
