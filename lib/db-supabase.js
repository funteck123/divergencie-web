import { createClient } from "@supabase/supabase-js";

// Same-shape adapter for lib/db.js: exposes readDB()/writeDB(db)/nextId(db, prefix)
// with the exact call signatures every API route already uses, but backed by
// real Postgres tables (one per collection) instead of a JSON file on disk.
// Each table stores its record as a JSONB blob keyed by that collection's own
// ID field, so no route needs to know column shapes — only this file does.

// V7_-prefixed: this app now shares a Vercel project with v6 (same project,
// Root Directory repointed to builds/v7), which already has its own
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY etc. for v6's separate Supabase
// project. Distinct names avoid overwriting or colliding with those.
// Exported (not just module-local) so lib/logging.js can write directly to
// its own dedicated tables (applogs/auditlog) without going through
// readDB()/writeDB() — those two tables are unbounded and write-heavy by
// nature, and read_full_db() (below) aggregates every collection into one
// blob on every single request across the whole app. Folding an
// ever-growing log table into that same aggregate would slow down every
// request as the log grows, even ones that have nothing to do with logs.
export const supabase = createClient(
  process.env.V7_SUPABASE_URL,
  process.env.V7_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// collection name -> [table name, record's own ID field]
const COLLECTIONS = {
  users: ["users", "UserID"],
  credentials: ["credentials", "UserID"],
  regForms: ["regforms", "RegFormID"],
  services: ["services", "ServiceID"],
  scheduleItems: ["scheduleitems", "ScheduleID"],
  enrollments: ["enrollments", "EnrolmentID"],
  trialItems: ["trialitems", "TrialID"],
  interviewItems: ["interviewitems", "InterviewID"],
  attendanceItems: ["attendanceitems", "AttendanceID"],
  invoices: ["invoices", "InvoiceID"],
  paychecks: ["paychecks", "PaycheckID"],
  leads: ["leads", "LeadID"],
  apiKeys: ["apikeys", "ApiKeyID"],
  guides: ["guides", "GuideID"],
  tickets: ["tickets", "TicketID"],
  rescheduleRequests: ["reschedulerequests", "RescheduleRequestID"],
};

// One round trip instead of 13 (12 tables + counters) — read_full_db()
// aggregates everything into a single JSON blob inside Postgres itself.
export async function readDB() {
  const { data, error } = await supabase.rpc("read_full_db");
  if (error) throw new Error(`[db-supabase] readDB: ${error.message}`);
  return data;
}

// upsert_rows() only inserts/updates — it never deletes a row that isn't
// in this call's own list. The previous version used sync_table(), which
// deleted every row NOT in the calling request's in-memory snapshot before
// upserting; two concurrent requests writing the same collection each read
// the table before the other's insert, so each snapshot excluded the
// other's new row — whichever write ran last silently deleted the other's
// record (confirmed live: 8 concurrent ticket creations left only 1 of 8
// behind). Upserting is safe under concurrency because it only ever
// touches the specific ids it's given — concurrent upserts to different
// ids never interact. Real deletions now go through deleteRecords() below
// instead, which targets only the exact ids being removed.
//
// touchedCollections (optional): array of COLLECTIONS keys. When provided,
// only those collections are synced — avoids a full 16-table round trip when
// a route only mutated one or two arrays. Omit to sync everything (safe
// default; every existing call site keeps working unchanged).
export async function writeDB(db, touchedCollections) {
  const entries = touchedCollections
    ? Object.entries(COLLECTIONS).filter(([key]) => touchedCollections.includes(key))
    : Object.entries(COLLECTIONS);
  await Promise.all(
    entries.map(async ([key, [table, idField]]) => {
      const records = db[key] || [];
      const rows = records.map((r) => ({ id: String(r[idField]), data: r }));

      const { error } = await supabase.rpc("upsert_rows", { p_table: table, p_rows: rows });
      if (error) throw new Error(`[db-supabase] writeDB: ${table}: ${error.message}`);
    })
  );

  // counters is intentionally NOT synced here — see incrementCounter()
  // below. A blind wholesale re-upsert of db.counters from memory would
  // race against it: two concurrent requests can each atomically mint a
  // unique id (say 5 and 6), but if the slower request's writeDB() then
  // re-upserts its own stale in-memory snapshot (counters.prefix=5) AFTER
  // the faster one already advanced it to 6, the counter "rewinds" and the
  // next real increment mints 6 again — a duplicate, exactly the bug this
  // was built to prevent. Nothing else in the app reads db.counters, so
  // there's nothing to sync.

  const fxRateRows = Object.entries(db.fxRates || {}).map(([cache_key, rate]) => ({ cache_key, rate }));
  const fxKeys = fxRateRows.map((r) => r.cache_key);
  if (fxRateRows.length > 0) {
    const { error } = await supabase.from("fxrates").upsert(fxRateRows, { onConflict: "cache_key" });
    if (error) throw new Error(`[db-supabase] writeDB: fxrates upsert: ${error.message}`);
  }
  // Unlike counters (which only ever grows), fxRates entries can legitimately
  // need clearing (e.g. switching rate providers) — delete anything no
  // longer present, same stale-cleanup upsert+delete pattern as every other
  // collection, instead of upsert-only (which silently no-ops on an empty
  // object and leaves old rows behind forever).
  let fxDeleteQuery = supabase.from("fxrates").delete();
  fxDeleteQuery = fxKeys.length > 0 ? fxDeleteQuery.not("cache_key", "in", `(${fxKeys.join(",")})`) : fxDeleteQuery.neq("cache_key", "");
  const { error: fxDeleteError } = await fxDeleteQuery;
  if (fxDeleteError) throw new Error(`[db-supabase] writeDB: fxrates delete: ${fxDeleteError.message}`);
}

// Atomic id mint: increment_counter() (see data/tmp/migration_atomic_counter.sql)
// does the read-and-increment as one Postgres UPDATE, so two concurrent
// requests are serialized by the database itself and can never both read
// the same pre-increment value the way two racing in-memory increments on
// separate serverless invocations could — that race previously produced
// two records with the same id ("ON CONFLICT DO UPDATE command cannot
// affect row a second time" on the following writeDB(), seen in production
// on paychecks and attendanceitems). Mirrors the result onto db.counters
// too, purely so nextId() can keep its historical synchronous-looking
// return type consistent within a request — writeDB() no longer syncs
// db.counters at all (see above), so this mirror is never persisted
// separately and can't cause the same rewind hazard.
export async function incrementCounter(db, prefix) {
  const { data, error } = await supabase.rpc("increment_counter", { p_prefix: prefix });
  if (error) throw new Error(`[db-supabase] incrementCounter: ${prefix}: ${error.message}`);
  db.counters[prefix] = data;
  const num = String(data).padStart(4, "0");
  return `${prefix}-${num}`;
}

// Targeted delete — removes exactly the ids given, nothing else. The
// explicit counterpart to writeDB()'s now upsert-only behavior: the small
// number of routes that actually remove records (not just create/update
// them) call this instead of relying on writeDB to infer deletions from
// what's missing from an in-memory snapshot, which is exactly the
// mechanism that caused the concurrent-write data loss writeDB used to
// have. `deletions` is [{ collection: COLLECTIONS key, ids: string[] }].
export async function deleteRecords(deletions) {
  await Promise.all(
    deletions
      .filter((d) => d.ids.length > 0)
      .map(async ({ collection, ids }) => {
        const [table] = COLLECTIONS[collection];
        const { error } = await supabase.rpc("delete_rows", { p_table: table, p_ids: ids.map(String) });
        if (error) throw new Error(`[db-supabase] deleteRecords: ${table}: ${error.message}`);
      })
  );
}
