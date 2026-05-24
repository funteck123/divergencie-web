# DivergenCIE Coaching — Build Plan & Session Tracker

## INTRO

**Domain:** divergencie.co.uk
**Stack:** Next.js 15 · App Router · TypeScript · Prisma · SQLite · NextAuth v5 · Tailwind v4 · Lucide React · Satoshi Font · Lottie 
**HTML source (reference for all M-phase ports):** `planning/legacy/html-source/`
**Legacy HTML plan:** `planning/legacy/PLAN_HTML_LEGACY.md`

**Reference:** Athena Education homepage (https://athenaeducation.co.in/) — clone layout, rebrand for DivergenCIE ·  Altacademy (https://altacademy.org/) for relevant inspiration 
**Real social links:** Instagram: https://www.instagram.com/divergencie_coaching/ · LinkedIn: https://www.linkedin.com/company/divergencie-coaching/ · WhatsApp: +919650675507

Pathing Rule: Assets in /public/assets/. Reference as /assets/... (Next.js root-relative).
Theme Strategy: Light mode default. Use next-themes (class strategy). Apply Tailwind dark: variants to all components. Persist via dc-theme key. Ensure Sun/Moon toggle is in the shared Nav component. Do NOT create tailwind.config.ts. All customizations (Gold accent, Satoshi font-family) must be defined inside app/globals.css using the @theme block to comply with Tailwind v4 standards.
---

## 🤖 AGENT PERSONA

You are **Cleo** — Senior FullStack Engineer at DivergenCIE. You ship verified production-quality Next.js 15/TS code with zero bloat based on brand identity and product outcome plan documents. You follow the token efficiency guide. You use Google searches to get inspiration or search guides/references.

---

## 📦 INPUTS — READ ON EVERY SESSION

You will receive two files each session:
1. **`divergencie-web-v[N].zip`** — the live build (HTML, CSS, JS, assets) 
2. **`Product_Outcome_Plan_Documents.rar`** — full product spec docs

**Session startup sequence (mandatory):**
1. Extract both archives 
2. Read PLAN.md Head (Intro through Rules) + Phase M Build Order table + Tail (last 3 handoff notes). The Build Order table is the source of truth for progress; update ⬜ to ✅ in the PLAN.md file at the end of each session.
3. Study `Product_Outcome_Plan_Documents/` carefully — especially:
   - `06_UJM_User_Journey_Map_v2.md` (user journey — most important)
   - `03_PRD_Product_Requirements_Document_v2.md` (requirements)
   - `01_BDG_Brand_Design_Guidelines_v1.md` (brand rules)
   - `12_MU_Mockup_Guide_v3.md` (brand rules)
4. Cross-reference the next `⬜ TODO` section against the spec docs before writing any code 
5. Then proceed with build instructions below

—

## 🔋 TOKEN EFFICIENCY — AGENT RULES (CAVEMAN)

**Every token counts. Quality over quantity — always.**

- **Caveman rule:** Strip all filler. No "I will now", "please note", "as you can see". Short words win. Write like telegram. Subject → verb → object. "Build nav" not "I am going to proceed to build the navigation component". Every word earns its place or gets cut. Handout follows caveman rule.
- **No session startup narration** — skip "I will now read PLAN.md…"; just act
- **Code only when asked.** Never paste code into chat — it lives in files - — reference filename + line range only
- **Confirmations = 1 line.** e.g. `✅ Section 4 done — ZIP ready.` Nothing more.
- **UJM/PRD cross-ref** — extract only sections relevant to page being built, not full doc read
- **Never `cat` large files** — use `grep -n "keyword" file` or `sed -n 'X,Yp'` to target sections
- **No handoff recap in chat** — PLAN.md is the record; don't repeat it in chat
- **Skill files** — read once per session; never re-read same skill
- **ZIP output only** — don't list files added to ZIP in chat
- **High quality is non-negotiable.** Brevity never means cutting corners on the build.

NOTE: DONT READ WHOLE DOCS IN CONTEXT AND CLEAR/COMPACT CONTEXT IF NEEDED.
---

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` section
2. Read `divergencie-v[N].zip` files to understand current state
3. Build one page or module per session. Respect Next.js architecture: use app/globals.css for theme variables, and component-level styles only if strictly necessary. Place shared logic in src/lib/ and shared UI (Nav/Footer/Cards) in src/components/. Keep page-specific logic inside the respective page.tsx.
4. **Global Components:** When building inner pages or portals, use a "Source of Truth" for Nav and Footers.
5. **Universal Theme Support:** Every page defaults to **light mode**. When building any section, you MUST apply both light and dark styles.
6. Before ZIPping, update `PLAN.md`
7. **ZIP integrity:** Before ZIPping, run `unzip -l divergencie-v[N-1].zip | wc -l` on the source ZIP and confirm new ZIP has ≥ same file count — never ZIP from a partial extract.
8. **ZIP immediately:** `cd /home/claude && zip -r divergencie-v[N].zip divergencie/`
9. Present ZIP to user - ensure this!
10. Verify the build (check mobile responsiveness, 404 links, and JS console errors). Once confirmed working, mark section ✅ Done.
11. **STOP** — wait for user to say "continue"

### 🚨 PLAN.md INTEGRITY RULES — NON-NEGOTIABLE
- **NEVER edit `PLAN.md` unless explicitly instructed by the user.** The only permitted write to `PLAN.md` per session is appending a new ` Handoff Notes` block at the bottom.
- **NEVER shorten, summarise, compress, or remove any existing content from `PLAN.md`.** This file is the single source of truth. 
- **APPEND ONLY for Handoff Notes.** Never overwrite or delete previous handoff blocks. Treat it like a git log.
- **Do not "clean up", "reorganise", or "expand" `PLAN.md`** unless the user has explicitly asked for that specific change in that session.
- If you notice an error in `PLAN.md`, flag it to the user in chat — do NOT silently fix it.


### Handoff Notes Format
**APPEND** this block at the bottom of `PLAN.md` before every ZIP. 



---
## ⚙️ SESSION OUTPUT RULES


1. ZIP at end of every meaningful code change — do not wait until session end
2. ZIP naming: `divergencie-web-v[N].zip` — increment N each ZIP
3. ZIP command: `cd /home/claude && zip -r divergencie-web-reboot_1-v[N].zip divergencie/ --exclude "divergencie/node_modules/*" --exclude "divergencie/.next/*" --exclude "divergencie/prisma/dev.db"`
4. Present ZIP immediately after creating
5. One page or one component per session
6. Session flow: Read (PLAN.md tail + relevant HTML) → Write → ZIP → Present → STOP


Every ZIP is a checkpoint. The next agent must be able to pick up cold with zero context loss.
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

// missing add it for whole website - every functionality - check html legacy - check ujm

---


## 🏛️ ROLE ARCHITECTURE


| Portal | Role | Access |
|--------|------|--------|
| `portal/management/` | Management | All portals, all tickets, all metrics, approve claims |
| `portal/staff/` | Staff (all depts) | Own dept tickets, interdept forward, escalate, content bank, claims |
| `portal/teacher/` | Teacher | Own schedule, timesheet, hour-based claims, reply tickets only |
| `portal/ambassador/` | Ambassador | Raise tickets to DC staff only — zero student data |
| `portal/parent/` | Parent | Child progress, fees, raise tickets |
| `portal/student/` | Student | Classes, progress, assignments, recordings, raise tickets |


### Staff Dept Structure
Depts: **PR** · **HR** · **Finance** · **Marketing** · **IT**
Every dept: Members (own tickets) + Supervisor/HOD (all dept tickets, assign tasks, dept metrics).


### Ticket System
**Attributes:** Title · Dept · Assignee · Creator · Deadline · Priority (Low/Med/High/Urgent) · Status (Open/In Progress/Pending Reply/Resolved/Closed) · Comments · Files · Links · Dates


**Routing:**
- Student/Parent → select dept → staff sees can reply → PR can forward to Teacher (Other staff can forward to PR to forward to teacher. → Teacher included in ticket can reply -> Student may reply further -> Staff closes
- Staff → internal ticket, assign in dept, forward interdept, or escalate to Mgmt
- Supervisor of each dept get tickets addressed to dept then they assign tickets to dept members to see in their portal and resolve
- Ambassador → can make same tickets but not to management
- Management → all tickets, create/assign/close any


### Claims
| Role | Type |
|------|------|
| Teacher | Hour-based timesheet |
| Staff | Meeting/event attendance-based |
| Management | Approves all |


### Management Metrics
Productivity · Attendance · Financial · Activity · Workload · Quality — all filterable by dept/member/date range with weekly line charts.


---


## 🏗️ PHASE M — Next.js + SQLite Migration


**Goal:** Port static HTML 1-to-1 into Next.js App Router + SQLite/Prisma. Same brand, same UI, same flows. No improvements in this phase — pixel-perfect port only.


**Stack:** Next.js 15 App Router · TypeScript · SQLite via Prisma · NextAuth v5 · Tailwind v4 CSS vars · Satoshi via Fontshare · Lucide React


**DB:** All localStorage mock data moves to SQLite. Seed = same dummy accounts as legacy. No real integrations — stub data only.


### Migration Build Order

Agent Note: When a task is finished, update the Status column in this table before generating the ZIP.

| # | Task | Next.js path | Legacy source | Status |
|---|------|-------------|---------------|--------|
| M1 | **Project scaffold** — Next.js init, deps, Prisma+SQLite, brand tokens → globals.css, Satoshi font, ThemeProvider | / | css/shared.css, js/theme.js | ✅ Done |
| M2 | **Prisma schema + seed** — all models, SQLite provider, seed with legacy dummy accounts | prisma/ | auth/login.html | ✅ Done |
| M3 | **Auth** — NextAuth credentials (NextAuth v5 (Auth.js) with Middleware-based protection. Extend Session type to include 'role' and 'dept' for Client/Server-side checks.), email+role detection matching legacy ROLE_MAP, JWT role+dept, middleware /portal/*, login page 1:1 split layout | app/auth/login/ | auth/login.html, auth/forgot-password.html | ⬜ |
| M4 | **Shared components** — Sidebar (role-aware nav, gold active, role badges), Topbar (title, timezone, bell, Sun/Moon), PortalLayout, ThemeProvider | app/components/ | css/portal.css, js/portal.js | ⬜ |
| M5 | **Student portal** — dashboard, classes, assignments, recordings, progress, curriculum, support (7 pages) | app/portal/student/ | portal/student/*.html | ⬜ |
| M6 | **Parent portal** — dashboard, progress, fees (3 pages) | app/portal/parent/ | portal/parent/*.html | ⬜ |
| M7 | **Teacher portal** — dashboard, attendance, payment-claims, tickets (4 pages) | app/portal/teacher/ | portal/teacher/*.html | ⬜ |
| M8 | **Staff portal shared** — dashboard, tickets, content-bank, meetings, schedule (5 pages) | app/portal/staff/ | portal/staff/dashboard.html + shared/*.html | ⬜ |
| M9 | **Staff — PR** — attendance, mapping, compliance (3 pages) | app/portal/staff/pr/ | portal/staff/pr/*.html | ⬜ |
| M10 | **Staff — HR** — candidates (1 page) | app/portal/staff/hr/ | portal/staff/hr/candidates.html | ⬜ |
| M11 | **Staff — Finance** — rates, invoices, claims (3 pages) | app/portal/staff/finance/ | portal/staff/finance/*.html | ⬜ |
| M12 | **Staff — Marketing** — calendar, leads (2 pages) | app/portal/staff/marketing/ | portal/staff/marketing/*.html | ⬜ |
| M13 | **Staff — IT** — access (1 page) | app/portal/staff/it/ | portal/staff/it/access.html | ⬜ |
| M14 | **Management portal** — dashboard, users, metrics, tickets, budget (5 pages) | app/portal/management/ | portal/management/*.html | ⬜ |
| M15 | **Ambassador portal** — dashboard, tickets (2 pages) | app/portal/ambassador/ | portal/ambassador/*.html | ⬜ |
| M16 | **Public pages** — index, about, services hub, 6 service sub-pages, pricing, resources, careers, contact, mock (16 pages) | app/(public)/ | *.html, services/*.html, mock.html | ⬜ |


**After M16 → Phase N: improvements.md audit + verification pass**


---



## 📖 Handoff Notes Format (3 lines — append before every ZIP)


```
## 📖 Handoff Notes — v[N]
**Built:** [what]
**Next:** [what]
**Watch:** [one risk]
```


---


## 📖 Handoff Notes — v69


**Built:** PLAN.md amendment — SESSION OUTPUT RULES + session/token guide
**Next:** M1 — Next.js project scaffold
**Watch:** Free plan ~15–40 msgs/5hr. M1 is large — ZIP each file group as you go.


## 📖 Handoff Notes — v70


**Built:** M1 — Next.js 15 scaffold. globals.css brand tokens, ThemeProvider, layout.tsx, prisma/schema.prisma (all models), prisma/seed.ts (19 dummy users), src/lib/auth.ts (ROLE_MAP + DEPT_MAP + PORTAL_MAP). Build passes clean.
**Next:** M3 — Auth (NextAuth credentials, login page 1:1 split layout port)
**Watch:** better-sqlite3 needs `npm rebuild better-sqlite3` in production. Tailwind v4 uses CSS-based config — no tailwind.config.ts.


## 📖 Handoff Notes — v72

**Built:** M16 Homepage (Index) port complete. Built 12 high-fidelity components (Hero, Stats, GlobalReach, etc.) using brand tokens and Satoshi font. Implemented theme toggle and premium animations. Clean `npm run build` verified.
**Next:** M3 — Auth (NextAuth credentials provider, login page split layout port)
**Watch:** `lucide-react` version in use (1.14.0) lacks some social icons; using `Camera` and `Link` for now. Build uses Turbopack (Next 16).

