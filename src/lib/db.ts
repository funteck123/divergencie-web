import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import Prisma from "@prisma/client";

const { PrismaClient } = Prisma;

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

if (!process.env.DATABASE_URL) {
  console.error("[DB] DATABASE_URL is missing in .env!");
}

function createPrismaClient() {
  const dbPath = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");

  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("cache_size = -32000");
  sqlite.pragma("mmap_size = 134217728");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("foreign_keys = ON");

  const adapter = new PrismaBetterSqlite3({ client: sqlite } as any);

  return new PrismaClient({ adapter } as any);
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;