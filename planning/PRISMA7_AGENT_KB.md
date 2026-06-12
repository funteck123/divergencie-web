# Prisma 7 — Agent Knowledge Base
> Sourced from official Prisma documentation (May 2026).
> Sources: [Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) · [SQLite Quickstart](https://www.prisma.io/docs/prisma-orm/quickstart/sqlite) · [SQLite Existing Project](https://www.prisma.io/docs/getting-started/prisma-orm/add-to-existing-project/sqlite) · [Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) · [Official AI Migration Prompt](https://www.prisma.io/docs/ai/prompts/prisma-7)

---

## 1. What Changed in Prisma 7 (Breaking Changes)

### 1.1 Provider: `prisma-client-js` → `prisma-client`

The old `prisma-client-js` provider is deprecated and will be removed. Must use `prisma-client`.

```prisma
// BEFORE (v6)
generator client {
  provider   = "prisma-client-js"
  engineType = "binary"
}

// AFTER (v7)
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}
```

### 1.2 `output` is now REQUIRED

Prisma Client will **no longer** be generated in `node_modules` by default. You must specify a custom output path in the `generator` block.

- The `output` path is relative to the `schema.prisma` file location.
- Common pattern: `output = "../src/generated/prisma"` (if schema is in `prisma/`)
- After changing output, **all imports must be updated** from `@prisma/client` to the new path.

```ts
// BEFORE (v6)
import { PrismaClient } from '@prisma/client'

// AFTER (v7) — path depends on output setting and file location
import { PrismaClient } from '../generated/prisma/client'
// or with Next.js @/* alias:
import { PrismaClient } from '@/generated/prisma'
```

### 1.3 `url` in `datasource` block is REMOVED

The `url`, `directUrl`, and `shadowDatabaseUrl` fields in `datasource db {}` are deprecated in v7. Move them to `prisma.config.ts`.

```prisma
// BEFORE (v6)
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// AFTER (v7) — no url field
datasource db {
  provider = "sqlite"
}
```

Keep `provider` exactly as-is. Remove only the `url = ...` line. Preserve any other properties (`relationMode`, `schemas`, `extensions`, etc.).

### 1.4 Driver Adapters are now REQUIRED for all databases

In v7, `new PrismaClient()` without an adapter throws an error. Every database requires a driver adapter.

| Database | Adapter Package |
|----------|----------------|
| SQLite (Node.js) | `@prisma/adapter-better-sqlite3` |
| SQLite (Bun) | `@prisma/adapter-libsql` |
| PostgreSQL | `@prisma/adapter-pg` |
| MySQL/MariaDB | `@prisma/adapter-mariadb` |
| CockroachDB | `@prisma/adapter-pg` |
| Neon | `@prisma/adapter-neon` |
| PlanetScale | `@prisma/adapter-planetscale` |
| D1 | `@prisma/adapter-d1` |
| MSSQL | `@prisma/adapter-mssql` |

### 1.5 ESM is now required

Prisma 7 ships as an ES module. Projects must set `"type": "module"` in `package.json`.

```json
{
  "type": "module"
}
```

`tsconfig.json` must target ESM:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 1.6 Environment variables NOT auto-loaded

Prisma 7 does NOT automatically load `.env` files. Must use `dotenv` explicitly (except Bun, which loads `.env` automatically).

```ts
import "dotenv/config"; // must be first line
```

### 1.7 Client middleware (`$use`) removed

`prisma.$use()` middleware API has been removed. Replace with [Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions).

### 1.8 Minimum versions

| Runtime | Minimum | Recommended |
|---------|---------|-------------|
| Node.js | 20.19.0 | 22.x |
| TypeScript | 5.4.0 | 5.9.x |

---

## 2. `prisma.config.ts` — Complete Reference

The config file must be at the **project root** (same level as `package.json`). It configures the Prisma CLI — not the runtime client.

### Full structure

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Path to schema file (or folder for multi-file schemas)
  schema: "prisma/schema.prisma",

  // Migration config
  migrations: {
    path: "prisma/migrations",       // where migration files are stored
    seed: "tsx prisma/seed.ts",      // replaces package.json prisma.seed
  },

  // Database URL for CLI operations (migrate, generate, studio)
  datasource: {
    url: env("DATABASE_URL"),         // type-safe env helper — throws if missing
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),  // optional
  },
});
```

### Alternative: `process.env` directly (no throw on missing)

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### Key rules
- `env("DATABASE_URL")` — type-safe, throws at startup if var missing
- `process.env["DATABASE_URL"]` — silent undefined if missing
- `import "dotenv/config"` must be the first line to load `.env`
- `prisma.config.ts` configures the **CLI only** — the runtime client gets its URL from the adapter
- Remove `prisma.seed` from `package.json` — it's now in `migrations.seed` here

---

## 3. `prisma/schema.prisma` — v7 Correct Form

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  // NO url field — managed by prisma.config.ts
}

// All models remain unchanged
model User {
  id    String @id @default(cuid())
  email String @unique
  // ...
}
```

