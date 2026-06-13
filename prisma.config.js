import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
  migrations: {
    seed: "node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts",
  },
});
