import { createClient } from "@supabase/supabase-js";

// Same-shape adapter for lib/db.js: exposes readDB()/writeDB(db)/nextId(db, prefix)
// with the exact call signatures every API route already uses, but backed by
// real Postgres tables (one per collection) instead of a JSON file on disk.
// Each table stores its record as a JSONB blob keyed by that collection's own
// ID field, so no route needs to know column shapes, only this file does.

// V7_-prefixed: this app now shares a Vercel project with v6 (same project,
// Root Directory repointed to builds/v7), which already has its own
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY etc. for v6's separate Supabase
// project. Distinct names avoid overwriting or colliding with those.
// Exported (not just module-local) so lib/logging.js can write directly to
// its own dedicated tables (applogs/auditlog) without going through
// readDB()/writeDB(), those two tables are unbounded and write-heavy by
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
  resourceToggles: ["resourcetoggles", "ID"],
};

// TKT-0081: read_full_db() aggregates EVERY collection (592+ scheduleItems,
// 100+ attendanceItems, everything else) into one blob, on every single API
// call regardless of how little of it that route actually needs -- real
// live measurement: 0.9-3.4s per simple GET. A full fix (targeted
// per-route queries instead of one aggregate) is a much bigger rewrite
// across every route; this is the quick, safe mitigation instead: cache
// the aggregate result in-process, invalidated immediately on any write
// (see writeDB below -- every write calls invalidateReadCache()
// unconditionally before returning). Concurrent requests that land inside
// the cache window (very common -- a page firing several API calls in
// parallel, or a user clicking a few buttons in quick succession) share
// the one fetch instead of each paying the full aggregation cost.
// Per-process only, no cross-instance concern since this app runs as a
// single `next start` process, not serverless.
//
// PERF: this was 2000ms. Since every write invalidates the cache
// immediately and unconditionally, the TTL was never actually bounding
// staleness after a real change -- it only controlled how long an
// UNCHANGED read stays cached, which is a pure cost with no freshness
// benefit. A 2s window is short enough that realistic request cadence
// (e.g. a dashboard tab polling every few seconds, or a user browsing
// between page loads a few seconds apart) constantly falls just outside
// it and re-pays the full 0.9-3.4s aggregation cost -- confirmed live: a
// 20s/400ms-interval mixed-route benchmark hit cache misses on most
// requests, with per-route averages of 300-700ms. Raised to 30s: any real
// write still invalidates it instantly (no correctness change, no risk of
// serving stale data after an in-app edit), this only widens the window
// where a run of unchanged reads shares one fetch. The one accepted
// tradeoff: a write made directly in the Supabase dashboard, bypassing
// this app entirely, could take up to 30s to be picked up -- this project
// already has a standing rule against doing that (see memory:
// feedback_no_direct_db_writes), so it's a low-probability, low-cost
// edge case, not a real risk in normal operation.
const READ_CACHE_TTL_MS = 30000;
let readCache = null; // { promise, timestamp }

function invalidateReadCache() {
  readCache = null;
}

export async function readDB() {
  const now = Date.now();
  if (!readCache || now - readCache.timestamp >= READ_CACHE_TTL_MS) {
    const promise = (async () => {
      const { data, error } = await supabase.rpc("read_full_db");
      if (error) {
        invalidateReadCache();
        throw new Error(`[db-supabase] readDB: ${error.message}`);
      }
      return data;
    })();
    readCache = { promise, timestamp: now };
  }
  // Every route mutates its own `db` in place (e.g. db.scheduleItems.push())
  // before calling writeDB() -- concurrent requests sharing the SAME cached
  // object would leak one request's uncommitted mutations into another's
  // response or write. Each caller gets its own deep clone off the one
  // shared fetch, so the network/aggregation cost is shared but every
  // caller's object graph is independent, same as an uncached readDB()
  // always was.
  const data = await readCache.promise;
  return JSON.parse(JSON.stringify(data));
}

