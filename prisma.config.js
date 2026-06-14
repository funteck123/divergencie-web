import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL = Transaction mode pooler (port 6543)
// DIRECT_URL = direct connection (port 5432) — required for migrations/db push
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
const directUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
    directUrl,
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
