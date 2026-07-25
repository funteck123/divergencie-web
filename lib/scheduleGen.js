import { nextId } from "./db";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextDateForDay(fromDate, dayName) {
  const targetDow = DAY_NAMES.indexOf(dayName);
  const d = new Date(fromDate);
  const diff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// Format using local calendar date components, not toISOString() — that
// converts to UTC first, which silently shifts the date back a day in any
// timezone ahead of UTC (cursor/horizon dates here are always local midnight).
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Every Service belongs to one or more Groups (Student, Teacher, Staff,
// Management, Parent, Ambassador) — an array now, since a service can be
// open to several account types at once. Gates who can book/enroll: Trial
// accounts only book services open to Student, each Interview track only
// sees services open to its matching Group. Legacy single-string values
// ("Student"/"Staff") and the old "Both" shorthand (= Student+Teacher) still
// normalize correctly for services/data created before this was an array.
export function normalizeGroup(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw === "Both") return ["Student", "Teacher"];
  return [raw || "Student"];
}

export function serviceGroupOf(db, serviceId) {
  return normalizeGroup(db.services.find((s) => s.ServiceID === serviceId)?.Group);
}

// Booking type -> the Group a Service must include to be bookable under it.
// Trial always leads to a Student account; each Interview track leads to a
// specific final account type (see CONVERT_MAP in api/convert/route.js), so
// each gets its own required Group instead of one shared "Staff" bucket.
const REQUIRED_GROUP = {
  Trial: "Student",
  TeacherInterview: "Teacher",
  StaffInterview: "Staff",
  AmbassadorInterview: "Ambassador",
};

export const BOOKING_TYPES = Object.keys(REQUIRED_GROUP);

export function requiredGroupForBookingType(type) {
  return REQUIRED_GROUP[type] || "Staff";
}

export function groupMatches(serviceGroup, requiredGroup) {
  return normalizeGroup(serviceGroup).includes(requiredGroup);
}

// ScheduleItems are generated grouped by occurrence (all of one Occurrence's
// future dates, then the next), so array/insertion order is not chronological
// — callers that display a schedule must sort by Date+Time explicitly.
export function sortByDateTime(items) {
  return [...items].sort((a, b) => (a.Date + a.Time).localeCompare(b.Date + b.Time));
}

// A slot is booked once Management approves a Trial or Interview request for
// it (Status "Scheduled") — regardless of whether the slot was manually
// offered or auto-generated from a Service. Multiple accounts may hold a
// Pending request on the same slot at once; only an approved one locks it.
export function isSlotBooked(db, scheduleId) {
  return (
    db.trialItems.some((t) => t.ScheduleItemID === scheduleId && t.Status === "Scheduled") ||
    db.interviewItems.some((i) => i.ScheduleItemID === scheduleId && i.Status === "Scheduled")
  );
}

// Ensures every Service has ScheduleItems generated through the end of next
// calendar month (current month + next month, in full — not a fixed N-day
// rolling window, which would leave the tail end of next month uncovered
// depending on where in the current month "today" falls). Called lazily
// whenever the schedule is read, which keeps the window automatically
// topped up without a cron job.
// Returns the number of schedule items generated, so callers can skip the
// writeDB() round trip on the (vast majority of) calls where the horizon
// is already fully generated and nothing actually changed.
export function ensureScheduleGenerated(db) {
  let generated = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getFullYear(), today.getMonth() + 2, 0); // last day of next month

  for (const service of db.services) {
    for (const component of service.OptionalComponents || []) {
      for (const batch of component.Batches || []) {
        for (const occ of batch.OccuranceList || []) {
          // Find the latest already-generated date for this occurrence
          const existing = db.scheduleItems.filter((s) => s.OccuranceID === occ.OccuranceID);
          let cursor = existing.length
            ? new Date(Math.max(...existing.map((s) => new Date(s.Date).getTime())))
            : new Date(today.getTime() - 7 * 86400000); // so first occurrence can be this week

          cursor = nextDateForDay(cursor, occ.Day);
          if (existing.length) cursor.setDate(cursor.getDate() + 7); // move past the last one generated

          while (cursor <= horizon) {
            db.scheduleItems.push({
              ScheduleID: nextId(db, "SCH"),
              ServiceID: service.ServiceID,
              ServiceName: service.Name,
              ServiceType: service.Type,
              ServiceGroup: normalizeGroup(service.Group),
              BatchID: batch.BatchID,
              BatchName: batch.BatchName,
              OccuranceID: occ.OccuranceID,
              Date: fmtDate(cursor),
              Time: occ.Time,
              Duration: occ.Duration,
              Facilitator: occ.Facilitator,
            });
            generated++;
            cursor = new Date(cursor);
            cursor.setDate(cursor.getDate() + 7);
          }
        }
      }
    }
  }

  return generated;
}