// upsert_rows() only inserts and updates. It never deletes a row that
// isn't in this call's own list. The previous version used sync_table(),
// which deleted every row NOT in the calling request's in-memory snapshot
// before upserting. Two concurrent requests writing the same collection
// each read the table before the other's insert, so each snapshot
// excluded the other's new row. Whichever write ran last silently deleted
// the other's record (confirmed live: 8 concurrent ticket creations left
// only 1 of 8 behind). Upserting is safe under concurrency because it
// only ever touches the specific ids it's given, so concurrent upserts to
// different ids never interact. Real deletions now go through
// deleteRecords() below instead, which targets only the exact ids being
// removed.
//
// touchedCollections (optional): array of COLLECTIONS keys. When provided,
// only those collections are synced, avoiding a full 16-table round trip
// when a route only mutated one or two arrays. Omit to sync everything
// (safe default; every existing call site keeps working unchanged).
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
  // A subsequent readDB() must see this write, not a stale cached copy.
  invalidateReadCache();

  // counters is intentionally NOT synced here. See incrementCounter()
  // below. A blind wholesale re-upsert of db.counters from memory would
  // race against it: two concurrent requests can each atomically mint a
  // unique id (say 5 and 6), but if the slower request's writeDB() then
  // re-upserts its own stale in-memory snapshot (counters.prefix=5) AFTER
  // the faster one already advanced it to 6, the counter "rewinds" and the
  // next real increment mints 6 again. That would be a duplicate, exactly
  // the bug this was built to prevent. Nothing else in the app reads
  // db.counters, so there's nothing to sync.

  const fxRateRows = Object.entries(db.fxRates || {}).map(([cache_key, rate]) => ({ cache_key, rate }));
  const fxKeys = fxRateRows.map((r) => r.cache_key);
  if (fxRateRows.length > 0) {
    const { error } = await supabase.from("fxrates").upsert(fxRateRows, { onConflict: "cache_key" });
    if (error) throw new Error(`[db-supabase] writeDB: fxrates upsert: ${error.message}`);
  }
  // Unlike counters (which only ever grows), fxRates entries can legitimately
  // need clearing (e.g. switching rate providers), delete anything no
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
// separate serverless invocations could. That race previously produced
// two records with the same id ("ON CONFLICT DO UPDATE command cannot
// affect row a second time" on the following writeDB(), seen in production
// on paychecks and attendanceitems). Mirrors the result onto db.counters
// too, purely so nextId() can keep its historical synchronous-looking
// return type consistent within a request. writeDB() no longer syncs
// db.counters at all (see above), so this mirror is never persisted
// separately and can't cause the same rewind hazard.
export async function incrementCounter(db, prefix) {
  const { data, error } = await supabase.rpc("increment_counter", { p_prefix: prefix });
  if (error) throw new Error(`[db-supabase] incrementCounter: ${prefix}: ${error.message}`);
  db.counters[prefix] = data;
  const num = String(data).padStart(4, "0");
  return `${prefix}-${num}`;
}

// Atomic dedup-insert for scheduleItems only: ensureScheduleGenerated
// (lib/scheduleGen.js) decides which Occurrence+Date slots are "missing"
// by reading the table, then wants to insert new rows for them -- exactly
// the same shape of race incrementCounter() above already exists to fix
// (two concurrent requests both read before either writes, both decide
// the same slot is missing, both insert). See
// data/tmp/migration_dedup_schedule_generation.sql: a unique index on
// (OccuranceID, Date) plus this INSERT ... ON CONFLICT DO NOTHING RPC
// means whichever request's insert reaches Postgres first wins that slot;
// the loser's row for the same slot is silently dropped instead of
// creating a duplicate. Returns only the ids that were ACTUALLY inserted,
// so the caller can drop the rest from its own in-memory/response state
// rather than assuming everything it tried to insert now exists.
export async function insertScheduleItemsDedup(rows) {
  if (rows.length === 0) return [];
  const [table, idField] = COLLECTIONS.scheduleItems;
  const payload = rows.map((r) => ({ id: String(r[idField]), data: r }));
  const { data, error } = await supabase.rpc("insert_schedule_items_dedup", { p_rows: payload });
  if (error) throw new Error(`[db-supabase] insertScheduleItemsDedup: ${table}: ${error.message}`);
  invalidateReadCache();
  return new Set((data || []).map((row) => row.id));
}

