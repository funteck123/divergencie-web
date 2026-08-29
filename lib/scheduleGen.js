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
//
// Async because nextId() is: on the Supabase backend it mints through a
// real Postgres round trip (see lib/db-supabase.js's incrementCounter), so
// every call here must be awaited. A prior version of this function called
// nextId() without awaiting it — nextId() became async in a fix earlier in
// this project's history and every direct API-route call site was updated
// to await it, but this call was missed. Since it wasn't awaited, ScheduleID
// was silently set to the Promise object itself rather than the minted id
// string, and String() on any Promise always returns the same literal
// text regardless of the promise's real value — so every item generated in
// one pass collided on that same fake id, which only surfaced as a real
// error the next time this function actually needed to generate something
// (a real live case: after a bulk cleanup of legacy ScheduleItems forced
// regeneration to run again for occurrences it had been silently skipping,
// "ON CONFLICT DO UPDATE command cannot affect row a second time" started
// failing on the very next schedule read).
export async function ensureScheduleGenerated(db) {
  let generated = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()); // always exactly one month out

  for (const service of db.services) {
    // A cohort Service (Student/Teacher/etc) nests its occurrences under
    // OptionalComponents[].Batches[]; a Staff-role Service (Role/Department
    // — see applyStaffRoleFields in app/api/services/route.js) has no
    // batches at all and keeps OccuranceList directly on itself. Both are
    // walked the same way below via one flat list of "batches" — a flat
    // service just contributes a single pseudo-batch with no id/name.
    const batches = (service.OptionalComponents || []).flatMap((c) => c.Batches || []);
    if (batches.length === 0 && Array.isArray(service.OccuranceList)) {
      batches.push({ BatchID: "", BatchName: "", OccuranceList: service.OccuranceList });
    }

    for (const batch of batches) {
      for (const occ of batch.OccuranceList || []) {
        // An occurrence with no Day/Time set yet (e.g. a resource-only
        // service pending a real schedule) has nothing to generate from —
        // skip it rather than computing a meaningless date out of it.
        if (!occ.Day || !occ.Time) continue;

        // Find the latest already-generated date for this occurrence
        const existing = db.scheduleItems.filter((s) => s.OccuranceID === occ.OccuranceID);

        // TKT-0127: this function only ever APPENDED new dates past
        // whatever was already generated -- it never touched an existing
        // item again, even one that hasn't happened yet, so editing a
        // Service (renaming it, reassigning its Facilitator, restructuring
        // Batches) left every already-generated but still-upcoming
        // ScheduleItem permanently showing the OLD denormalized snapshot
        // until that date finally passed. Confirmed real and visible: a
        // Student's own portal showed a stale Facilitator name and a
        // stale, shorter ServiceName for an upcoming class one day out,
        // alongside newly-generated sessions with the correct current
        // values for the exact same Occurrence -- "2 instructors" for one
        // subject, and a Billing tab (which reads the Service record
        // live, never a snapshot) showing yet a third, different name.
        // Only a genuinely FUTURE item is corrected here -- a past item
        // already happened under whatever arrangement was actually true
        // at the time, and changing its record after the fact would
        // rewrite history a real attendance record may already reference.
        const todayStr = fmtDate(today);
        for (const item of existing) {
          if (item.Date <= todayStr) continue;
          const fresh = {
            ServiceName: service.Name,
            ServiceType: service.Type,
            ServiceGroup: normalizeGroup(service.Group),
            BatchID: batch.BatchID,
            BatchName: batch.BatchName,
            Time: occ.Time,
            Timezone: occ.Timezone,
            Duration: occ.Duration,
            Facilitator: occ.Facilitator,
          };
          const changed = Object.keys(fresh).some((k) => JSON.stringify(item[k]) !== JSON.stringify(fresh[k]));
          if (changed) {
            Object.assign(item, fresh);
            generated++;
          }
        }

        // TKT-0155/0156: this used to only ever APPEND past whatever was
        // already generated (or, failing that, "today minus a week") --
        // so an Occurrence that lost its generation history (a Batch edit
        // assigning it a brand-new OccuranceID, a bulk cleanup, a missed
        // run) silently skipped straight to "next week" and never
        // recovered the gap. Confirmed live: STU-0003's Physics and
        // Biology, both actively enrolled since 2026-07-01, had ZERO
        // August sessions after an Aug 22 Batch edit reset their
        // OccuranceIDs. Fixed by always generating the Batch's full run
        // from its own StartDate through the horizon, keyed by Date so
        // re-running this is a no-op wherever nothing changed -- a real
        // gap self-heals the next time this runs instead of needing a
        // one-off backfill script. A Batch saved before StartDate existed
        // falls back to the Service's own StartDate (an overall bound set
        // once for every Batch under it), then to the earliest enrollment
        // StartDate on record for this exact Service+Batch, or today if
        // there's truly nothing to go on.
        const startDate = batch.StartDate
          ? new Date(batch.StartDate)
          : service.StartDate
          ? new Date(service.StartDate)
          : new Date(
              Math.min(
                today.getTime(),
                ...(db.enrollments || [])
                  .filter((e) => e.ServiceID === service.ServiceID && e.BatchID === batch.BatchID && e.StartDate)
                  .map((e) => new Date(e.StartDate).getTime())
              )
            );
        startDate.setHours(0, 0, 0, 0);

        // A set EndDate (Batch's own, else the Service's) caps generation
        // so a finished term/cohort doesn't keep rolling forward forever --
        // whichever bound (this end, or the usual one-month-out horizon) is
        // earliest wins.
        const endBound = batch.EndDate || service.EndDate;
        const effectiveHorizon = endBound ? new Date(Math.min(horizon.getTime(), new Date(endBound).getTime())) : horizon;

        const existingDates = new Set(existing.map((s) => s.Date));
        let cursor = nextDateForDay(startDate, occ.Day);

        while (cursor <= effectiveHorizon) {
          const dateStr = fmtDate(cursor);
          if (!existingDates.has(dateStr)) {
            db.scheduleItems.push({
              ScheduleID: await nextId(db, "SCH"),
              ServiceID: service.ServiceID,
              ServiceName: service.Name,
              ServiceType: service.Type,
              ServiceGroup: normalizeGroup(service.Group),
              BatchID: batch.BatchID,
              BatchName: batch.BatchName,
              OccuranceID: occ.OccuranceID,
              Date: dateStr,
              Time: occ.Time,
              Timezone: occ.Timezone,
              Duration: occ.Duration,
              Facilitator: occ.Facilitator,
            });
            generated++;
          }
          cursor = new Date(cursor);
          cursor.setDate(cursor.getDate() + 7);
        }
      }
    }
  }

  return generated;
}