**Rules:**
- `provider = "prisma-client"` — NOT `prisma-client-js`
- `output` is required — set relative to the schema file
- No `url`, `directUrl`, or `shadowDatabaseUrl` in datasource
- No `previewFeatures = ["driverAdapters"]` — remove it
- No `engineType` attribute — remove it
- All models stay exactly as-is

---

## 4. `src/lib/db.ts` — Correct v7 Pattern (SQLite + Next.js)

This is the standard singleton pattern for Next.js with hot-reload protection.

```ts
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";          // matches output path
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

**Rules:**
- Import from the generated output path, not `@prisma/client`
- The `@/` alias resolves to `src/` via `tsconfig.json` paths
- Adapter takes `url` — must be a `file:` protocol string for SQLite (e.g. `"file:./dev.db"`)
- `globalThis` singleton prevents multiple PrismaClient instances during hot-reload
- `import "dotenv/config"` ensures `.env` is loaded before the URL is read
- Do NOT use `pathToFileURL()` — use the raw `file:./dev.db` string directly

---

## 5. `src/lib/db.ts` — Other Databases

### PostgreSQL

```ts
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

### SQLite with Bun (use libsql instead)

```ts
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });
export { prisma };
```

---

## 6. `prisma/seed.ts` — v7 Correct Pattern

```ts
import "dotenv/config";                                           // must be first
import { PrismaClient } from "../src/generated/prisma";          // matches output
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  // seed logic here
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

**Rules:**
- Import path is relative from `prisma/` to the generated client — adjust for your output setting
- For PostgreSQL use `PrismaPg` with `connectionString` instead
- Seed command moves from `package.json#prisma.seed` to `prisma.config.ts#migrations.seed`

---

## 7. `.env` File

```env
DATABASE_URL="file:./dev.db"
```

**SQLite URL rules:**
- Must use `file:` protocol (not `file://`, not absolute paths)
- Relative to `prisma.config.ts` location (project root)
- `file:./dev.db` → `dev.db` at project root
- `file:./prisma/dev.db` → `dev.db` inside `prisma/` folder

---

## 8. Complete `package.json` Setup

```json
{
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/adapter-better-sqlite3": "^7.x",
    "@prisma/client": "^7.x",
    "@prisma/config": "^7.x",
    "better-sqlite3": "^12.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.x",
    "prisma": "^7.x",
    "tsx": "^4.x"
  }
}
```

**Note:** `prisma.seed` in `package.json` is deprecated in v7. Use `migrations.seed` in `prisma.config.ts` instead.

---

## 9. `next.config.ts` Required Setting

Next.js needs to be told that `better-sqlite3` and the Prisma client are server-only packages:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "better-sqlite3"],
};

export default nextConfig;
```

---

## 10. Running Commands

```bash
# Generate client (must re-run after any schema change)
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name your_migration_name

# Run seed (uses command from prisma.config.ts migrations.seed)
npx prisma db seed

# Or run seed directly
npx tsx prisma/seed.ts

# Open Prisma Studio (uses prisma.config.ts datasource automatically)
npx prisma studio

