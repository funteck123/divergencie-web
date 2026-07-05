import { nextId } from "./db";

const ROLLING_WEEKS_AHEAD = 4;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextDateForDay(fromDate, dayName) {
  const targetDow = DAY_NAMES.indexOf(dayName);
  const d = new Date(fromDate);
  const diff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// A slot is booked once a Trial or Interview item references it — regardless
// of whether it was manually offered or auto-generated from a Service.
export function isSlotBooked(db, scheduleId) {
  return (
    db.trialItems.some((t) => t.ScheduleItemID === scheduleId) ||
    db.interviewItems.some((i) => i.ScheduleItemID === scheduleId)
  );
}

// Ensures every Service has ScheduleItems generated out to a rolling window
// (ROLLING_WEEKS_AHEAD from today). Called lazily whenever the schedule is
// read, which keeps the window automatically topped up without a cron job.
export function ensureScheduleGenerated(db) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + ROLLING_WEEKS_AHEAD * 7);

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
