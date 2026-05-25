import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/sandbox/client"; // generated to src/generated/sandbox, so relative from src/lib/ is ../generated/sandbox/client

const globalForSandbox = globalThis as unknown as {
  sandboxPrisma: PrismaClient | undefined;
};

const url = "file:./sandbox.db";

const sandboxPrisma =
  globalForSandbox.sandboxPrisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  } as any);

if (process.env.NODE_ENV !== "production") globalForSandbox.sandboxPrisma = sandboxPrisma;

export default sandboxPrisma;
