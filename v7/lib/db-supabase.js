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
};

export async function readDB() {
  const db = { counters: {} };

  await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, [table]]) => {
      const { data, error } = await supabase.from(table).select("data");
      if (error) throw new Error(`[db-supabase] readDB: ${table}: ${error.message}`);
      db[key] = data.map((row) => row.data);
    })
  );

  const { data: counterRows, error: counterErr } = await supabase.from("counters").select("prefix, value");
  if (counterErr) throw new Error(`[db-supabase] readDB: counters: ${counterErr.message}`);
  for (const row of counterRows) db.counters[row.prefix] = row.value;

  return db;
}

export async function writeDB(db) {
  for (const [key, [table, idField]] of Object.entries(COLLECTIONS)) {
    const records = db[key] || [];
    const currentIds = records.map((r) => String(r[idField]));

    if (records.length > 0) {
      const rows = records.map((r) => ({ id: String(r[idField]), data: r, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`[db-supabase] writeDB: ${table} upsert: ${error.message}`);
    }

    // Remove rows that no longer exist in the in-memory collection.
    let deleteQuery = supabase.from(table).delete();
    deleteQuery = currentIds.length > 0 ? deleteQuery.not("id", "in", `(${currentIds.join(",")})`) : deleteQuery.neq("id", "");
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error(`[db-supabase] writeDB: ${table} delete: ${deleteError.message}`);
  }

  const counterRows = Object.entries(db.counters || {}).map(([prefix, value]) => ({ prefix, value }));
  if (counterRows.length > 0) {
    const { error } = await supabase.from("counters").upsert(counterRows, { onConflict: "prefix" });
    if (error) throw new Error(`[db-supabase] writeDB: counters upsert: ${error.message}`);
  }
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
