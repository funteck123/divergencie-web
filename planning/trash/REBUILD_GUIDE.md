# DivergenCIE Portal — Fix & Rebuild Guide

> All fixes verified against [Prisma 7 official docs](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) and [Prisma SQLite quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/add-to-existing-project/sqlite). Copy-paste safe.

---

## Root Cause Summary

The repo is on **Prisma 7.8.0** but the config files (`schema.prisma`, `db.ts`, `prisma.config.ts`) follow the **Prisma 6 pattern**. Prisma 7 has breaking changes for all three. Additionally the `.env` is missing `DATABASE_URL` entirely, and two seeds were never run.

| # | What's broken | Why |
|---|---------------|-----|
| 1 | `.env` missing `DATABASE_URL` | Was deleted and replaced with a comment — Prisma can't find the DB |
| 2 | `schema.prisma` uses old `prisma-client-js` provider, no `output` | Prisma 7 requires `prisma-client` provider and explicit `output` path |
| 3 | `db.ts` imports from `@prisma/client` (old path) | After fixing schema, generated client lives at the `output` path |
| 4 | `prisma.config.ts` uses manual `pathToFileURL()` hack | Should just use `env("DATABASE_URL")` — the hack caused path mismatch |
| 5 | `seed-categories.ts` never run | `TicketCategory` table is empty — category dropdown broken |
| 6 | All users have `preChecked = false` | Non-students get redirect-looped; looks like login is broken |

---

## Exact Files to Change (6 total)

```
.env
prisma/schema.prisma
prisma.config.ts
src/lib/db.ts
prisma/seed.ts
prisma/seed-categories.ts   ← run only, no edits needed
```

Nothing else. All 23 `src/lib/actions/*.ts` and `src/app/api/**` files import from `@/lib/db` — they are untouched.

---

## Fix 1 — `.env`

Restore the missing `DATABASE_URL` line.

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="divergencie-secret-change-in-prod"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Fix 2 — `prisma/schema.prisma`

Per [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7#prisma-schema-changes):
- `prisma-client-js` → `prisma-client`
- `output` is now **required**
- `url` in datasource stays absent (correct for Prisma 7 — managed by `prisma.config.ts`)

Replace the generator block only. Leave all models untouched.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

// ... all models remain exactly as-is
```

---

## Fix 3 — `prisma.config.ts`

Replace entirely. Remove the `pathToFileURL` hack — use `env()` as per the [official config docs](https://www.prisma.io/docs/prisma-orm/quickstart/sqlite).

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "npx -y tsx prisma/seed.ts",
  },
});
```

---

## Fix 4 — `src/lib/db.ts`

Replace entirely. Per [Prisma 7 SQLite docs](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7#driver-adapters-and-client-instantiation), import now comes from the generated output path, not `@prisma/client`.

```ts
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL!,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

> `@/generated/prisma` resolves to `src/generated/prisma` via the `@/*` alias in `tsconfig.json`. This matches the `output` path set in Fix 2.

---

## Fix 5 — `prisma/seed.ts`

Update the import path and add the `preChecked` fix for non-students. Everything else in the file stays identical.

**Change line 2** (import) and **add 4 lines** after the upsert loop:

```ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";   // ← changed from @prisma/client
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,                          // ← changed from hardcoded string
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // ... all existing user upsert code stays identical ...

  // ADD THIS after the upsert loop:
  await prisma.user.updateMany({
    where: { role: { not: "student" } },
    data: { preChecked: true },
  });
  console.log("✅ preChecked set for all non-students.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

---

## Fix 6 — `prisma/seed-categories.ts`

Update import path only. The logic is already correct.

**Change line 1** (import):

```ts
import { PrismaClient } from "../src/generated/prisma";   // ← changed from @prisma/client
```

Everything else stays identical.

---

## Run Sequence

After applying all 6 fixes above, run in this exact order:

```bash
# Step 1 — Regenerate client at the new output path (src/generated/prisma)
npx prisma generate

# Step 2 — Seed users + set preChecked
npx tsx prisma/seed.ts

# Step 3 — Seed ticket categories
npx tsx prisma/seed-categories.ts

# Step 4 — Verify
npx tsx --eval "
import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const p = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
});
console.log('Users:      ', await p.user.count());
console.log('Categories: ', await p.ticketCategory.count());
console.log('Tickets:    ', await p.ticket.count());
console.log('preChecked: ', await p.user.count({ where: { preChecked: true } }));
await p.\$disconnect();
"

# Step 5 — Build
npm run build

# Step 6 — Dev
npm run dev
```

**Expected verify output:**
```
Users:       19
Categories:  26
Tickets:     <existing, untouched>
preChecked:  18
```

---

## Login Test Matrix

Password for all: `demo`

| Email | Role | Expected landing |
|-------|------|-----------------|
| `management@divergencie.com` | management | `/portal/management` |
| `hr@divergencie.com` | staff/HR | `/portal/staff/hr` |
| `it@divergencie.com` | staff/IT | `/portal/staff/it` |
| `finance@divergencie.com` | staff/Finance | `/portal/staff/finance` |
| `pr@divergencie.com` | staff/PR | `/portal/staff/pr` |
| `teacher@divergencie.com` | teacher | `/portal/teacher` |
| `parent@divergencie.com` | parent | `/portal/parent` |
| `candidate@divergencie.com` | candidate | `/portal/candidate` |
| `student@divergencie.com` | student | `/portal/student/awaiting-approval` ✅ correct by design |

**Ticket test:**
1. Login as `hr@divergencie.com`
2. Create ticket → category dropdown must show HR categories
3. Submit → expect 201 and ticket appears in list

---

## What Was NOT Changed

| File | Reason |
|------|--------|
| `prisma/schema.prisma` models | All models correct and untouched |
| `schema.prisma` datasource | No `url` is correct for Prisma 7 |
| `src/middleware.ts` | Rename to `proxy.ts` is cosmetic only — not causing the bug |
| `src/lib/auth.ts` | Logic correct; DB errors will now surface naturally once DB connects |
| All `src/lib/actions/*.ts` | Import `@/lib/db` — unaffected by any change here |
| All `src/app/api/**` | Same — unaffected |
| `src/components/portal/Topbar.tsx` | Already inside `<Suspense>` in portal layout |
| `dev.db` | Existing data preserved entirely |
