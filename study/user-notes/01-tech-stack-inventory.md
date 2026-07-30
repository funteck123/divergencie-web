# Tech Stack & Skills Inventory — DivergenCIE v7

Goal: if AI tooling vanished tomorrow, could you rebuild and maintain this app
yourself? This is the list of everything you'd need to actually know. Ordered
by how much of the app's daily operation depends on it (top = learn first).

Confirmed from `package.json` and the codebase directly — not guessed.

## Tier 1 — you touch this every day

| Skill | Where it shows up here | Why it's Tier 1 |
|---|---|---|
| **JavaScript (ES2023+)** | everything — `app/`, `lib/` | the whole app is JS, not TS (despite `typescript` being a devDependency for tooling/types only) |
| **React 19** | every `.jsx` file, `components/`, `app/**/page.js` | UI layer. Hooks (`useState`, `useEffect`), component composition |
| **Next.js 16 App Router** | `app/api/*/route.js`, `app/dashboard/*/page.js` | routing, API routes, server/client component split, `instrumentation.js`. **This version has real breaking changes from older Next.js tutorials** — that's why `AGENTS.md` tells agents to read `node_modules/next/dist/docs/` first. You should too. |
| **SQL (Postgres)** | every migration in `data/tmp/*.sql`, `read_full_db()` | you are hand-writing raw SQL for this project — not using an ORM. Need to actually read/write `CREATE TABLE`, `CREATE OR REPLACE FUNCTION`, `jsonb_agg`, indexes |
| **Git** | your entire workflow (branches, worktrees, commits, merge --ff-only) | non-negotiable baseline for any dev job |
| **REST API design** | every `app/api/*/route.js` (GET/POST/PATCH) | request/response shape, status codes, auth checks per-route |

## Tier 2 — you configure/debug this weekly

| Skill | Where it shows up here |
|---|---|
| **Supabase** (Postgres-as-a-service + client SDK) | `lib/db-supabase.js`, `@supabase/supabase-js` |
| **Vercel** (hosting, env vars, deploys) | the entire deploy pipeline, `vercel.json`/CLI |
| **Environment variables & secrets** | `.env.local`, Vercel env dashboard, never-commit discipline |
| **Sentry** (error monitoring/APM) | `instrumentation.js`, `instrumentation-client.js` |
| **Tailwind CSS v4** | all component styling |
| **Auth/session patterns** (cookies, server-side session checks) | `lib/authz.js` (`requireSession`, `requireManagement`) |

## Tier 3 — used but narrower surface area

| Skill | Where it shows up |
|---|---|
| Zod (schema validation) | request body validation in API routes |
| Framer Motion | animations in UI |
| `canvas` (node-canvas) | server-side image generation (the weekly schedule image) |
| Firebase Admin | check `lib/` for what this backs — likely auth or storage, confirm before assuming unused |
| MCP (Model Context Protocol) | `mcp/server.mjs` — this is *you exposing your own app to AI agents*, worth understanding since it's unusual for a first project |
| ESLint | code quality gate, runs via `npm run lint` |

## The architecture idea you specifically need to internalize

This app does **not** use an ORM (Prisma, Drizzle, etc.) despite `divergencie`
having an older Prisma-based version. Instead:

- Every "table" stores one row per record as `{id, data: jsonb, created_at, updated_at}`.
- Reads go through a single Postgres function `read_full_db()` that is
  **hardcoded** — every collection is listed explicitly, not looped
  dynamically. Adding a table means editing this function by hand.
- Writes go through a generic `sync_table` RPC that does a full destructive
  replace-sync per collection.

This is a deliberate but unusual pattern. Most companies use an ORM +
migrations tool (Prisma, Drizzle, TypeORM, ActiveRecord, SQLAlchemy) instead
of hand-rolled JSONB blobs. Understanding *why* this project didn't will
teach you more about tradeoffs than any book chapter — study both the
pattern here AND the "normal" ORM pattern so you can compare.

## What a "normal" company stack looks like differently (things to know exist)

- **Testing**: this project currently has none (no Jest/Vitest/Playwright).
  Real teams use unit tests (Vitest/Jest) + integration tests + E2E
  (Playwright/Cypress) as a merge gate.
- **CI**: no GitHub Actions / CI pipeline configured yet — deploys are manual
  (`git push` → Vercel's GitHub integration auto-builds). See note 02 for
  what to add and why.
- **Type safety**: TypeScript is installed but the app is written in plain
  `.js`/`.jsx`. Most production teams write actual `.ts`/`.tsx` for the
  compiler's guarantees, not just for editor autocomplete.
- **ORM/migrations tool**: as above — Prisma or Drizzle would replace the
  hand-written SQL + hardcoded `read_full_db()` pattern with generated,
  versioned migrations.

## Study plan for this tier list (rough time budget)

Assuming ~1 hour/day, no prior professional dev experience:

| Topic | Time to "comfortable" | Time to "could interview on it" |
|---|---|---|
| JavaScript fundamentals | 4–6 weeks | 3 months |
| React | 3–4 weeks (after JS) | 3 months |
| Next.js App Router specifically | 2 weeks (after React) | 2 months |
| SQL | 3 weeks | 2 months |
| Git (real workflows: rebase, worktrees, conflict resolution) | 2 weeks | ongoing — you learn this on the job forever |
| REST API design + auth | 2 weeks | 2 months |
| Supabase/Postgres-as-a-service | 1 week (thin layer over SQL + Postgres) | — |
| Testing (Vitest/Playwright) | 2 weeks | 1 month |
| CI/CD (GitHub Actions) | 1 week basics, ongoing depth | 1–2 months |

**Realistic total to "solid junior developer who could get hired"**: ~6–9
months of consistent, project-driven study (not just reading — building).
**To "the kind of expert who reviews architecture decisions"**: 2–4 years,
most of it only achievable by *shipping real things people depend on*, not
from books alone. This is not a discouraging number — it's the same
timeline every working engineer you'd ask went through.

## Primary resources (from actual research, not memory)

- *The Pragmatic Programmer* (Hunt & Thomas) — practices, not syntax
- *Clean Code* (Robert C. Martin) — controversial in places, still widely read
- *Code Complete* (Steve McConnell) — long, but the closest thing to a
  complete engineering-practice reference
- *Designing Data-Intensive Applications* (Kleppmann) — read this once SQL
  and APIs feel comfortable; it explains *why* patterns like this project's
  JSONB-blob-sync exist and what they trade away
- [roadmap.sh](https://roadmap.sh) — up-to-date, visual, per-topic learning paths (JS, React, Next.js, Postgres, DevOps all have dedicated roadmaps)
- Official docs first, always, for anything version-specific: this project's
  own `AGENTS.md` rule ("read `node_modules/next/dist/docs/`") is genuinely
  good practice, not just a project quirk — docs drift faster than any book.

See `02-software-release-and-cicd.md` for the release-process side of this,
which you asked about separately.
