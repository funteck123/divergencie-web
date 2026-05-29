// scratch/check_all_dev_users.cjs
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const Prisma = require("@prisma/client");

const { PrismaClient } = Prisma;

const url = "file:./dev.db";
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== All Users in dev.db ===');
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: "${u.name}", Role: "${u.role}", Active: ${u.active}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
