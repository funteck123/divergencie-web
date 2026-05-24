import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Prisma from "@prisma/client";

const { PrismaClient } = Prisma;

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

const url = process.env.DATABASE_URL || "file:./dev.db";

if (!process.env.DATABASE_URL) {
  console.error("[DB] DATABASE_URL is missing in .env!");
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;