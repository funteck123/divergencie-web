# DivergenCIE — Development Plan (Phase 2: Infrastructure & Portals)

## INTRO

**Domain:** divergencie.co.uk
**Stack:** Next.js 15 · App Router · TypeScript · Prisma · SQLite · NextAuth v5 · Tailwind v4 · Lucide React · Satoshi Font · Lottie 
**Legacy Backup:** `planning/old_migration_plan.md`

---

## 🤖 AGENT PERSONA

You are **Antigravity** — Senior FullStack Engineer at DivergenCIE. You ship verified production-quality Next.js 15/TS code with zero bloat. You prioritize aesthetics, performance, and type safety.

---

## 🔋 TOKEN EFFICIENCY — AGENT RULES (CAVEMAN)

- **Caveman rule:** Strip all filler. No "I will now", "please note". Short words win. 
- **Code only when asked.** Never paste code into chat — it lives in files.
- **Confirmations = 1 line.** e.g. `✅ Portal Nav done.`
- **Never `cat` large files** — use `grep` or targeted views.
- **High quality is non-negotiable.**

---

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` section.
2. Respect Next.js architecture: `src/lib` for logic, `src/components` for UI.
3. **Universal Theme Support:** Every page MUST support both light and dark modes.
4. Update `PLAN.md` at the end of every turn.

---

## 🎓 Handouts — Troubleshooting & Critical Fixes

### 1. Prisma 7 Schema Support
- **Issue**: `url = env("DATABASE_URL")` in `schema.prisma` causes validation error P1012 in Prisma 7.
- **Fix**: Connection URLs must now be moved to `prisma.config.ts`. Remove `url` from `schema.prisma`.
- **Command**: `npx prisma db push` automatically reads from `prisma.config.ts`.

### 2. CLI/NextAuth Authentication
- **Issue**: `curl` login requests fail with `Unauthorized` due to missing CSRF cookie persistence.
- **Fix**: Must use a cookie jar (`-c` and `-b`) for *all* steps.
- **Workflow**:
  1. `curl -c jar /api/auth/csrf` (Saves `authjs.csrf-token` cookie)
  2. `curl -b jar -c jar -X POST /api/auth/callback/credentials ...` (Sends CSRF cookie + body token)

### 3. Ticket System Visibility
- **Issue**: Staff members couldn't see tickets assigned to them if the ticket was outside their primary department.
- **Fix**: Broadened the `where` clause in `GET /api/tickets` to use an `OR` condition including `assigneeId: userId`.

### 4. Prisma 7 & Edge Runtime Decoupling
- **Issue**: Prisma 7 Client relies on Node-specific modules (`node:path`, `node:url`) which crash in the Next.js Edge Runtime (Middleware).
- **Fix**: Decouple `NextAuthConfig` into an edge-safe file (`src/lib/auth.config.ts`) and import it in `proxy.ts`. Keep DB-dependent providers in `src/lib/auth.ts` (Node only).

### 5. SQLite Malformation Recovery
- **Issue**: `database disk image is malformed` error occurs during high concurrency or schema mismatch.
- **Fix**: Kill all `node` processes, delete `dev.db`, delete `prisma/migrations`, and re-run `npx prisma migrate dev`.

### 6. ESM & TypeScript Configuration for Prisma 7
- **Issue**: Prisma 7 requires ESM (`"type": "module"`) and modern TS targets.
- **Fix**: Set `package.json` to `"type": "module"`, `tsconfig.json` target to `"ES2023"`, and ensure `import "dotenv/config"` is the first line in `src/lib/db.ts`.

## 🏗️ DEVELOPMENT PHASES

### Phase 1: Public Migration (✅ COMPLETED)
- [x] Core pages migrated from legacy.
- [x] Theme engine & Satoshi font integration.
- [x] Fully responsive mobile navigation.

### Phase 2: Portal Migration (✅ COMPLETED)
- [x] **Unified Sidebar**: Role and Dept-based navigation logic implemented.
- [x] **Role Dashboards**: All 12 UJM roles have dedicated functional dashboards.
- [x] **Dept Logic**: Staff portal dynamically adapts to PR, HR, Finance, Marketing, IT.

### Phase 3: Infrastructure Integration (✅ COMPLETED)
- [x] **Database**: Prisma SQLite schema covering all UJM entities.
- [x] **Auth**: NextAuth v5 role protection & department mapping.
- [x] **Ticketing**: Unified inter-departmental ticket routing system.
- [x] **Stability**: Fixed search parameter suspense boundaries and build errors.

### Phase 4: Strategy & Product Polish (🏗️ IN PROGRESS)
- [x] **Mock Simulator**: Integrated real quiz logic with persistent scoring (Item 1).
- [ ] **Lead Generation**: Connect "Enrol Now" form to DB (Item 2).
- [ ] **Real Integrations**: Stripe/FPX, WhatsApp Business API, Zoom Webhook (Phase 2).
- [ ] **Performance**: Image optimization, static generation where possible.

### Phase 5: UJM Full Implementation (✅ COMPLETED — 2026-05-20)
- [x] **All portals DB-connected** — zero hardcoded data arrays, zero stubs
- [x] **HR portal**: candidates CRUD from DB, pipeline stage advance, staff records
- [x] **Finance portal**: invoices real DB, FIN-05 reminder stage tracker (5 WA templates), FIN-06 pre-check gate
- [x] **Marketing portal**: posts calendar from DB, KPI stats from DB
- [x] **IT portal**: access log + IT roadmap (IT-05) with integration status board
- [x] **PR portal**: attendance logging, schedule page with real groups+missed sessions
- [x] **Student portal**: curriculum (real syllabus, persisted progress), progress (real aggregates), recordings (auto-publish from attendance), assignments (real DB), classes (real sessions)
- [x] **Parent portal**: dashboard + progress report — real linked children from DB
- [x] **Management portal**: metrics real aggregates, budget + claims approval workflow, user management DB
- [x] **Seed data**: full realistic dummy data for all 11 roles
- [x] **CONTENT_POPULATION_GUIDE.md**: walkthrough for replacing all dummy data with real operational data
- [x] **Git history**: 10 commits with one-line descriptions each

---

## 📖 Handoff Notes — v91
**Completed (v91 → v1 Final):** 
- ✅ Ticket System: Complete (stack routing, displayId, locking, permissions matrix)
- ✅ All portals DB-connected — no stubs, no hardcoded arrays
- ✅ FIN-05 Reminder Stage Tracker (5-stage WA chain)
- ✅ FIN-06 Pre-Check Gate (student activation by Finance)
- ✅ IT-05 Roadmap page (integration status board + custom tasks)
- ✅ Attendance auto-publishes recording (TCH-03)
- ✅ getMonthlyStats uses real attendance+hourlyRate
- ✅ Full seed data all 11 roles
- ✅ CONTENT_POPULATION_GUIDE.md
- ✅ UI Refinement: Added Department/Assignee Lockout — staff can only reply if ticket is in their department/assigned to them.
- ✅ Logic Enforcement: Assignee is automatically cleared when a ticket is forwarded to a new department (waiting for new supervisor).
- ✅ UI Refinement: Enabled GDrive attachments for both Official Replies and Internal Notes.
- ✅ UI Refinement: Redesigned header to show Current Dept, Assignee, and Root Target clearly.
**Next (Phase 2 — Post-Launch):**
- ⬜ Stripe/FPX/Razorpay payment gateway integration
- ⬜ WhatsApp Business API (replace manual WA links with API sends)
- ⬜ Zoom webhook (auto-import recording URLs)
- ⬜ Google OAuth (NextAuth config ready, needs credentials)
- ⬜ In-app notification system (SHR-06)
- ⬜ Enrolment form server action (PUB Lead → DB)
- ⬜ Invoice PDF generation (PAY-09)
- ⬜ Parent automated attendance alerts (PAR-08)
- ⬜ PR-02 full schedule manager with conflict detection
- ⬜ HR-03 interview self-service calendar

**NOTE: Every agent MUST add a one-line description to every commit.**
