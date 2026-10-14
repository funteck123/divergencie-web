import { isEnrollmentLiveThisWeek } from "./enrollmentDates.js";

// Same shape as batchesOf in lib/billing.js, repeated so this file has no imports that plain `node --test` cannot load.
const batchesOf = (service) => (service?.OptionalComponents || []).flatMap((c) => c.Batches || []);

// Flattens every Service's Batches' OccuranceList into one flat list: the whole week's recurring pattern across every
// service/batch at once, not any one person's. A Staff-role Service (no Batches) contributes its OccuranceList directly.
// A Batch nobody is enrolled in is not a real class, and (TKT-0346) only enrollments live this week count.
// TKT-0345: `batchName` (for example "B8") keeps only the batches carrying that BatchName, so the picture shows every
// subject that batch attends. `group` is the raw Service.Group; the caller normalizes it. Staff-role services have no batch, so they never match a batch name.
export function buildScheduleEntries(db, today, batchName = "") {
  const want = String(batchName || "").trim();
  const entries = [];
  const enrolledBatchKeys = new Set(db.enrollments.filter((e) => isEnrollmentLiveThisWeek(e, today)).map((e) => `${e.ServiceID}::${e.BatchID || ""}`));
  for (const s of db.services) {
    const batches = batchesOf(s);
    if (want && batches.length === 0) continue;
    const effective = batches.length > 0 ? batches : [{ BatchID: "", OccuranceList: s.OccuranceList || [] }];
    for (const b of effective) {
      if (want && (b.BatchName || "").trim() !== want) continue;
      if (!enrolledBatchKeys.has(`${s.ServiceID}::${b.BatchID || ""}`)) continue;
      for (const o of b.OccuranceList || []) {
        // An occurrence with no Day/Time set yet has nothing to draw.
        if (!o.Day || !o.Time) continue;
        entries.push({ serviceName: s.Name, day: o.Day, time: o.Time, duration: o.Duration, facilitator: o.Facilitator, group: s.Group });
      }
    }
  }
  return entries;
}

/** Distinct, non-empty batch names across all services, sorted naturally (B8 before B14). */
export function batchNames(services) {
  const names = new Set();
  for (const s of services || []) for (const b of batchesOf(s)) if ((b.BatchName || "").trim()) names.add(b.BatchName.trim());
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