# Verify DB state from a script
npx tsx --eval "
import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
console.log(await p.user.count());
await p.\$disconnect();
"
```

---

## 11. v6 → v7 Migration Checklist

Use this checklist when upgrading an existing project.

### Dependencies
- [ ] `prisma` → `^7.x`
- [ ] `@prisma/client` → `^7.x`
- [ ] Add `@prisma/adapter-better-sqlite3` (or adapter for your DB)
- [ ] Add `dotenv` if not already present
- [ ] Add `tsx` to devDependencies

### `package.json`
- [ ] Add `"type": "module"`
- [ ] Remove `"prisma": { "seed": "..." }` (move to `prisma.config.ts`)
- [ ] Add `"postinstall": "prisma generate"` (optional but recommended for deploys)

### `tsconfig.json`
- [ ] `"module": "ESNext"`
- [ ] `"moduleResolution": "bundler"`
- [ ] `"target": "ES2023"`

### `prisma/schema.prisma`
- [ ] `provider = "prisma-client"` (not `prisma-client-js`)
- [ ] `output = "../src/generated/prisma"` (or your chosen path)
- [ ] Remove `url = env("DATABASE_URL")` from datasource block
- [ ] Remove `previewFeatures = ["driverAdapters"]` if present
- [ ] Remove `engineType = "binary"` if present

### `.env`
- [ ] `DATABASE_URL="file:./dev.db"` present and correct

### `prisma.config.ts`
- [ ] At project root
- [ ] `import "dotenv/config"` as first line
- [ ] `datasource.url` set via `env("DATABASE_URL")`
- [ ] `migrations.seed` set (replaces `package.json#prisma.seed`)

### `src/lib/db.ts`
- [ ] Import from generated path, not `@prisma/client`
- [ ] `PrismaBetterSqlite3` adapter instantiated with `url: process.env.DATABASE_URL!`
- [ ] `globalThis` singleton pattern in place
- [ ] No `pathToFileURL()` hack

### `prisma/seed.ts` (and any other seed files)
- [ ] `import "dotenv/config"` as first line
- [ ] Import `PrismaClient` from generated path (relative)
- [ ] Adapter instantiated with `url: process.env.DATABASE_URL!`

### After code changes
- [ ] `npx prisma generate` — regenerates client at new output path
- [ ] All imports updated to use generated path
- [ ] `npm run build` passes
- [ ] DB queries work in dev server

---

## 12. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `PrismaClient requires a driver adapter` | Called `new PrismaClient()` with no adapter | Add `adapter: new PrismaBetterSqlite3(...)` |
| `Cannot find module '@prisma/client'` | Import not updated after adding `output` | Change import to `from '@/generated/prisma'` |
| `The datasource property url is no longer supported` | `url` still in `schema.prisma` datasource | Remove `url` line from datasource block |
| `DATABASE_URL is not defined` | `.env` not loaded or var missing | Add `import "dotenv/config"` as first line; check `.env` |
| `P1012 error` | Schema validation failure (old provider, leftover fields) | Update generator to `prisma-client`, remove deprecated fields |
| DB not found / wrong path | `file://` absolute URL used instead of `file:` relative | Use `file:./dev.db` format, not `pathToFileURL()` |
| Auth returns "invalid credentials" with no error | DB crash swallowed in `try/catch` returning `null` | Add error surface in dev: `if (dev) throw error` |
| Build fails: `useSearchParams()` not in Suspense | Next.js 16 requires Suspense wrapper | Wrap component using `useSearchParams` in `<Suspense>` |

---

## 13. DivergenCIE-Specific Fix Summary

This section maps the generic rules above to the exact files in this repo.

### File change map

| File | What to change |
|------|---------------|
| `.env` | Add `DATABASE_URL="file:./dev.db"` (line was deleted) |
| `prisma/schema.prisma` | `provider = "prisma-client"`, add `output = "../src/generated/prisma"`, keep datasource as-is (no url) |
| `prisma.config.ts` | Replace `pathToFileURL()` with `url: env("DATABASE_URL")` |
| `src/lib/db.ts` | Import from `@/generated/prisma`, remove Edge Runtime guard and `pathToFileURL()` |
| `prisma/seed.ts` | Update import to `from "../src/generated/prisma"`, add `preChecked` updateMany |
| `prisma/seed-categories.ts` | Update import to `from "../src/generated/prisma"` only |

### Run order after changes

```bash
npx prisma generate
npx tsx prisma/seed.ts
npx tsx prisma/seed-categories.ts
npm run build
npm run dev
```

### Expected DB state after seeding

```
Users:      19
Categories: 26 (from seed-categories.ts)
preChecked: 18 (all non-students)
```
