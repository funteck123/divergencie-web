// One-off: copies the current data/db.json into the Supabase project
// configured in .env.local, using the exact same writeDB() the app itself
// calls when DB_BACKEND=supabase — so the migrated data is guaranteed to
// match what the running app would produce.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const { writeDB } = await import("../lib/db-supabase.js");

const db = JSON.parse(fs.readFileSync(path.join(root, "data", "db.json"), "utf-8"));
await writeDB(db);
console.log("Migrated to Supabase:", Object.fromEntries(Object.entries(db).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
