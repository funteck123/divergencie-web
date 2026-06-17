# Backend Rebuild Plan — Contract-First Modular Monolith

> **Status:** Proposal. Authored by the architect lens of the review-council.
> **Premise:** The current backend is a Frankenstein of bridged stacks and shallow,
> half-built features. We are not patching it. We delete it and rebuild from scratch
> as deep, contract-first modules. **The UI stays** (new UI is added as needed; existing
> pages may be rewritten to consume the new contracts). **The database schema stays**
> (185 models, already designed across 31 clusters — it is the one solid asset).

---

## 0. The non-negotiable principles

These exist because the last attempt violated every one of them.

1. **Modular monolith, NOT microservices.** One app, one database, one deploy. A
   "module" is a directory with ONE public entry file (`index.ts`) and a hard rule:
   nothing outside the module may import anything except from that `index.ts`.
   The seam is a TypeScript signature, not an HTTP boundary. We do not add network
   hops to a system already drowning in bridge-code.

2. **The unit of work is ONE CONTRACT, not one feature.** A contract is a typed
   function signature + a written spec + a test suite that proves it. An agent's
   entire job in a chat is "make this signature true and these tests green." It
   cannot go shallow (shallow fails tests) and cannot sprawl (the contract forbids
   imports it doesn't declare).

3. **ONE BRICK = ONE CHAT = ONE PR.** Every brick is built in a fresh chat that sees
   only its own spec plus the *signatures* (never the code) of bricks it depends on.
   This is the core fix: the agent never has to hold the whole system in context.

4. **Depth before breadth.** We finish ONE vertical all the way down (pure logic ->
   repository -> orchestrator -> API -> UI wiring -> green tests) before starting the
   next. One fully-working Lego brick beats thirty half-built steps. We currently
   have zero working bricks; the goal is to get to ONE, then replicate the pattern.

5. **Pure core has zero I/O.** Business rules live in pure functions with no `prisma`,
   no `next`, no `supabase` imports. They are testable in milliseconds with no DB.
   This is the layer agents kept failing on — isolating it makes shallow impossible.

6. **One stack per concern. No bridges.** Decide once, delete the alternative:
   - **DB access:** Prisma only. Delete the raw `pg`/Supabase-client query paths.
   - **Auth:** Supabase Auth only. Delete the NextAuth-shaped shim (ISSUE-082).
   - **Authorization data:** one source of truth (see Module `auth`), not three (ISSUE-084).
   - No SQLite anything. No `xlsx`. No dead deps. (ISSUE-085 through 091.)

---

## 1. Target architecture

```
src/
  modules/
    <module>/
      contracts/        # types + spec docs — the public shape, written FIRST
      core/             # pure functions, zero I/O, exhaustively unit-tested
      repo/             # Prisma adapters — typed CRUD, no business logic
      service/          # orchestrators — compose core + repo, own transactions
      index.ts          # the ONLY public surface of this module
      __tests__/
  app/                  # Next.js routes + pages (UI). Thin. Calls module index.ts.
  platform/             # cross-cutting: db client, auth, scheduler, ids, money, errors
prisma/
  schema.prisma         # KEPT. Single generated client output (fix ISSUE-085).
```

**Module boundary rule (enforced by lint):** `app/` and module `service/` may import
`@/modules/<x>` (resolves to its `index.ts`). Nothing may reach into another module's
`core/`, `repo/`, or `service/` directly.

**Layering rule:** `core` imports nothing internal. `repo` imports `platform/db` +
`contracts` only. `service` imports its own `core` + `repo` + other modules' `index.ts`.
`app` imports `service` via `index.ts`. Dependencies point downward, never up or sideways.

---

## 2. What gets deleted (massive deletion, do this FIRST, in one PR)

Delete the entire current backend. It is not salvageable as a foundation; keeping it
invites more bridging. Frontend and schema are retained.

**Delete:**
- `src/lib/actions/` — all 26 action files.
- `src/app/api/**/route.ts` — all 54 route handlers (rebuilt per module, behind contracts).
- `src/lib/auth-client.tsx` (NextAuth shim), `src/lib/auth.ts`, `src/lib/db.ts`,
  `src/lib/db-init.ts`, `src/lib/supabase.ts`, `src/lib/conflict.ts`,
  `src/lib/rbac.ts`, `src/lib/ticketPermissions.ts`, `src/lib/whatsapp.ts`
  — rebuilt as `platform/*` and module code with single, clean implementations.
- `prisma/generated/` — duplicate 18MB client (ISSUE-085).
- Deps: `xlsx`, `@types/ws`, `bcryptjs`, `@types/bcryptjs`; `better-sqlite3` config
  in `next.config.ts` (ISSUE-086/087/088/089). Drop `User.passwordHash`.
- `scratch/` one-off scripts, `cookies.txt`, stale root docs (`db-plan.md`, etc.).

**Keep & freeze:**
- `prisma/schema.prisma` (the 185-model schema — our spec made real).
- `src/app/**/page.tsx` + `src/components/**` (UI — rewired later, not deleted).
- `.env` handling (but **rotate every leaked secret first** — see Section 7).

**Net effect:** after this PR the app does not build its backend. That is intended.
We rebuild upward from a clean slab, brick by brick.

---

## 3. The platform layer (built once, before any feature module)

These are shared bricks every module depends on. Each is its own chat/PR.

| Brick | Contract | Notes |
|---|---|---|
| `platform/db` | one `PrismaClient` singleton | Single generated-client path. No Supabase query client. |
| `platform/auth` | `getSession() -> Session \| null`; `requireRole(roles) -> Session` | Supabase Auth reads cookies; role/dept resolved from Prisma at request time (ONE source of truth — kills ISSUE-084). No JWT-metadata denorm. |
| `platform/money` | `Money` value object; currency-aware add/mul/convert | Kills GBP monoculture (ISSUE-045) and primitive-obsession on amounts. |
| `platform/ids` | branded id types (`UserId`, `SessionId`, ...) | Compile-time protection against passing the wrong id. |
| `platform/result` | `Result<T, E>` + typed error taxonomy | Every service returns this. No throwing across module boundaries. |
| `platform/scheduler` | `registerJob(name, fn)`; cron entrypoint | The missing scheduler (ISSUE-092 root). One cron route + `vercel.json` invokes registered jobs. |

**Definition of done for the platform layer:** an empty feature module can import all
six, typecheck, and run a trivial green test. No feature work starts until this is true.

---

## 4. Module decomposition (the build order)

The schema already groups into 31 clusters. Modules map onto those clusters but are
ordered by **dependency depth** (foundations first) — NOT by portal or by role. Each
module is a vertical slice that owns its tables and exposes one `index.ts`.

> **Build rule:** finish a module top-to-bottom (core -> repo -> service -> API -> UI
> wiring, all green) before starting the next. Within a module, build bricks bottom-up
> (core first). Each brick is a separate chat.

### Phase A — Foundation modules (everything depends on these)

| # | Module | Owns (schema clusters) | Public contract highlights |
|---|---|---|---|
| A1 | `identity` | User, *Profile, UserType, Department, StaffRole | `getUser`, `resolveRoleDept`, profile reads. Single dept-derivation (kills duplicated `SUBGROUP_PREFIX_TO_DEPT`). |
| A2 | `rbac` | PortalPermission, default-perm table | `can(session, action, resource) -> bool`. ONE authorization mechanism (kills ISSUE-034 bypass + the 3 parallel checks). |
| A3 | `lookups` | All Cluster-23/3 lookup tables + seed | `seedLookups()` incl. hard-dependency rows (UserType ALL, SessionType meeting types — Section 53). Fixes ISSUE-025. |

### Phase B — Scheduling subsystem (THE root blocker — ISSUE-092)

This is a project in itself. It is the first real proof the pipeline works. Bricks:

| # | Brick (each = one chat) | Layer | Contract |
|---|---|---|---|
| B1 | `expandRecurrence` | core (pure) | `(rule: RecurrenceRule, window: DateRange) -> DateTime[]`. All 6 recurrence types + DST + boundaries. ~40 tests. Zero deps. |
| B2 | `detectConflict` | core (pure) | `(candidate[], existing[]) -> Conflict[]`. Replaces `conflict.ts` as a pure, fully-tested fn. |
| B3 | `diffOccurrenceVsSessions` | core (pure) | `(expected[], actual[]) -> {missed, extra}`. The "missed = occurrence with no session" rule (Section 26.38). |
| B4 | `ScheduleRepository` | repo | typed CRUD over ServiceSchedule + ScheduleOccurrence (student/staff/ambassador/marketing chains). |
| B5 | `SessionRepository` | repo | typed CRUD over AcademicSession / Meeting / AmbassadorMeeting. |
| B6 | `generateSessionsForWindow` | service | composes B1+B4+B5 -> creates missing sessions. Idempotent. |
| B7 | `sessionGenerationJob` | service | registers with `platform/scheduler`; "Sunday midnight" trigger (Section 26.6). |
| B8 | API + UI wiring | app | schedule CRUD endpoints + wire existing schedule pages. |

**When Phase B is green, ISSUE-041, ISSUE-042, ISSUE-048 become buildable** (they are
downstream symptoms of the missing generator). They are scheduled AFTER B, not before.

### Phase C — Attendance & Curriculum (depend on Scheduling)

| # | Module | Owns | Notes |
|---|---|---|---|
| C1 | `attendance` | SessionAttendance, MeetingAttendance, strikes | No-show strike automation (ISSUE-041) as a pure `core` rule + scheduled job. |
| C2 | `curriculum` | Syllabus/Task/Mock/CourseTimeline + Ambassador mirror | TaskItem -> auto TaskSubmission (Section 26.30); chapter/recording links (Section 36). |
| C3 | `calendar` | CalendarItem | Populated by Scheduling + Meetings via events (ISSUE-042). |

### Phase D — Finance subsystem (depends on Identity, Scheduling, Curriculum)

| # | Module | Owns | Notes |
|---|---|---|---|
| D1 | `rates` | RateList, RateItem, CurrencyRate, change logs | Country->rate lookup with DEFAULT fallback (Section 26.18). Composite-unique fix (ISSUE-066). |
| D2 | `invoicing` | StudentInvoice, InvoiceLineItem, BillingMonth | Real generation (kills ISSUE-040 mock). HOURLY_FLEXIBLE dual-log reconcile + SERVICE_CORRECTION ticket (ISSUE-093). |
| D3 | `payroll` | Claim, Paycheck, *LineItem, change logs | One claim per list per month (Section 26.21, ISSUE-031). v11 FK split (ISSUE-057). |
| D4 | `ambassador-comp` | Commission, AmbassadorClaim, Paycheck | Commission auto-inactivate/resume lifecycle (ISSUE-095); real earnings (kills ISSUE-037). |
| D5 | `ledger` | LedgerEntry, AccountTransaction, budgets | Double-entry, multi-currency (ISSUE-044). |
| D6 | `payments` | PaymentMethod, PaymentRecord, Stripe | Receipt-link rule except Stripe (Section 26.35). |

### Phase E — Operations subsystems (depend on Identity + RBAC)

| # | Module | Owns |
|---|---|---|
| E1 | `tickets` | Ticket, TicketMessage, TicketHistory, perms, gating |
| E2 | `hr` | Candidate pipeline, *Record disciplinary, StudentFlag, submission-deadline warnings (ISSUE-094) |
| E3 | `meetings` | Meeting, GeneralMeeting, Sprint/Backlog (ISSUE-096 — build or formally drop) |
| E4 | `marketing` | MarketingPost/Slot/Campaign/Outreach + cadence (ISSUE-048, after B) |
| E5 | `referrals` | Referral, ReferralClick, Lead -> PR handoff (ISSUE-077) |
| E6 | `comms` | Notification, Announcement, Content, KnowledgeBank (already partly real — keep logic, re-home) |

### Phase F — Reporting & cross-cutting (depends on everything)

| # | Module | Owns |
|---|---|---|
| F1 | `metrics` | MetricSnapshot, ProgressReport — real monthly computation (kills ISSUE-028 `Math.random`) |
| F2 | `admin` | the allow-listed generic DB endpoint, rebuilt with RBAC + immutable-field guards |
| F3 | `audit` | SiteLog, AccessLog — typed, Json fields (ISSUE-072/073) |

---

## 5. The brick spec (the artifact every build-chat starts from)

Before ANY build chat, one "spec chat" produces this file and commits it under
`src/modules/<module>/contracts/<brick>.spec.md`. The build chat is given ONLY this
file + the type defs of declared dependencies. Template:

```
BRICK: <name>
MODULE: <module>   LAYER: core | repo | service | app
SIGNATURE: <exact TypeScript signature>
INPUT TYPES: <paste exact types — pulled from prisma or contracts>
OUTPUT TYPE: <exact type>
RULES: <numbered business rules, each citing the handoff section, e.g. Section 26.6>
MUST NOT IMPORT: <e.g. for core: prisma, next, supabase — anything with I/O>
DEPENDS ON: <other bricks, BY SIGNATURE ONLY — never their source>
DONE WHEN: <test file path> covers <enumerated cases> and is green;
           typecheck passes; module boundary lint passes.
```

The spec is the interface. "Make this true" is the whole job. This is what lets a
fresh chat go deep on a part-of-a-part without seeing the system.

---

## 6. Workflow per brick (each is a separate chat — your hard requirement)

1. **Spec chat** (architect/synthesizer): writes the brick spec + enumerated test cases.
   Output: one `.spec.md` committed. No implementation.
2. **Build chat** (fresh, isolated): given only the spec + dependency signatures.
   Writes the implementation + its tests. Done when green + lint + typecheck pass.
   Opens one PR. **New chat per brick.**
3. **Review** (review-council): the five lenses check the single PR. Small surface =
   deep review actually possible.
4. **Integration chat** (later, per module): given two finished, tested bricks + their
   specs. Wires them via `service/`. Small, because both sides are proven black boxes.

**Context budget per chat:** ~1 spec + ~1 file + N dependency signatures. Never the
whole system. This is the entire point.

---

## 7. Pre-flight (before deletion PR)

1. **Rotate every secret in `.env`** — Supabase service-role key, DB password, Stripe
   secret, and the GitHub PAT are all currently in the working tree (ISSUE-050 covers a
   prior leak). Rotate, then confirm `.env` is gitignored. Do this before touching anything.
2. **Tag the current state** (`git tag pre-rebuild`) so the old backend is recoverable
   for reference, even though we are not building on it.
3. **Freeze the schema** — agree the 185-model schema is the contract. Schema-drift
   issues (#55–#90) are folded into each module's repo brick, not fixed ad hoc.

---

## 8. First concrete move (do not start building yet — this is the sequence)

1. Pre-flight Section 7 (rotate secrets, tag, freeze schema).
2. Deletion PR (Section 2).
3. Platform layer (Section 3) — six bricks, six chats. Gate: empty module typechecks + green.
4. **Phase B, brick B1 `expandRecurrence`** — the first real proof. Pure, zero deps,
   unfakeable test suite, and the literal heart of the system's root blocker. If a
   fresh chat can deliver B1 solid, the pipeline is proven and we replicate outward.
   If it can't, we've learned that on the smallest possible piece — not across 30 steps.

---

## 9. Definition of "a working Lego brick" (so we never ship half-baked again)

A brick is DONE only when ALL hold:
- [ ] Typed contract committed before code.
- [ ] Implementation imports nothing its layer forbids.
- [ ] Test suite covers every enumerated rule case — green.
- [ ] `tsc --noEmit` clean. Module-boundary lint clean.
- [ ] No mocks standing in for real logic (a mock = not done).
- [ ] Reviewed by the council on its own small PR.

Partial = not merged. One real brick at a time. That is how we get from "not a single
component functioning" to a system that actually snaps together.