// Targeted delete. Removes exactly the ids given, nothing else. The
// explicit counterpart to writeDB()'s now upsert-only behavior: the small
// number of routes that actually remove records, not just create or
// update them, call this instead of relying on writeDB to infer deletions
// from what's missing from an in-memory snapshot, which is exactly the
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
  invalidateReadCache();
}

// TKT-0084: PATCH /api/users (Activate/Deactivate, and every other single-
// field account edit) went through the same full readDB()+writeDB() as
// everything else -- writeDB() re-upserts EVERY row in a touched
// collection, not just the one that changed, so editing one user's Status
// re-wrote all 30+ user rows and all 30+ credential rows every time. Real
// live measurement: ~2s per toggle, unaffected by the TKT-0081 read cache
// (writes can't be cached, and every write invalidates the cache anyway).
// These three functions are a targeted fast path for that one hot route:
// fetch/check/write only the specific row(s) actually involved, instead of
// the whole users+credentials tables.
export async function getUserAndCredentials(userId) {
  const [[usersTable], [credsTable]] = [COLLECTIONS.users, COLLECTIONS.credentials];
  const [{ data: userRow, error: userError }, { data: credRow, error: credError }] = await Promise.all([
    supabase.from(usersTable).select("data").eq("id", String(userId)).maybeSingle(),
    supabase.from(credsTable).select("data").eq("id", String(userId)).maybeSingle(),
  ]);
  if (userError) throw new Error(`[db-supabase] getUserAndCredentials: ${usersTable}: ${userError.message}`);
  if (credError) throw new Error(`[db-supabase] getUserAndCredentials: ${credsTable}: ${credError.message}`);
  return { user: userRow?.data ?? null, cred: credRow?.data ?? null };
}

// Checks only the credentials table for a Username collision, instead of
// fetching every credential row to check client-side.
export async function usernameTaken(username, excludeUserId) {
  const [table] = COLLECTIONS.credentials;
  const { data, error } = await supabase.from(table).select("id").eq("data->>Username", username);
  if (error) throw new Error(`[db-supabase] usernameTaken: ${table}: ${error.message}`);
  return (data || []).some((row) => row.id !== String(excludeUserId));
}

export async function saveUserAndCredentials(user, cred) {
  const [[usersTable], [credsTable]] = [COLLECTIONS.users, COLLECTIONS.credentials];
  const writes = [supabase.rpc("upsert_rows", { p_table: usersTable, p_rows: [{ id: String(user.UserID), data: user }] })];
  if (cred) {
    writes.push(supabase.rpc("upsert_rows", { p_table: credsTable, p_rows: [{ id: String(cred.UserID), data: cred }] }));
  }
  const results = await Promise.all(writes);
  for (const { error } of results) {
    if (error) throw new Error(`[db-supabase] saveUserAndCredentials: ${error.message}`);
  }
  invalidateReadCache();
}

// TKT-0097: POST /api/attendance's "already logged" duplicate check read a
// snapshot via readDB() at the start of the request, then wrote at the
// end -- two near-simultaneous requests for the same (ScheduleItemID,
// UserID, LoggedBy) could both read before either wrote, so both passed
// the check and both inserted. Reproduced live via a fast double-click:
// both requests succeeded. See data/tmp/migration_atomic_attendance_insert.sql
// for why the fix has to happen inside one atomic Postgres statement (same
// reasoning as incrementCounter() above) rather than an application-level
// re-check, which only shrinks the race window, it never closes it.
// Returns the inserted AttendanceID, or null if a duplicate blocked the
// insert.
export async function insertAttendanceIfNew(item) {
  const [table] = COLLECTIONS.attendanceItems;
  const { data, error } = await supabase.rpc("insert_attendance_if_new", {
    p_id: String(item.AttendanceID),
    p_data: item,
    p_schedule_item_id: item.ScheduleItemID,
    p_user_id: item.UserID,
    p_logged_by: item.LoggedBy,
  });
  if (error) throw new Error(`[db-supabase] insertAttendanceIfNew: ${table}: ${error.message}`);
  if (data) invalidateReadCache();
  return data;
}
