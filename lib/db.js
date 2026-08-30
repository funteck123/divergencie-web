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
  resourceToggles: [],
  counters: {},
  fxRates: {},
};

// DB_BACKEND=supabase switches every route from the fs-based JSON file to
// real Postgres tables (see lib/db-supabase.js), same 3 function
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
// records, not just create or update them. See db-supabase.js's
// deleteRecords for why writeDB() alone can no longer be relied on to
// infer deletions from what's missing off an in-memory snapshot.
// `deletions` is [{ collection: EMPTY's key name, ids: string[] }]. No-op
// on the JSON backend: writeDBJson(db) persists the whole object wholesale
// every call, so a plain `db.X = db.X.filter(...)` before writeDB() already
// removes the record correctly there. It's a single local process with no
// concurrent writer to race against.
export async function deleteRecords(db, deletions) {
  if (BACKEND === "supabase") await supabaseBackend.deleteRecords(deletions);
}

// Atomic dedup-insert for newly-generated ScheduleItems (see
// ensureScheduleGenerated in lib/scheduleGen.js). `rows` are candidate new
// ScheduleItem records this call decided are missing -- on the Supabase
// backend, the database itself (a unique index on OccuranceID+Date, see
// data/tmp/migration_dedup_schedule_generation.sql) rejects any row that
// collides with one a concurrent request already inserted, so this
// returns only the ids that actually landed. `db.scheduleItems` is
// mutated in place to keep only those (dropping any that lost the race),
// so the caller's own in-memory state and any response built from it
// matches what's actually in the database, not what it merely attempted.
// No-op safety on the JSON backend: single local process, no concurrent
// writer to race against, so every row is accepted as-is.
export async function insertScheduleItemsDedup(db, rows) {
  if (rows.length === 0) return;
  if (BACKEND !== "supabase") {
    db.scheduleItems.push(...rows);
    return;
  }
  const insertedIds = await supabaseBackend.insertScheduleItemsDedup(rows);
  db.scheduleItems.push(...rows.filter((r) => insertedIds.has(String(r.ScheduleID))));
}

// Recursively collects the highest numeric suffix already in use for
// `prefix` anywhere in `value`, top-level record ids (PaycheckID,
// ServiceID, ...) AND nested ones (a Service's Batch/Rate/Occurrence ids,
// LineItem entries, etc). `prefix + "-"` as the match (not a regex) so a
// short prefix can never false-match a longer one that happens to start
// the same way (e.g. "TR-" vs "TRI-0005", the hyphen makes this exact).
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

// TKT-0022's self-heal, checking the counter against actual data before
// minting, fixed a stale-counter drift, but never fixed the deeper issue
// on the supabase backend: two concurrent serverless requests could each
// read the same in-memory counter value before either wrote it back, both
// minting the identical id ("ON CONFLICT DO UPDATE command cannot affect
// row a second time" on the following writeDB(), seen in production on
// paychecks and attendanceitems). Fixed by minting through Postgres's own
// atomic increment_counter() on that backend instead (see
// lib/db-supabase.js's incrementCounter and
// data/tmp/migration_atomic_counter.sql). Concurrent callers are
// serialized by the database, which two separate serverless invocations
// can never be by sharing JS-level state. The JSON backend, a single local
// process with no real concurrent-request scenario, keeps the original
// in-memory self-heal logic below unchanged.
export async function nextId(db, prefix) {
  if (BACKEND === "supabase") return supabaseBackend.incrementCounter(db, prefix);

  // Non-enumerable: invisible to JSON.stringify (writeDBJson persists the
  // whole db object wholesale) and to writeDB's own Object.keys(COLLECTIONS)
  // iteration alike, this is purely a same-request cache, never meant to
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

// TKT-0084: targeted fast path for PATCH /api/users, see db-supabase.js's
// versions for why (that full readDB()/writeDB() round trip re-upserted
// every user and credential row just to edit one). JSON backend has no
// equivalent hot-path problem (writeDBJson() already persists the whole
// file in one local disk write regardless), so it just does the plain
// read/find/write it always did.
export async function getUserAndCredentials(userId) {
  if (BACKEND === "supabase") return supabaseBackend.getUserAndCredentials(userId);
  const db = readDBJson();
  return {
    user: db.users.find((u) => u.UserID === userId) || null,
    cred: db.credentials.find((c) => c.UserID === userId) || null,
  };
}

export async function usernameTaken(username, excludeUserId) {
  if (BACKEND === "supabase") return supabaseBackend.usernameTaken(username, excludeUserId);
  const db = readDBJson();
  return db.credentials.some((c) => c.Username === username && c.UserID !== excludeUserId);
}

export async function saveUserAndCredentials(user, cred) {
  if (BACKEND === "supabase") return supabaseBackend.saveUserAndCredentials(user, cred);
  const db = readDBJson();
  const uIdx = db.users.findIndex((u) => u.UserID === user.UserID);
  if (uIdx !== -1) db.users[uIdx] = user;
  else db.users.push(user);
  if (cred) {
    const cIdx = db.credentials.findIndex((c) => c.UserID === cred.UserID);
    if (cIdx !== -1) db.credentials[cIdx] = cred;
    else db.credentials.push(cred);
  }
  writeDBJson(db);
}

// TKT-0097: targeted atomic insert for POST /api/attendance, see
// insertAttendanceIfNew in db-supabase.js for why (the previous
// read-then-write pattern had a real, reproduced race). JSON backend has
// no equivalent race (a single local process, no real concurrent-request
// scenario), so it just does the same check-then-push it always did.
export async function insertAttendanceIfNew(db, item) {
  if (BACKEND === "supabase") return supabaseBackend.insertAttendanceIfNew(item);
  const duplicate = db.attendanceItems.some(
    (a) => a.ScheduleItemID === item.ScheduleItemID && a.UserID === item.UserID && a.LoggedBy === item.LoggedBy
  );
  if (duplicate) return null;
  db.attendanceItems.push(item);
  writeDBJson(db);
  return item.AttendanceID;
}
