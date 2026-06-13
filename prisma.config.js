import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL = direct connection (port 5432) — required for migrations/db push
// POSTGRES_PRISMA_URL = pooled pgBouncer (port 6543) — for runtime only
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
  migrations: {
    seed: "node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts",
  },
});
