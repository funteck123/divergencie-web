# DivergenCIE Coaching — Build Plan & Session Tracker

## INTRO

**Domain:** divergencie.co.uk
**Stack:** Next.js 15 · App Router · TypeScript · Prisma · Supabase for Auth, DB and Storage · Tailwind v4 · Lucide React · Satoshi Font · Lottie

**Reference:** Athena Education homepage (https://athenaeducation.co.in/) — clone layout, rebrand for DivergenCIE · Altacademy (https://altacademy.org/) for relevant inspiration
**Real social links:** Instagram: https://www.instagram.com/divergencie_coaching/ · LinkedIn: https://www.linkedin.com/company/divergencie-coaching/ · WhatsApp: +919650675507

**Pathing Rule:** Assets in /public/assets/. Reference as /assets/... (Next.js root-relative).
**Theme Strategy:** Light mode default. Use next-themes (class strategy). Apply Tailwind dark: variants to all components. Persist via dc-theme key. Ensure Sun/Moon toggle is in the shared Nav component. Do NOT create tailwind.config.ts. All customizations (Gold accent, Satoshi font-family) must be defined inside app/globals.css using the @theme block to comply with Tailwind v4 standards.

---

## 🤖 AGENT PERSONA

You are **Cleo** — Senior FullStack Engineer at DivergenCIE. You ship verified production-quality Next.js 15/TS code with zero bloat based on brand identity and product outcome plan documents. You follow the token efficiency guide. You use Google searches to get inspiration or search guides/references.

---

## 📦 INPUTS — READ ON EVERY SESSION

**Session startup sequence (mandatory):**

1. `git log --oneline -5` — understand current state before touching anything
2. Read PLAN.md: Head (Intro through Rules) + Build Order table + last status
3. Ground truth — implement exactly, never edit:
   - `planning/schema-erd-v23.md`
   - `planning/system-logic-handoff-v23.md`
4. Additional reference in `planning/` (ERD + system logic take precedence):
   - `06_UJM_User_Journey_Map_v3.md` (user journey — most important)
   - `03_PRD_Product_Requirements_Document_v2.md` (requirements)
   - `01_BDG_Brand_Design_Guidelines_v1.md` (brand rules)
   - `12_MU_Mockup_Guide_v3.md` (mockup guide)
5. Cross-reference the next `⬜ TODO` task against spec docs before writing any code
6. Then proceed

---

## 🔋 TOKEN EFFICIENCY — AGENT RULES (CAVEMAN)

**Every token counts. Quality over quantity — always.**

- **Caveman rule:** Strip all filler. No "I will now", "please note", "as you can see". Short words win. Write like telegram. Subject → verb → object. "Build nav" not "I am going to proceed to build the navigation component". Every word earns its place or gets cut.
- **No session startup narration** — skip "I will now read PLAN.md…"; just act
- **Code only when asked.** Never paste code into chat — it lives in files — reference filename + line range only
- **Confirmations = 1 line.** e.g. `✅ Task P3-1 done.` Nothing more.
- **UJM/PRD cross-ref** — extract only sections relevant to task being built, not full doc read
- **Never `cat` large files** — use `grep -n "keyword" file` or `sed -n 'X,Yp'` to target sections
- **Skill files** — read once per session; never re-read same skill
- **High quality is non-negotiable.** Brevity never means cutting corners on the build.

## NOTE: DONT READ WHOLE DOCS IN CONTEXT AND CLEAR/COMPACT CONTEXT IF NEEDED.

---

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` task
2. Read `git log --oneline -5` to understand what was last built
3. Build one task per session. Respect Next.js architecture: use app/globals.css for theme variables, component-level styles only if strictly necessary. Shared logic in `src/lib/`, shared UI in `src/components/`. Page-specific logic inside respective `page.tsx`.
4. **Global Components:** When building inner pages or portals, use a "Source of Truth" for Nav and Footers.
5. **Universal Theme Support:** Every page defaults to **light mode**. When building any section, you MUST apply both light and dark styles.
6. After completing a task, update `⬜` to `✅` in the Build Order table, then commit:
   ```
   git add -A
   git commit -m "<type>(<task-id>): <what was built>"
   ```
7. Verify the build (mobile responsiveness, 404 links, TS compile errors). Mark ✅ only after verified.
8. Move to next `⬜ TODO` task autonomously — no need to stop and wait.

### 🔁 GIT COMMIT RULES

- Commit after every completed task — no exceptions
- Format: `<type>(<task-id>): <description>`
  - Types: `feat` · `fix` · `chore` · `refactor` · `style` · `docs`
  - Example: `feat(P3-1): add Department, StaffRole, UserType, PortalPermission models`
  - Example: `feat(M3): auth — NextAuth v5 credentials + middleware + login page`
- Commit message IS the handoff. Write it so the next agent understands state cold.
- No push — local commit only.

### 🚨 PLAN.md INTEGRITY RULES — NON-NEGOTIABLE

- **NEVER edit `PLAN.md` unless explicitly instructed by the user.**
- **NEVER shorten, summarise, compress, or remove any existing content from `PLAN.md`.**
- The only permitted writes per session: update `⬜` to `✅` in the Build Order table.
- **Do not "clean up", "reorganise", or "expand" `PLAN.md`** unless the user has explicitly asked.
- If you notice an error in `PLAN.md`, flag it in chat — do NOT silently fix it.

---

## ⚙️ SESSION OUTPUT RULES

1. One task per session
2. Complete task → verify → update status → commit → move to next task
3. Session flow: `git log` → Read PLAN.md → Build → Verify → Commit → Next task
4. Git log is the record. No handoff notes needed — commit messages carry the state.

---

## 🎨 BRAND TOKENS

### Dark Mode (activated by Sun/Moon toggle — stores in localStorage key `dc-theme`)

| Token | Value |
|-------|-------|
| Primary bg | `#0a0a0a` |
| Secondary bg | `#111111` |
| Tertiary bg | `#1a1a1a` |
| Gold accent | `#f5c842` |
| Gold dim | `#c9a030` |
| Text primary | `#ffffff` |
| Text muted | `rgba(255,255,255,0.55)` |
| Border subtle | `rgba(255,255,255,0.08)` |

### Light Mode (default on ALL pages — including homepage)

| Token | Value |
|-------|-------|
| Primary bg | `#ffffff` |
| Secondary bg | `#f4f4f4` |
| Tertiary bg | `#d5e8f0` |
| Navy | `#1a3c5e` |
| Gold accent | `#e8a832` |
| Sky blue | `#4a9fd4` |
| Coral | `#e05a4e` |
| Charcoal | `#5c5248` |
| Text primary | `#1a1a1a` |
| Text muted | `#666666` |
| Footer text | `#888888` |
| Light gold bg | `#fff8e7` |
| Info bg | `#d5e8f0` |

### Typography

| Usage | Font |
|-------|------|
| Web headings/UI | Satoshi (900/700/500/400) |
| Body (inner pages) | Inter — Google Fonts |
| Academic body | Merriweather — Google Fonts |
| Monospace | JetBrains Mono |

**Logo:** `assets/images/logo.jpg` — book icon with coloured tabs + bold serif wordmark
**Accreditation logos:** Cambridge Assessment International Education + CollegeBoard
**UK context:** Replace Ivy League → Oxford, Cambridge, LSE, Imperial, UCL, Durham, Warwick, Edinburgh

### CDN Links (exact, do not change)

```
Tailwind:  https://cdn.tailwindcss.com
Lucide:    https://unpkg.com/lucide@latest
Satoshi:   https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap
Lottie:    https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js
Inter:     https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
```

**Role badge colours:** student=green · parent=rose · teacher=teal · staff=blue · ambassador=amber · management=purple
**Active nav:** gold left border + gold text + gold-pale bg
**Login page:** split layout (left brand panel + right form) — NOT centered card

---

## 🗂️ FILE STRUCTURE (target)

> Canonical tree. Every portal, page, component, lib, API route, and the data/seed/test layer.
> Source of truth for placement: ground-truth `schema-erd-v23.md` + `system-logic-handoff-v23.md`.
> Data access = Prisma over Supabase Postgres. Auth = Supabase Auth + RBAC middleware. Storage = Supabase buckets. Payments = Stripe.

```
divergencie/
├─ prisma/
│  ├─ schema.prisma                 # 169 models — ground-truth ERD v23 (re-verified, never freehand)
│  └─ seed.ts                       # required seed data §53 + demo rows (Demo@1234)
├─ src/
│  ├─ middleware.ts                 # Supabase session + RBAC route gate (P0-1, P0-2)
│  ├─ app/
│  │  ├─ globals.css                # Tailwind v4 @theme block — brand tokens, Satoshi, light/dark
│  │  ├─ layout.tsx                 # root: theme provider, fonts
│  │  ├─ page.tsx                   # PUBLIC homepage (Athena clone, DB/CMS content)  [P-G1]
│  │  ├─ about|services|pricing|resources|contact/   # brochure pages, DB-wired       [P-G1]
│  │  ├─ careers/                   # job postings list + apply → Candidate/JobPosting [P-G2]
│  │  ├─ admissions/                # public RegistrationForm intake → Candidate       [P-G2]
│  │  ├─ r/[referralCode]/          # ambassador referral landing + ReferralClick      [P-G3]
│  │  ├─ auth/                      # login (split layout), logout, callback           [P0-1]
│  │  ├─ unauthorized/              # RBAC denial page
│  │  ├─ portal/
│  │  │  ├─ student/                # dashboard, awaiting-approval, curriculum, classes,
│  │  │  │                          #   recordings, assignments, mock, progress, fees, support  [PHASE A]
│  │  │  ├─ teacher/                # dashboard, attendance, doubts, claims, payment-claims, schedule, tickets  [PHASE B]
│  │  │  ├─ staff/                  # shared/{meetings,schedule,content-bank} + depts:
│  │  │  │                          #   finance/{invoices,claims,rates}, hr/{candidates,records},
│  │  │  │                          #   it/{access,roadmap}, marketing/{calendar,leads}, pr/{attendance,mapping,tracker}  [PHASE C]
│  │  │  ├─ ambassador/             # profile, programme, commission/claims, meetings, referrals, tickets  [PHASE D]
│  │  │  ├─ parent/                 # profile, progress, fees, support (linked students)  [PHASE E]
│  │  │  ├─ candidate/              # pre-hire pipeline self-view, profile, support
│  │  │  └─ management/             # dashboard/metrics, users, permissions(RBAC),
│  │  │                             #   announcements, budget, database(total-coverage admin grids)  [PHASE F]
│  │  └─ api/                       # route handlers (one group per sub-system; all re-verified vs system-logic)
│  │     ├─ auth/ · lookup/[table]/ · notifications/ · enrolments/ · schedules/ · sessions/
│  │     ├─ curriculum/ · invoices/ · claims/ · payments/{stripe,webhook,receipt}/ · metrics/
│  │     └─ onboarding/ · tickets/ · jobs/ · careers/ · management/{db,permissions}/ · users/ · referrals/
│  ├─ components/
│  │  ├─ shared/                    # Nav (role-aware + theme toggle), Footer, role badges, DataGrid, forms
│  │  └─ portal/                    # per-portal widgets
│  ├─ lib/
│  │  ├─ db.ts                      # Prisma client (Supabase pg adapter) — single source
│  │  ├─ auth.ts                    # Supabase Auth helpers, session, getCurrentUser
│  │  ├─ rbac.ts                    # PortalPermission resolver + default permissions (§38)
│  │  ├─ validation/                # zod schemas per sub-system (fail-loud input guards)
│  │  ├─ stripe.ts · supabase.ts · whatsapp.ts · conflict.ts
│  │  └─ actions/                   # server actions per domain (re-verified vs system-logic)
│  └─ tests/
│     └─ unit/ + integration/       # vitest — one suite per sub-system (DoD gate)
└─ public/assets/                   # images, logos, lottie
```

> **Total-coverage rule:** every one of the 169 `model` blocks in `prisma/schema.prisma` MUST be reachable through the UI. User-journey entities get bespoke portal pages; audit/log/lookup/snapshot tables (all `…StatusChangeLog`, `SiteLog`, `AccessLog`, `MetricSnapshot`, lookup tables) are surfaced via the generic admin grids under `portal/management/database/` (P-F3).

---

## 🏗️ PHASES + BUILD ORDER

> **Plan philosophy (locked with user, v6):**
> - **Sequencing:** vertical slices by role — each role shipped fully working before the next.
> - **Baseline:** full re-verify — every task starts `⬜` regardless of existing code; re-test & re-wire end-to-end against ground truth. No assumptions about current code.
> - **⚠️ Schema is NOT ERD-aligned — reconcile FIRST (task P0-S):** a verified diff (2026-06-14) found the current 169-model schema diverges from ERD v23 (~186 entities): ~11 tables still named `…StatusHistory` (ERD §44 mandates `…StatusChangeLog`), ~19 ERD entities missing entirely, pending renames (`InvoiceMonth`→`BillingMonth`), and ERD-contradicting extras to remove. **Full executor checklist in Appendix A.** Do NOT assume the schema is correct.
> - **Schema re-derived per phase:** before wiring a phase, re-validate that phase's models field-by-field against `schema-erd-v23.md`, correct drift, sync with `prisma db push` (no migration history).
> - **Granularity:** one task per **sub-system** (~45 tasks). A task is a coherent capability wired end-to-end.
> - **Scope:** total coverage — all 169 entities reachable in UI; public site (brochure + intake) in scope.
> - **Definition of Done — per task (gates 1-5):**
>   1. Reads pull **live Supabase data** (no mocks/hardcode).
>   2. Writes **persist to DB** and reflect on reload (full round-trip, verified locally against live Supabase).
>   3. RBAC enforced per `PortalPermission` (§38); unauthorized → `/unauthorized`.
>   4. Phase's entities field-checked vs `schema-erd-v23.md`; `tsc --noEmit` clean; mobile-responsive; light + dark mode.
>   5. **vitest** suite covers happy path + ≥1 edge case for the sub-system.
> - **Definition of Done — per phase (gate 6):** at each phase close, **deploy to Vercel preview and smoke-test all of that phase's flows on the live URL** before starting the next phase. 9 deploy gates total (one per phase), not per task.
> - **Spec column = section numbers in `system-logic-handoff-v23.md`.** Read those sections before building; cross-check every entity field against `schema-erd-v23.md`.

### Build Order

Agent Note: Update ⬜ to ✅ in these tables after each completed + verified task (all 6 DoD gates), then commit. Build top-to-bottom; do not skip a phase. **Phase 0 is a hard prerequisite for all role slices.**

#### PHASE 0 — Foundation (shared, blocks everything)

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P0-S | **Schema reconciliation to ERD v23 (DO FIRST)** — apply Appendix A: rename 11 `…StatusHistory`→`…StatusChangeLog` (§44), add ~19 missing entities (Department/StaffRole/UserType/PortalPermission, Marketing schedule chain, SyllabusChapter+ChapterRecording, AmbassadorService+ProgrammeContentList, MetricSnapshot, ProgressReport, GcrList/Item, session/meeting/sub-list change-logs), rename `InvoiceMonth`→`BillingMonth` + FK fields, add versioning fields to 5 sub-lists, add composite UNIQUE constraints, replace string `dept`/`role`/`targetRole` with FK lookups, review+remove ERD-contradicting extras. Each change cites its § — verify before applying. | see Appendix A | `prisma/schema.prisma` | ✅ |
| P0-0 | Supabase baseline (**no migrations — `db push`**; runs AFTER P0-S) — project + `.env` creds **already provisioned**; connection **verified ✅**; legacy sqlite migrations + sandbox deleted. REMAINING: (1) add **`DIRECT_URL`** (port 5432 non-pooling) to `.env` — `prisma.config.js` needs it for `db push`; (2) `prisma db push` reconciled schema to live Supabase; (3) `prisma db pull`/diff → zero drift; (4) create + RLS-policy Supabase Storage buckets (receipts etc); (5) `prisma generate`; (6) `prisma/seed.ts` (P0-3) run. **Hard prerequisite.** | all models | `.env`, `prisma/schema.prisma`, Supabase | ✅ |
| P0-1 | Auth consolidation — remove `next-auth-compat` shim; pure Supabase Auth; session in middleware; login (split layout)/logout/callback | User; Supabase Auth | `src/middleware.ts`, `src/lib/auth.ts`, `src/app/auth/**` | ✅ |
| P0-2 | RBAC — `PortalPermission` override table + code-defined default permissions; route + menu gating; `/unauthorized` | §38 | `src/lib/rbac.ts`, `src/middleware.ts`, `src/app/unauthorized/` | ✅ |
| P0-3 | Required seed data — UserType (incl `ALL`), SessionType (incl staff-meeting types), Department, StaffRole, RecordType (`targetUserTypeId`), CurrencyRate, all lookups | §53, §28 | `prisma/seed.ts` | ✅ |
| P0-4 | Lookup tables CRUD (management) — Ticket/Notification/Flag/Record/Mock/AmbassadorTest types, OutreachSource, SocialPlatform/PostType, CampaignTag, ContentType, Outreach/Exhibition types | §28, §34, §35 | `api/lookup/[table]`, `portal/management/database/` | ✅ |
| P0-5 | Notifications — Notification + NotificationType, read/readAt, mark-all-read, bell + feed UI | §29 | `api/notifications/**`, `components/shared/` | ✅ |
| P0-6 | CalendarItem (org-wide) — per-user rows on every session/meeting/task; GCal sync flag; calendar view | §14 | `api/calendar/**`, shared calendar component | ✅ |
| P0-7 | Shared layout — role-aware Nav (theme toggle, role badges, active-nav), Footer, DataGrid primitive, form primitives; `@theme` brand tokens | brand tokens | `components/shared/**`, `app/globals.css` | ✅ |
| P0-8 | Data + API conventions — single Prisma client (pg adapter), zod validation layer, standard API response/error shape, fail-loud | — | `src/lib/db.ts`, `src/lib/validation/**` | ✅ |

#### PHASE A — Student

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-A1 | Onboarding + admissions gate + enrolment — StudentProfile (+setup flags & timestamps), awaiting-approval gate, StudentEnrolmentList/Item + StatusChangeLog | §2, §6, §47, §48 | `portal/student/{awaiting-approval,profile}`, `api/onboarding`, `api/enrolments/student` | ✅ |
| P-A2 | Curriculum + classes + recordings + doubts — Service→CurriculumList→{SyllabusList(+SyllabusChapter), TaskList, MockList, CourseTimelineList}; ChapterRecordingList/Item; progress; Doubt | §15, §36 | `portal/student/{curriculum,classes,recordings,assignments}`, `api/curriculum/**` | ✅ |
| P-A3 | Scheduling + sessions + attendance — Schedule chain + recurrence, AcademicSession, SessionAttendance (trial flag, feedback stars/text), ScheduleChangeRequest | §10, §11, §5 | `portal/student/classes`, `api/schedules/**`, `api/sessions/**` | ✅ |
| P-A4 | Finance — StudentInvoice + BillingMonth, Discount, PaymentRecord, PaymentMethod/BankAccount, receipt upload (Supabase), Stripe checkout + webhook | §19, §20 | `portal/student/fees`, `api/invoices/**`, `api/payments/**`, `api/upload/receipt` | ✅ |
| P-A5 | Mock exams + progress reports + metrics — MockList/MockType, ProgressReport (PDF/md), MetricSnapshot (student metrics) | §15, §37 | `portal/student/{mock,progress}`, `api/metrics/student` | ✅ |
| P-A6 | Support + flags — student Tickets (raise/messages), StudentFlag/FlagType | §22, §24 | `portal/student/support`, `api/tickets/**` | ✅ |

#### PHASE B — Teacher

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-B1 | Core + enrolment — TeacherProfile, TeacherEnrolmentList/Item + StatusChangeLog | §7 | `portal/teacher/{dashboard,profile}`, `api/enrolments` | ✅ |
| P-B2 | Sessions + attendance + doubts — AcademicSession (scheduled by teacher), SessionAttendance marking, Doubt answering | §11, §18 | `portal/teacher/{attendance,doubts}`, `api/sessions/**`, `api/curriculum/doubts` | ✅ |
| P-B3 | Finance — Claim (teacher), PaycheckLineItem, Paycheck → PaymentRecord; status change logs | §18 | `portal/teacher/{claims,payment-claims}`, `api/claims/**` | ✅ |
| P-B4 | Schedule + change requests + content bank + tickets — schedule chain, ScheduleChangeRequest, ContentBankItem, Tickets | §10, §25, §22 | `portal/teacher/{schedule,tickets}`, `api/schedules/**` | ✅ |

#### PHASE C — Staff (5 depts + shared)

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-C1 | Staff core — StaffProfile, StaffEnrolmentList/Item + StatusChangeLog, StaffRole/Department, staff schedule + StaffScheduleChangeRequest | §8, §10, §12 | `portal/staff/{profile,shared/schedule}`, `api/enrolments`, `api/schedules` | ✅ |
| P-C2 | Finance dept — RateList/RateItem (+RateChangeLog, RateItemStatusChangeLog), invoice oversight, claims approval, paychecks, Ledger & Budgets, CurrencyRate | §4, §18, §19, §21 | `portal/staff/finance/{invoices,claims,rates}`, `portal/management/budget`, `api/claims`, `api/invoices` | ✅ |
| P-C3 | HR dept — Candidate pipeline, JobPosting, RegistrationForm/Entry, staff records & disciplinary, Role Records, RecordType | §3, §23, §27, §30 | `portal/staff/hr/{candidates,records}`, `api/careers/apply`, `api/jobs` | ✅ |
| P-C4 | IT dept — AccessLog (grant/revoke symmetry), Org Backlog Bank + Meeting Sprint/Backlog (roadmap), KnowledgeBank/Item | §35, §20 | `portal/staff/it/{access,roadmap}` | ✅ |
| P-C5 | Marketing dept — MarketingPost, MarketingSchedule/Occurrence(+StatusChangeLog)/PostSlot, Campaign/CampaignItem, OutreachItem, ExhibitionItem, ContentBankItem | §32, §34, §52 | `portal/staff/marketing/calendar`, `api/marketing/**` | ✅ |
| P-C6 | PR dept — Lead (+outreachSource FK), ReferralClick (conversion), attendance mapping/tracker, Announcements, Checklist system | §17, §25, §31 | `portal/staff/pr/{attendance,mapping,tracker}`, `portal/management/announcements` | ✅ |
| P-C7 | Staff shared — Meeting/MeetingAttendance, GeneralMeeting (+StatusChangeLog), Content Bank, Checklist (ChecklistEntry), staff Tickets | §12, §16, §31, §22 | `portal/staff/{shared/meetings,shared/content-bank,tickets}`, `api/tickets` | ✅ |

#### PHASE D — Ambassador

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-D1 | Core + programme — AmbassadorProfile (referralCode UK), AmbassadorEnrolmentList/Item + StatusChangeLog, AmbassadorService, AmbassadorProgrammeList + ContentList | §9, §16, §17 | `portal/ambassador/{profile,programme}`, `api/enrolments` | ✅ |
| P-D2 | Commission + claims — AmbassadorCommissionList/Item (+StatusChangeLog), AmbassadorClaim (neutral totals + rateSnapshot allowance), AmbassadorPaycheck (netAmount) | §9, §18, §54 | `portal/ambassador/claims`, `api/claims/**` | ✅ |
| P-D3 | Meetings + schedule + tests + timeline — AmbassadorMeeting/Attendance, AmbassadorSchedule + ChangeRequest + OccurrenceStatusChangeLog, AmbassadorTestList, AmbassadorProgrammeTimelineList | §13, §10, §16 | `portal/ambassador/meetings`, `api/schedules/**` | ✅ |
| P-D4 | Referrals + tickets — Referral, ReferralClick conversion, public referral landing wiring (with P-G3), tickets (staff-only, zero student data) | §17, §22 | `portal/ambassador/{referrals,tickets}` | ✅ |

#### PHASE E — Parent

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-E1 | Core + linked students — ParentProfile, linked-student relationship | §2, §40 | `portal/parent/profile` | ✅ |
| P-E2 | Views — child progress, fees/invoice (read), support tickets | §19, §22 | `portal/parent/{progress,fees,support}` | ✅ |

#### PHASE F — Management

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-F1 | Dashboard + metrics — MetricSnapshot (all entity types), staff performance metrics, finance/ticket/attendance dashboards | §37, §52 | `portal/management/metrics`, `api/metrics/**` | ✅ |
| P-F2 | Users + RBAC admin — User CRUD, PortalPermission editor, UserType/Department/StaffRole admin | §38, §51 | `portal/management/{users,permissions}`, `api/management/permissions`, `api/users` | ✅ |
| P-F3 | Database admin (TOTAL COVERAGE) — generic CRUD grids for every remaining model incl. all `…StatusChangeLog`, SiteLog, AccessLog, snapshots, junctions | all remaining models | `portal/management/database`, `api/management/db` | ✅ |
| P-F4 | Announcements + budget + finance oversight + content — Announcement, Discount oversight, Ledger/Budget, ContentBankItem | §17, §21, §25 | `portal/management/{announcements,budget}` | ✅ |

#### PHASE G — Public site (brochure + intake)

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-G1 | Brochure wired — homepage (Athena clone), services, pricing, about, resources, contact pulling Service/Group/public content from DB | §4, brand | `app/{page,about,services,pricing,resources,contact}` | ✅ |
| P-G2 | Public intake — admissions RegistrationForm → Candidate, careers apply → Candidate/JobPosting, Lead capture | §3, §30 | `app/{admissions,careers}`, `api/careers/apply`, `api/jobs` | ✅ |
| P-G3 | Ambassador referral landing + ReferralClick tracking + public ambassador services | §17 | `app/r/[referralCode]`, `api/referrals/**` | ✅ |

#### PHASE H — Hardening + production cutover

| # | Task | Key entities / §Spec | Path | Status |
|---|------|----------------------|------|--------|
| P-H1 | Full RBAC audit — every role × every route/menu vs §38 defaults; deny-by-default verified | §38 | `src/middleware.ts`, `src/lib/rbac.ts` | ✅ |
| P-H2 | Full seed/demo dataset — representative live-verification rows for every portal (Demo@1234) | §53 | `prisma/seed.ts` | ✅ |
| P-H3 | Test suite consolidation — vitest coverage gate across all sub-systems; CI green | — | `src/tests/**` | ✅ |
| P-H4 | Production cutover — Vercel prod deploy, env vars, Supabase storage buckets + policies, Stripe live webhook, smoke test all roles on live URL | — | Vercel · Supabase · Stripe | ⬜ |

### 📊 Coverage Ledger (170-entity total-coverage tracking)

> Each ERD group MUST be fully reachable when its owning phase closes. Tick when every entity in the group is surfaced (bespoke page or `management/database` grid) and round-trips live.

| ERD group | Owning phase(s) | Status |
|-----------|-----------------|--------|
| Users & Profiles (User, Student/Teacher/Staff/Ambassador/Parent Profile) | A,B,C,D,E,F2 | ⬜ |
| Pre-hire (Candidate, JobPosting, RegistrationForm/Entry, Lead, ReferralClick) | C3,G2,G3 | ⬜ |
| Services & Rates (Group, Service, Gcr*, RateList/Item, RateChangeLog, CurrencyRate) | C2,G1 | ⬜ |
| Enrolment (Student/Teacher/Staff/Ambassador EnrolmentList/Item + StatusChangeLogs) | A1,B1,C1,D1 | ⬜ |
| Schedules & Calendar (Schedule chain, *ScheduleChangeRequest, *OccurrenceStatusChangeLog, CalendarItem) | P0-6,A3,B4,C1,D3 | ⬜ |
| Sessions & Attendance (AcademicSession, SessionAttendance + StatusChangeLogs) | A3,B2 | ⬜ |
| Meetings (Meeting, GeneralMeeting, AmbassadorMeeting + Attendance + StatusChangeLogs) | C7,D3 | ⬜ |
| Curriculum (CurriculumList, Syllabus*, TaskList, MockList, CourseTimelineList, Chapter*Recording*, Doubt) | A2,A5 | ⬜ |
| Ambassador programme (AmbassadorProgramme*, AmbassadorTestList, *TimelineList) | D1,D3 | ⬜ |
| Finance (Invoice, BillingMonth, Discount, Claim/AmbassadorClaim, Paycheck*, PaymentRecord/Method, BankAccount, Ledger, Budget) | A4,B3,C2,D2,F4 | ⬜ |
| Tickets (Ticket, TicketMessage, TicketHistory, TicketType) | A6,B4,C7,D4,E2 | ⬜ |
| HR & Records (StaffRecord, RoleRecord, RecordType, FlagType, StudentFlag) | A6,C3 | ⬜ |
| Marketing (MarketingPost, MarketingSchedule/Occurrence/PostSlot, Campaign/Item, Outreach/Exhibition*, Social*Type) | C5 | ⬜ |
| Content & Misc (ContentBankItem, Announcement, KnowledgeBank*, ContentType, TextFormat, Booklet) | C4,C7,F4 | ⬜ |
| Metrics & Reports (MetricSnapshot, ProgressReport) | A5,F1 | ⬜ |
| Audit/Lookup/RBAC (PortalPermission, SiteLog, AccessLog, all lookups, all remaining *StatusChangeLog) | P0-2,P0-4,F2,F3 | ⬜ |

---

## 📎 APPENDIX A — Schema Reconciliation to ERD v23 (task P0-S detail)

> Source: verified diff of `prisma/schema.prisma` (169 models) vs `schema-erd-v23.md` (~186 entities), 2026-06-14.
> ERD v23 + `system-logic-handoff-v23.md` are ground truth. Every item cites its spec §; **read the § and confirm before applying** (the mermaid ERD is regex-extracted — treat counts as ~, names as authoritative-after-check). All field shapes for change-log tables: `id PK, <parent>Id FK, fromStatus, toStatus, changedAt, changedByUserId FK, reason`.

### A1 — Rename `…StatusHistory` → `…StatusChangeLog` (§44, 11 tables)
`StudentEnrolmentItemStatusHistory` · `TeacherEnrolmentItemStatusHistory` · `StaffEnrolmentItemStatusHistory` · `AmbassadorEnrolmentItemStatusHistory` · `AmbassadorCommissionItemStatusHistory` · `RateItemStatusHistory` · `ScheduleOccurrenceStatusHistory` · `StaffScheduleOccurrenceStatusHistory` · `AmbassadorScheduleOccurrenceStatusHistory` · `SyllabusListStatusHistory` · `AmbassadorProgrammeListStatusHistory` (→ `AmbassadorProgrammeContentListStatusChangeLog`). Update all FK relationship lines + actor `User` audit lines.

### A2 — Add missing change-log tables (no counterpart) (§44, §46, §54)
`TaskListStatusChangeLog` · `MockListStatusChangeLog` · `CourseTimelineListStatusChangeLog` · `AmbassadorTestListStatusChangeLog` · `AmbassadorProgrammeTimelineListStatusChangeLog` · `AcademicSessionStatusChangeLog` · `MeetingStatusChangeLog` · `AmbassadorMeetingStatusChangeLog` · `GeneralMeetingStatusChangeLog` (§46) · `MarketingScheduleOccurrenceStatusChangeLog` (§54).

### A3 — Add missing lookup / config tables (§51, §38)
`Department` `{id, name UK, isActive}` · `StaffRole` `{…}` · `UserType` `{…}` (values incl. `ALL`, §53) · `PortalPermission` (override table, §38).

### A4 — Add missing domain entities
- Marketing schedule chain (§52, §54): `MarketingSchedule` · `MarketingScheduleOccurrence` · `MarketingPostSlot`.
- Syllabus/recording (§36): `SyllabusChapter` · `ChapterRecordingList` · `ChapterRecordingItem`.
- Ambassador (§16, §17): `AmbassadorService` · `AmbassadorProgrammeContentList`.
- Metrics/reports (§37): `MetricSnapshot` · `ProgressReport`.
- Classroom (§4): `GcrList` · `GcrItem` (schema currently has `GcrClassroom` — reconcile/replace per ERD).

### A5 — Renames (§44)
`InvoiceMonth` → `BillingMonth` (used by StudentInvoice, Paycheck, AmbassadorPaycheck). Field FKs: `invoiceMonthId`→`billingMonthId` (StudentInvoice); `paycheckMonthId`→`billingMonthId` (Paycheck, AmbassadorPaycheck). Also confirm `StudentProgress` vs ERD `StudentSyllabusProgress`.

### A6 — Field-level changes
- Versioning fields on 5 sub-lists (§44): `TaskList, MockList, CourseTimelineList, AmbassadorTestList, AmbassadorProgrammeTimelineList` → `name, version, status, activatedAt, pausedAt, deactivatedAt, isActive`.
- `CurrencyRate.effectiveDate datetime` (§44).
- Replace string `dept`→`deptId FK` on 13 entities; `role`→`staffRoleId FK` on 4; `targetRole`/`candidateType`→`targetUserTypeId`/`candidateUserTypeId FK` (§51.2). Keep `StaffProfile.roleTitle` + `isSupervisor`.

### A7 — Composite UNIQUE constraints (DB-level, §51.3)
`TaskAssignment(taskItemId, studentId)` · `ContentGroupItem(contentGroupId, contentBankItemId)` · `ChecklistItemEntry(checklistEntryId, templateItemId)` · `MeetingSprintItem(sprintListId, backlogItemId)` · `ChapterRecordingItem(chapterRecordingListId, recordingId)`.

### A8 — Review + remove ERD-contradicting extras (verify each against ERD before deleting)
`AmbassadorDeliverable` (§52.3 — deliberately not modelled) · `AmbassadorEarning` · `AmbassadorProgramme` (vs `AmbassadorProgrammeList`) · `Assignment` · `CanvaDesign` · `RateCard` · `SprintItem` (vs `MeetingSprintItem`) · `StudentStatus` · `TicketCategory` (vs `TicketType`). Confirm not referenced by retained relations before removal.

> **Exit criteria for P0-S:** `prisma validate` clean; every ERD v23 entity present with ERD naming; no `…StatusHistory` tables remain; `prisma generate` + `tsc --noEmit` clean. Then P0-0 `db push`.
