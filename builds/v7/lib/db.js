import fs from "fs";
import path from "path";

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
  counters: {},
};

export function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  // ensure all keys exist even if db.json is older
  return { ...EMPTY, ...parsed };
}

export function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Generates a sequential, human-friendly ID like "STU-0001", "SCH-0002"
export function nextId(db, prefix) {
  if (!db.counters[prefix]) db.counters[prefix] = 0;
  db.counters[prefix] += 1;
  const num = String(db.counters[prefix]).padStart(4, "0");
  return `${prefix}-${num}`;
}
