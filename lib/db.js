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

export async function writeDB(db) {
  return BACKEND === "supabase" ? supabaseBackend.writeDB(db) : writeDBJson(db);
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

// TKT-0022: db.counters[prefix] is only persisted AFTER every collection's
// writeDB() upsert succeeds (see writeDB below / db-supabase.js) — if a
// request incremented a counter in memory but then failed partway through
// its own write (or a migration/backup-restore created records without
// going through nextId at all), the *stored* counter falls permanently
// behind the highest id actually in use. nextId() minting from that stale
// counter then produces an id that already exists — invisible in memory,
// but rejected outright once writeDB tries to upsert both the pre-existing
// row and the new one sharing one id in the same batched statement
// ("ON CONFLICT DO UPDATE command cannot affect row a second time" —
// confusing, gives no hint at the real cause). Self-heal by checking the
// counter against actual data the first time a given prefix is minted in
// this request (cached on db.__healedIdPrefixes so a loop calling nextId
// many times for the same prefix — e.g. paycheck generation — only pays
// for the full-tree scan once, not once per call).
export function nextId(db, prefix) {
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
