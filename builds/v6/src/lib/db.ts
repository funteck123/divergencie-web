import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "@/builds/v6/node_modules/@types/pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Strip sslmode from the connection string so we control SSL via the pool option directly.
// pg-connection-string treats sslmode=require as verify-full (new behaviour post v3 warning),
// which breaks against Supabase's self-signed cert chain. Setting ssl.rejectUnauthorized=false
// via the Pool constructor is the safe Supabase-recommended approach for hosted environments.
const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL!;
// Remove sslmode param; control SSL entirely via pool ssl option below.
const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/[?&]$/, '');
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;