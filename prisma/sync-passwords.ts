/**
 * sync-passwords.ts
 * Reads prisma/users.csv (email, password columns only) and updates
 * passwordHash in the DB for each row. Touches NOTHING else.
 *
 * Usage:
 *   npx tsx prisma/sync-passwords.ts
 *
 * Workflow:
 *   1. Edit prisma/users.csv  — change password for any user
 *   2. Run this script        — hashes and writes to DB
 *   3. Login works immediately with the new password
 */

import "dotenv/config";
import prisma from "../src/lib/db.js";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" }),
});

function parseCSV(filePath: string): { email: string; password: string }[] {
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n").map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim());
  const emailIdx = headers.indexOf("email");
  const passIdx  = headers.indexOf("password");
  if (emailIdx === -1 || passIdx === -1) throw new Error("CSV must have 'email' and 'password' columns");
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    return { email: cols[emailIdx], password: cols[passIdx] };
  });
}

async function main() {
  const csvPath = path.join(__dirname, "users.csv");
  const rows = parseCSV(csvPath);
  console.log(`\nSyncing passwords for ${rows.length} users...\n`);

  let ok = 0, notFound = 0;

  for (const { email, password } of rows) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`  ⚠ NOT IN DB: ${email}`);
      notFound++;
      continue;
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash } as any,
    });
    console.log(`  ✓ ${email}`);
    ok++;
  }

  console.log(`\nDone: ${ok} updated, ${notFound} not found.\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
