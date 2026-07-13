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
const supabase = createClient(
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
};

// One round trip instead of 13 (12 tables + counters) — read_full_db()
// aggregates everything into a single JSON blob inside Postgres itself.
export async function readDB() {
  const { data, error } = await supabase.rpc("read_full_db");
  if (error) throw new Error(`[db-supabase] readDB: ${error.message}`);
  return data;
}

// One round trip per table instead of two (upsert, then delete) — sync_table()
// does both inside a single Postgres function call. The 12 tables still run
// concurrently via Promise.all.
export async function writeDB(db) {
  await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, [table, idField]]) => {
      const records = db[key] || [];
      const ids = records.map((r) => String(r[idField]));
      const rows = records.map((r) => ({ id: String(r[idField]), data: r }));

      const { error } = await supabase.rpc("sync_table", { p_table: table, p_rows: rows, p_ids: ids });
      if (error) throw new Error(`[db-supabase] writeDB: ${table}: ${error.message}`);
    })
  );

  const counterRows = Object.entries(db.counters || {}).map(([prefix, value]) => ({ prefix, value }));
  if (counterRows.length > 0) {
    const { error } = await supabase.from("counters").upsert(counterRows, { onConflict: "prefix" });
    if (error) throw new Error(`[db-supabase] writeDB: counters upsert: ${error.message}`);
  }

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

// Mutates the in-memory counter only; the caller's subsequent writeDB(db)
// persists it — same synchronous contract as lib/db.js's fs-backed version,
// so no call site needs to await this one.
export function nextId(db, prefix) {
  if (!db.counters[prefix]) db.counters[prefix] = 0;
  db.counters[prefix] += 1;
  const num = String(db.counters[prefix]).padStart(4, "0");
  return `${prefix}-${num}`;
}
