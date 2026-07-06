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

// Every Service belongs to a Group ("Student", "Staff", or "Both"), which
// gates who can book its slots: Trial accounts only book services open to
// Student, Interview accounts only ones open to Staff. "Both" satisfies
// either. Services created before this field existed default to "Student".
export function serviceGroupOf(db, serviceId) {
  return db.services.find((s) => s.ServiceID === serviceId)?.Group || "Student";
}

export function requiredGroupForBookingType(type) {
  return type === "Trial" ? "Student" : "Staff";
}

export function groupMatches(serviceGroup, requiredGroup) {
  const group = serviceGroup || "Student";
  return group === "Both" || group === requiredGroup;
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
export function ensureScheduleGenerated(db) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getFullYear(), today.getMonth() + 2, 0); // last day of next month

  for (const service of db.services) {
    for (const occ of service.OccuranceList || []) {
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
          ServiceGroup: service.Group || "Student",
          OccuranceID: occ.OccuranceID,
          Date: fmtDate(cursor),
          Time: occ.Time,
          Duration: occ.Duration,
          Facilitator: occ.Facilitator,
        });
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
    }
  }
}
