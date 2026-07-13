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

// Generates a sequential, human-friendly ID like "STU-0001", "SCH-0002"
export function nextId(db, prefix) {
  if (!db.counters[prefix]) db.counters[prefix] = 0;
  db.counters[prefix] += 1;
  const num = String(db.counters[prefix]).padStart(4, "0");
  return `${prefix}-${num}`;
}
