// scratch/check_users_instructors.cjs
const fs = require('fs');
const XLSX = require('xlsx');
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const Prisma = require("@prisma/client");

const { PrismaClient } = Prisma;

const url = "file:./dev.db";
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['teacher', 'staff', 'management'] }
    }
  });

  console.log('=== Active Users in Production DB ===');
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: "${u.name}", Role: "${u.role}"`);
  });

  const xlsxPath = 'Data/DC Database 2026.xlsx';
  const fileBuffer = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });

  const servicesSheet = wb.Sheets['Services'];
  if (servicesSheet) {
    const rows = XLSX.utils.sheet_to_json(servicesSheet, { defval: "" });
    const instructors = new Set();
    rows.forEach(r => {
      const inst = String(r['Instructor'] || "").trim();
      if (inst) instructors.add(inst);
    });

    console.log('\n=== Instructor Names in Services Sheet ===');
    Array.from(instructors).forEach(inst => {
      console.log(`- "${inst}"`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
