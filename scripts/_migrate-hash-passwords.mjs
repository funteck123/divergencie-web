// One-time migration: hash every plaintext password currently stored in
// the live credentials table (Supabase). Fixes the CRITICAL red-team
// finding that GET /api/users returned every account's real plaintext
// password. Backs up the full DB first (this session's standing rule:
// never write to the DB directly without a backup), then only touches
// the credentials collection.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const { readDB, writeDB } = await import("../lib/db-supabase.js");
const { hashPassword } = await import("../lib/passwords.js");

const db = await readDB();

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(root, "backups", `full-backup-pre-password-hash-${ts}.json`);
fs.writeFileSync(backupPath, JSON.stringify(db, null, 2));
console.log(`Backed up full DB to ${backupPath}`);

let migrated = 0;
let alreadyHashed = 0;
for (const cred of db.credentials || []) {
  if (typeof cred.Password === "string" && cred.Password.startsWith("scrypt:")) {
    alreadyHashed += 1;
    continue;
  }
  cred.Password = hashPassword(cred.Password);
  migrated += 1;
}

console.log(`${migrated} credential(s) hashed, ${alreadyHashed} already hashed (skipped).`);

if (migrated > 0) {
  await writeDB(db, ["credentials"]);
  console.log("Wrote hashed credentials back (credentials collection only).");
} else {
  console.log("Nothing to write.");
}
