import fs from "fs";
import path from "path";
import * as supabaseBackend from "./db-supabase";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const EMPTY = {
  users: [],
  credentials: [],
  regForms: [],
  services: [],
  scheduleItems: [],
  enrollments: [],
  trialItems: [],
  interviewItems: [],
  attendanceItems: [],
  invoices: [],
  paychecks: [],
  leads: [],
  apiKeys: [],
  guides: [],
  tickets: [],
  rescheduleRequests: [],
  counters: {},
  fxRates: {},
};

// DB_BACKEND=supabase switches every route from the fs-based JSON file to
// real Postgres tables (see lib/db-supabase.js) — same 3 function
// signatures either way. Default stays "json" so nothing changes unless
// this is explicitly set (JSON file writes don't persist on Vercel's
// serverless filesystem, which is why "supabase" exists at all).
const BACKEND = process.env.DB_BACKEND || "json";

function readDBJson() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  // ensure all keys exist even if db.json is older
  return { ...EMPTY, ...parsed };
}

function writeDBJson(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export async function readDB() {
  return BACKEND === "supabase" ? supabaseBackend.readDB() : readDBJson();
}

export async function writeDB(db, touchedCollections) {
  return BACKEND === "supabase" ? supabaseBackend.writeDB(db, touchedCollections) : writeDBJson(db);
}

// Explicit, targeted delete for the handful of routes that actually remove
// records (not just create/update them) — see db-supabase.js's
// deleteRecords for why writeDB() alone can no longer be relied on to
// infer deletions from what's missing off an in-memory snapshot.
// `deletions` is [{ collection: EMPTY's key name, ids: string[] }]. No-op
// on the JSON backend: writeDBJson(db) persists the whole object wholesale
// every call, so a plain `db.X = db.X.filter(...)` before writeDB() already
// removes the record correctly there — single local process, no concurrent
// writer to race against.
export async function deleteRecords(db, deletions) {
  if (BACKEND === "supabase") await supabaseBackend.deleteRecords(deletions);
}

// Recursively collects the highest numeric suffix already in use for
// `prefix` anywhere in `value` — top-level record ids (PaycheckID,
// ServiceID, ...) AND nested ones (a Service's Batch/Rate/Occurrence ids,
// LineItem entries, etc). `prefix + "-"` as the match (not a regex) so a
// short prefix can never false-match a longer one that happens to start
// the same way (e.g. "TR-" vs "TRI-0005" — the hyphen makes this exact).
function maxNumericSuffix(value, prefix, seen) {
  if (typeof value === "string") {
    if (value.startsWith(prefix + "-") && /^\d+$/.test(value.slice(prefix.length + 1))) {
      seen.max = Math.max(seen.max, parseInt(value.slice(prefix.length + 1), 10));
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) maxNumericSuffix(v, prefix, seen);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) maxNumericSuffix(v, prefix, seen);
  }
}

// TKT-0022's self-heal (checking the counter against actual data before
// minting) fixed a stale-counter drift, but never fixed the deeper issue
// on the supabase backend: two concurrent serverless requests could each
// read the same in-memory counter value before either wrote it back, both
// minting the identical id ("ON CONFLICT DO UPDATE command cannot affect
// row a second time" on the following writeDB() — seen in production on
// paychecks and attendanceitems). Fixed by minting through Postgres's own
// atomic increment_counter() on that backend instead (see
// lib/db-supabase.js's incrementCounter and
// data/tmp/migration_atomic_counter.sql) — concurrent callers are
// serialized by the database, which two separate serverless invocations
// can never be by sharing JS-level state. The JSON backend (single local
// process, no real concurrent-request scenario) keeps the original
// in-memory self-heal logic below unchanged.
export async function nextId(db, prefix) {
  if (BACKEND === "supabase") return supabaseBackend.incrementCounter(db, prefix);

  // Non-enumerable: invisible to JSON.stringify (writeDBJson persists the
  // whole db object wholesale) and to writeDB's own Object.keys(COLLECTIONS)
  // iteration alike — this is purely a same-request cache, never meant to
  // be part of the stored shape.
  if (!db.__healedIdPrefixes) {
    Object.defineProperty(db, "__healedIdPrefixes", { value: new Set(), enumerable: false });
  }
  if (!db.__healedIdPrefixes.has(prefix)) {
    const seen = { max: 0 };
    for (const key of Object.keys(db)) {
      if (key === "counters" || key === "fxRates") continue;
      maxNumericSuffix(db[key], prefix, seen);
    }
    if (seen.max > (db.counters[prefix] || 0)) db.counters[prefix] = seen.max;
    db.__healedIdPrefixes.add(prefix);
  }
  db.counters[prefix] = (db.counters[prefix] || 0) + 1;
  const num = String(db.counters[prefix]).padStart(4, "0");
  return `${prefix}-${num}`;
}
