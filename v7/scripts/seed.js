// Run with: node scripts/seed.js
// Creates the one Management account needed to log in for the first time.
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

const EMPTY = {
  users: [], credentials: [], regForms: [], services: [], scheduleItems: [],
  enrollments: [], trialItems: [], interviewItems: [], attendanceItems: [],
  invoices: [], paychecks: [], counters: {},
};

if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY, null, 2));
}

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

const alreadySeeded = db.users.some((u) => u.UserType === "Management");
if (alreadySeeded) {
  console.log("Management account already exists — skipping seed.");
  process.exit(0);
}

db.counters = db.counters || {};
db.counters["MGT"] = (db.counters["MGT"] || 0) + 1;
const userId = `MGT-${String(db.counters["MGT"]).padStart(4, "0")}`;

db.users.push({ UserID: userId, UserType: "Management", Name: "Admin", Status: "Active" });
db.credentials.push({ UserID: userId, Username: "admin", Password: "admin123" });

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log("Seeded Management login -> username: admin / password: admin123");
