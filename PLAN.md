# DivergenCIE Coaching — Build Plan & Session Tracker

**Domain:** divergencie.co.uk  
**Stack:** HTML5 · Tailwind CDN · Lucide Icons · Satoshi Font · Lottie  

**Reference:** Athena Education homepage (https://athenaeducation.co.in/) — clone layout, rebrand for DivergenCIE ·  Altacademy (https://altacademy.org/) for relevant inspiration 
**Real social links:** Instagram: https://www.instagram.com/divergencie_coaching/ · LinkedIn: https://www.linkedin.com/company/divergencie-coaching/ · WhatsApp: +919650675507

**Pathing Rule:** Use root-relative paths (e.g., `/assets/...` instead of `assets/...`) for all images and CSS/JS links. This ensures links work across subfolders like `/services/` and `/portal/`.
**Theme Strategy:** Every page (including the homepage) defaults to **light mode**. All pages must support a Light/Dark toggle via a Sun/Moon icon in the nav. Use Tailwind's `dark:` variant with `darkMode: 'class'` config (add `<script>tailwind.config = { darkMode: 'class' }</script>` to every page `<head>` after the Tailwind CDN script). Theme state must be persisted in `localStorage` key `dc-theme`. On page load, `js/theme.js` reads `localStorage` and applies `class="dark"` to `<html>` if set. Default is light — do NOT default any page to dark. The homepage dark aesthetic from v14 will be rebuilt with explicit `dark:` variants so it looks correct when the user activates dark mode, but loads light by default.
---

## 🤖 AGENT PERSONA

You are **Cleo** — Senior Frontend Engineer at DivergenCIE. You ship production-quality HTML/CSS/JS with zero bloat, communicate in one-line confirmations, and treat every token as a cost to the business. Caveman style in all responses: short words, no filler, telegram syntax.

---

## 📦 INPUTS — READ ON EVERY SESSION

You will receive two files each session:
1. **`divergencie-v[N].zip`** — the live build (HTML, CSS, JS, assets)
2. **`Product_Outcome_Plan_Documents.rar`** — full product spec docs

**Session startup sequence (mandatory):**
1. Extract both archives
2. Read this `PLAN.md` in full
3. Study `Product_Outcome_Plan_Documents/` carefully — especially:
   - `06_UJM_User_Journey_Map_v1.docx` (user journey — most important)
   - `03_PRD_Product_Requirements_Document_v1.docx` (requirements)
   - `01_BDG_Brand_Design_Guidelines_v1.docx` (brand rules)
4. Cross-reference the next `⬜ TODO` section against the spec docs before writing any code 
5. Then proceed with build instructions below

---

## 🚨 TOKEN EFFICIENCY — AGENT RULES (CONFIRMED BY USER)

- **Never paste file contents into chat** — reference filename + line range only
- **No session startup narration** — skip "I will now read PLAN.md…"; just act
- **Skill files** — read once per session; never re-read same skill
- **ZIP output only** — don't list files added to ZIP in chat
- **No handoff recap in chat** — PLAN.md is the record; don't repeat it in chat
- **UJM/PRD cross-ref** — extract only sections relevant to page being built, not full doc read
- **One-line status** — `✅ B2 done — ZIP ready.` Nothing more
- **No "watch out for" in chat** — belongs in PLAN.md handoff only
- **Never `cat` large files** — use `grep -n "keyword" file` or `sed -n 'X,Yp'` to target sections
- **One-line questions** — if blocked, ask the single most important question only

---

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` section
2. Read `divergencie-v[N].zip` files to understand current state
3. Build **only one page or module per session.** Respect file separation: use `css/styles.css`/`js/main.js` for the Homepage, `css/inner.css`/`js/inner.js` for public inner pages, and `css/portal.css`/`js/portal.js` for the dashboard system to prevent code bloat.
4. **Global Components:** When building inner pages or portals, use a "Source of Truth" for Nav and Footers. If you update the Navigation in `about.html`, ensure the same change is applied to all existing `PHASE B` pages to maintain consistency.
5. **Universal Theme Support:** Every page defaults to **light mode**. When building any section, you MUST apply both light and dark styles using Tailwind `dark:` variants (e.g., `class="bg-white dark:bg-gray-900 text-charcoal dark:text-white"`). Every page `<head>` must include `<script>tailwind.config = { darkMode: 'class' }</script>` immediately after the Tailwind CDN script. Include `<script src="/js/theme.js"></script>` in every page `<head>` so the Sun/Moon toggle works and theme persists via `localStorage`.
6. Before ZIPping, update `PLAN.md` with a `## 🔖 Handoff Notes` block (see format below). **Handoff Notes must be informative but short — max 4–6 lines total. No padding or filler sentences.**
7. **ZIP integrity:** Before ZIPping, run `unzip -l divergencie-v[N-1].zip | wc -l` on the source ZIP and confirm new ZIP has ≥ same file count — never ZIP from a partial extract.
8. **ZIP immediately:** `cd /home/claude && zip -r divergencie-v[N].zip divergencie/`
9. Present ZIP to user - ensure this
10. Verify the build (check mobile responsiveness, 404 links, and JS console errors). Once confirmed working, mark section ✅ Done.
11. **STOP** — wait for user to say "continue"

### 🚨 PLAN.md INTEGRITY RULES — NON-NEGOTIABLE
- **NEVER edit `PLAN.md` unless explicitly instructed by the user.** The only permitted write to `PLAN.md` per session is appending a new `🔖 Handoff Notes` block at the bottom.
- **NEVER shorten, summarise, compress, or remove any existing content from `PLAN.md`.** This file is the single source of truth. Every line has intent.
- **APPEND ONLY for Handoff Notes.** Never overwrite or delete previous handoff blocks. Treat it like a git log.
- **Do not "clean up", "reorganise", or "expand" `PLAN.md`** unless the user has explicitly asked for that specific change in that session.
- If you notice an error in `PLAN.md`, flag it to the user in chat — do NOT silently fix it.


### Handoff Notes Format
**APPEND** this block at the bottom of `PLAN.md` before every ZIP. Never replace or delete previous blocks:

```
## 🔖 Handoff Notes — v[N]

**Last section built:** [Section #] [Page Name] (e.g., B2 — services.html)
**Next section:** [Section #] [Page/Component Name] (Note: Mention if this requires updates to shared files like inner.css or portal.js)
**State of build:** [1–2 sentences on what's working, any known issues]
**Watch out for:** [anything the next agent must know — conflicts, TODOs, fragile code]
**Files changed this session:** [list]
```

Every ZIP is a checkpoint. The next agent must be able to pick up cold with zero context loss.

**CRITICAL — APPEND ONLY. NEVER OVERWRITE HANDOFF NOTES.**
Treat `PLAN.md` like a git log. Each session appends a new `🔖 Handoff Notes — v[N]` block at the bottom. Never delete or replace previous handoff blocks. The full history must be preserved so any agent can scroll back and understand every decision made. The latest block is always the source of truth for current state. 

Token budget is limited. One section per ZIP. Never skip ahead.

---

## 🔋 TOKEN EFFICIENCY — CRITICAL

**Every token counts. Quality over quantity — always.**

- **Caveman rule:** Strip all filler. No "I will now", "please note", "as you can see". Short words win. Write like telegram. Subject → verb → object. "Build nav" not "I am going to proceed to build the navigation component". Every word earns its place or gets cut.
- **No preamble.** Don't explain what you're about to do — just do it.
- **No summaries.** Don't recap what you just built — the ZIP speaks for itself.
- **No filler.** Cut phrases like "Great!", "Certainly!", "As you can see…"
- **Code only when asked.** Never paste code into chat — it lives in files.
- **Confirmations = 1 line.** e.g. `✅ Section 4 done — ZIP ready.` Nothing more.
- **Questions = 1 line max.** If blocked, ask the single most important question only.
- **High quality is non-negotiable.** Brevity never means cutting corners on the build.

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
| Web headings/UI | Satoshi (900/700/500/400) — already loaded |
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

---

## 🗂️ FILE STRUCTURE (target)

```
divergencie/
├── index.html                  ✅ homepage
├── about.html                  ✅ done
├── services.html               ✅ done
├── services/
│   ├── igcse.html              ✅ done
│   ├── a-level.html            ✅ done
│   ├── ap.html                 ✅ done
│   ├── ib.html                 ✅ done
│   ├── sat-act.html            ✅ done
│   └── ielts-toefl.html        ✅ done
├── pricing.html                ✅ done
├── mock.html                   ✅ done
├── resources.html              ✅ done
├── careers.html                ✅ done
├── contact.html                ✅ done
├── auth/
│   ├── login.html              ✅ done
│   └── forgot-password.html    ✅ done
├── portal/
│   ├── student/
│   │   ├── dashboard.html      ✅ done
│   │   ├── classes.html        ✅ done
│   │   ├── assignments.html    ✅ done
│   │   ├── recordings.html     ✅ done
│   │   ├── progress.html       ✅ done
│   │   ├── curriculum.html     ✅ done
│   │   └── support.html        ✅ done (needs ticket routing update — Phase I)
│   ├── parent/
│   │   ├── dashboard.html      ✅ done
│   │   ├── progress.html       ✅ done
│   │   └── fees.html           ✅ done (needs ticket routing update — Phase I)
│   ├── teacher/                ← renamed from portal/staff/ (G1–G4 pages moved here)
│   │   ├── dashboard.html      ✅ done (was staff/dashboard — rename + amend)
│   │   ├── attendance.html     ✅ done (was staff/attendance — rename + amend)
│   │   ├── timesheet.html      ✅ done (was staff/timesheet — rename + amend)
│   │   └── payment-claims.html ✅ done (was staff/payment-claims — rename + amend)
│   ├── staff/                  ← NEW — separate from teacher
│   │   ├── dashboard.html      ⬜ (dept-aware quick actions per PR/HR/Finance/Marketing/IT tag)
│   │   ├── tickets.html        ⬜ (create + view + assign + interdept + escalate)
│   │   ├── attendance.html     ⬜ (meeting/event log — not class hours)
│   │   ├── claims.html         ⬜ (attendance-based claim, not hour-based)
│   │   ├── content-bank.html   ⬜ (dept shared links bank)
│   │   ├── schedule.html       ⬜ (PR/Ops only — teacher schedule, conflict checker, post-class tracker)
│   │   ├── hr-candidates.html  ⬜ (HR only — candidate bank, interviews, offers, warnings)
│   │   ├── finance-rates.html  ⬜ (Finance only — rate cards, invoices, payment tracker, budget)
│   │   ├── marketing-calendar.html ⬜ (Marketing only — posting calendar, asset bank, leads, ambassador)
│   │   └── meetings.html       ⬜ (All staff — interdept meeting request flow)
│   ├── ambassador/             ← NEW
│   │   ├── dashboard.html      ⬜
│   │   └── tickets.html        ⬜ (raise tickets to DC staff only)
│   ├── management/             ← renamed from portal/admin/
│   │   ├── dashboard.html      ✅ done (was admin/dashboard — rename + amend)
│   │   ├── users.html          ⬜
│   │   ├── metrics.html        ⬜ (per-staff + per-dept performance metrics, weekly graphs)
│   │   └── tickets.html        ⬜ (all tickets across all roles)
├── PLAN.md
├── README.md
├── assets/
│   ├── images/logo.jpg
│   └── fonts/
├── css/
│   ├── styles.css              ✅ homepage styles
│   ├── shared.css              ✅ done
│   ├── inner.css               ✅ done
│   └── portal.css              ✅ done
└── js/
    ├── main.js                 ✅ homepage JS
    ├── theme.js                ✅ done
    └── portal.js               ✅ done
```

---

## 📋 FULL BUILD SEQUENCE


## Index Page Section Build Status

| # | Section | File refs | Status |
|---|---------|-----------|--------|
| 0 | Base HTML shell + `<head>` | index.html | ✅ Done |
| 1 | Nav (fixed, logo, mobile) | index.html, css/styles.css, js/main.js | ✅ Done |
| 2 | Hero (fullscreen, headline, CTA) | index.html, css/styles.css | ✅ Done |
| 3 | Results Ticker Bar (2025-26 admits) | index.html | ✅ Done |
| 4 | Stats — "They Can't Refuse" counters | index.html | ✅ Done |
| 5 | Global Map section | index.html | ✅ Done |
| 6 | "Are You?" personality section | index.html | ✅ Done |
| 7 | What's Cooking — 3 service cards | index.html | ✅ Done |
| 8 | Our Results + university logos | index.html | ✅ Done |
| 9 | Partners / Co-Conspirators | index.html | ✅ Done |
| 10 | Press / Paparazzi logos | index.html | ✅ Done |
| 11 | Testimonials carousel | index.html | ✅ Done |
| 12 | Social feed CTA | index.html | ✅ Done |
| 13 | FAQ accordion | index.html | ✅ Done |
| 14 | Footer CTA banner + Footer | index.html, css/styles.css | ✅ Done |

All sections of `index.html` are ✅ Done (v14).
Next: build inner pages, mock simulator, then portals — one per session.

### PHASE A — Shared Infrastructure

| # | Task | Files | Status |
|---|------|-------|--------|
| A1 | **Theme Engine & Global Nav** Create `js/theme.js` (reads `localStorage` key `dc-theme`; applies `class="dark"` to `<html>`; default is light; toggle writes to localStorage). Create `css/shared.css` (CSS custom properties for both light and dark token sets from Brand Tokens above). Implement the Sun/Moon Theme Toggle component in the global Nav that works on all pages. Add `<script>tailwind.config = { darkMode: 'class' }</script>` to the head template. Retrofit `index.html` + `css/styles.css` to use `dark:` Tailwind variants so the homepage loads light by default but looks correct when dark mode is toggled on. | css/shared.css, js/theme.js, index.html, css/styles.css | ✅ Done |
| A2 | **Portal Shell Infrastructure** Create `css/portal.css` + `js/portal.js` — sidebar layout, role badge, tabs, portal nav shell. This is the shared scaffold that all portal pages (E, F, G, H) will build on. Must inherit theme toggle from `js/theme.js`. | css/portal.css, js/portal.js | ✅ Done |

---

### PHASE B — Public Inner Pages

| # | Page | Key Sections (per UJM + IA + PRD) | Files | Status |
|---|------|-----------------------------------|-------|--------|
| B1 | **about.html** | Hero banner · Our Story · Mission & Vision · Meet the Teachers (cards) · World & Country Toppers · Cambridge + CollegeBoard affiliations | about.html | ✅ Done |
| B2 | **services.html** | Hub page · Subject grid cards (IGCSE, A Level, AP, IB, SAT, IELTS, Career Counselling, Uni Applications) · Each card links to sub-page · Sticky filter tabs | services.html | ✅ Done |
| B3 | **services/igcse.html** | Hero · Subjects list · What's included · Pricing CTA · Teacher bio · FAQ accordion · Enrol CTA | services/igcse.html | ✅ Done |
| B4 | **services/a-level.html** | Same structure as IGCSE · A Level specific content | services/a-level.html | ✅ Done |
| B5 | **services/ap.html** | AP-specific content · CollegeBoard badge | services/ap.html | ✅ Done |
| B6 | **services/ib.html** | IB-specific content | services/ib.html | ✅ Done |
| B7 | **services/sat-act.html** | SAT/ACT prep content | services/sat-act.html | ✅ Done |
| B8 | **services/ielts-toefl.html** | IELTS/TOEFL content | services/ielts-toefl.html | ✅ Done |
| B9 | **pricing.html** | 3 package tiers (World Topper / A* / Foundations) · Pricing table · Payment methods by country (MY FPX, IN Razorpay, KSA, UK Stripe, PK EasyPaisa, Intl Wise) · FAQ | pricing.html | ✅ Done |
| B10 | **resources.html** | Free Notes · Past Paper Books (Topical + Yearly) · Predicted Papers · AP Practice · IELTS/SAT Prep · Blog teaser | resources.html | ✅ Done |
| B11 | **careers.html** | Open roles (TA, SM, HR, IT, Accounts) · Role cards with JD summary · Application form · Ambassador/Intern programme | careers.html | ✅ Done |
| B12 | **contact.html** | WhatsApp QR + link · General enquiry form · Social links · Regional contact info · Map embed placeholder | contact.html | ✅ Done |

---

### PHASE C — Free Mock Simulator (timed past paper solver)

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| C1 | **mock.html — Landing & Subject Selector** | Hero · Subject selector grid (IGCSE/A Level/AP/IB/SAT/IELTS) · Exam level/paper selector · Difficulty options · "Start Timed Mock" CTA · How it works steps · Past stats ticker | mock.html | ✅ Done |
| C2 | **mock.html — Timed Exam Interface** | Full-screen exam UI · Live countdown timer (top bar) · Question number nav sidebar · MCQ + short answer question types · Flag for review button · Progress bar · Pause/Resume · Dark mode only for focus · Submit confirmation modal | mock.html (exam view) | ✅ Done |
| C3 | **mock.html — Results & Profile Stats** | Score breakdown by topic · Accuracy % · Time-per-question analytics · Weak area highlights · Comparison vs DivergenCIE average · Enrol Now upsell CTA · Share result button · Retake button | mock.html (results view) | ✅ Done |

---

### PHASE D — Auth Pages

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| D1 | **auth/login.html** | Logo · Email + password form · Google OAuth button · Forgot password link · Role auto-detection on login · Dark/light split layout | auth/login.html | ✅ Done |
| D2 | **auth/forgot-password.html** | Email entry · Confirmation state · Back to login | auth/forgot-password.html | ✅ Done |

---

---

## 🏛️ ROLE ARCHITECTURE (confirmed by user — do not alter without explicit instruction)

### Portals & Roles

| Portal | Role | Access level |
|--------|------|-------------|
| `portal/management/` | Management | Highest — all portals, all tickets, all metrics, revenue, approve claims |
| `portal/staff/` | Staff (all dept roles) | Own dept tickets/tasks, interdept forward, escalate to mgmt, content bank, claims |
| `portal/teacher/` | Teacher | Own schedule, timesheet, hour-based claims, reply to tickets only (cannot close) |
| `portal/ambassador/` | Ambassador | Raise tickets to DC staff only — no student data access |
| `portal/parent/` | Parent | Child progress, fees, raise tickets routed to dept |
| `portal/student/` | Student | Classes, progress, assignments, recordings, raise tickets routed to dept |

### Staff Department Structure

Depts: **PR** (Teaching Assistant is a role within PR, not a separate dept) · **HR** · **Finance** · **Marketing** · **IT**

Every dept has:
- **Members** — see only their own assigned tickets/tasks
- **Supervisor / HOD** — same portal as member + extra: see all dept tickets, assign tasks to members, view dept metrics. Tag assigned by Management per dept.
- All staff role names (Intern, Ambassador, etc.) are just role labels — same portal rules apply based on member/supervisor tag, not role name. General Intern = Staff portal, member-level access.

### Ticket / Task System (universal — all tasks are tickets)

**Ticket attributes:** Title · Department · Assignee · Creator · Deadline · Priority (Low/Medium/High/Urgent) · Status (Open/In Progress/Pending Reply/Resolved/Closed) · Comments thread · File attachments · Links · Created date · Last updated

**Routing rules:**
- **Student/Parent** → raise ticket, select dept (PR, IT, Finance, HR, Marketing) → staff in that dept sees it → PR/TA role can forward to Teacher for comment → Teacher replies → Staff reads and closes
- IT/Marketing **cannot** see student/parent tickets unless explicitly forwarded to their dept
- **Staff** → create internal ticket/task, assign to member in own dept, forward interdept, or escalate to Management
- **Ambassador** → can only raise tickets to DC staff (any dept) — zero access to student data
- **Management** → sees all tickets across all roles, can create/assign/close any ticket

**Supervisor extras:** Full dept ticket queue visibility · assign tasks to members · view per-member task completion

### Dept Content Bank (per dept)

Shared link repository visible to all dept members. Fields: Name · URL · Date added · Description. Any member can add. Supervisor + Management can view all dept banks.

### Claims

| Role | Claim type |
|------|-----------|
| Teacher | Hour-based timesheet (existing G1–G4 flow, unchanged) |
| Staff | Meeting/event attendance log → attendance-based claim |
| Management | Approves all claims |

### Management Metrics (per staff + per dept, weekly trend graphs)

| Category | Metrics |
|----------|---------|
| **Productivity** | Task/ticket completion %, deadline hit rate, avg resolution time, tickets open vs closed |
| **Attendance** | Meeting/event attendance rate per staff, attendance trend over time |
| **Financial** | Budget spent per dept (weekly/monthly), claims submitted vs approved, total payout |
| **Activity** | Staff activity score (tickets touched, comments, files uploaded), tickets created vs resolved |
| **Workload** | Open task count per member, overdue tasks, avg tasks per member |
| **Quality** | Tickets re-opened after close, escalation rate to management |

All metrics: filterable by dept, by individual staff member, by date range. Weekly change graphs (line charts) for every metric. Management dashboard = overview; drill-down to dept page or staff profile.

---

### PHASE E — Student Portal ✅ ALL DONE

| # | Page | Status |
|---|------|--------|
| E1 | portal/student/dashboard.html | ✅ Done |
| E2 | portal/student/classes.html | ✅ Done |
| E3 | portal/student/assignments.html | ✅ Done |
| E4 | portal/student/recordings.html | ✅ Done |
| E5 | portal/student/progress.html | ✅ Done |
| E6 | portal/student/curriculum.html | ✅ Done |
| E7 | portal/student/support.html | ✅ Done — ticket routing to be updated in Phase I |

---

### PHASE F — Parent Portal ✅ ALL DONE

| # | Page | Status |
|---|------|--------|
| F1 | portal/parent/dashboard.html | ✅ Done |
| F2 | portal/parent/progress.html | ✅ Done |
| F3 | portal/parent/fees.html | ✅ Done — ticket routing to be updated in Phase I |

---

### PHASE G — Teacher Portal (renamed from Staff Portal)

**Action required before building new phases:** Move + rename `portal/staff/` → `portal/teacher/`. Update all internal nav links, paths, and sidebar branding. Teacher portal is hour-based (unchanged flow). Reply-only on tickets.

| # | Page | Sections | Status |
|---|------|----------|--------|
| G1 | **portal/teacher/dashboard.html** | Rename + amend: change sidebar label "Staff Portal" → "Teacher Portal", role badge → role-teacher, remove payment-claims nav item if not applicable, add ticket reply nav item | ✅ Done (needs rename pass) |
| G2 | **portal/teacher/attendance.html** | Unchanged — class attendance submission | ✅ Done (needs rename pass) |
| G3 | **portal/teacher/timesheet.html** | Unchanged — hour log | ✅ Done (needs rename pass) |
| G4 | **portal/teacher/payment-claims.html** | Unchanged — hour-based claim | ✅ Done (needs rename pass) |
| G5 | **portal/teacher/tickets.html** | Ticket reply interface — teacher sees tickets forwarded to them by PR/TA staff · Can add comments/replies · Cannot close or reassign · Status shows "Awaiting Staff Review" after reply · **Also add pre-class checklist widget to portal/teacher/dashboard.html**: 5-point reminder strip (Recording ON · Breakout room created · Camera on · Whiteboard titled DC-[date]-[subject] · Students reminded) — dismissible per session, auto-resets next class | ✅ Done |

---

### PHASE H — Management Portal (renamed from Admin Portal)

**Action required:** Rename `portal/admin/` → `portal/management/`. Update sidebar, role badge, branding.

| # | Page | Sections | Status |
|---|------|----------|--------|
| H1 | **portal/management/dashboard.html** | Rename + amend: update sidebar label, role badge purple, nav = Dashboard/Users/Metrics/Tickets/Claims | ✅ Done (needs rename pass) |
| H2 | **portal/management/users.html** | User table (all roles) · Role filter · Add user form · Supervisor assignment per dept · Invite link generator · Deactivate toggle · Search | ✅ Done |
| H3 | **portal/management/metrics.html** | Per-dept + per-staff performance dashboard · All metric categories (productivity/attendance/financial/activity/workload/quality) · Weekly trend line graphs per metric · Dept filter · Staff drill-down · Date range selector | ✅ Done |
| H4 | **portal/management/tickets.html** | All tickets across all roles · Filter by role/dept/status/priority · Assign · Close · Escalation queue · Interdept view | ✅ Done |

---

### PHASE I — Staff Portal (NEW — separate from Teacher)

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| I1 | **portal/staff/dashboard.html** | Sidebar (dept badge, Supervisor vs Member tag) · Stat cards: open tasks, overdue, tickets this week, attendance streak · My tasks today · Dept announcements · Quick actions — **dept-aware: each dept sees relevant quick actions based on logged-in dept tag (PR/HR/Finance/Marketing/IT)** | portal/staff/dashboard.html | ⬜ TODO |
| I2 | **portal/staff/tickets.html** | Two views: Member (own tickets) / Supervisor (full dept queue) · Create ticket/task · Assign (supervisor only) · Status update · Comments thread · File upload · Link field · Forward to dept · Escalate to management · Filter by status/priority/assignee | portal/staff/tickets.html | ⬜ TODO |
| I3 | **portal/staff/attendance.html** | Log meeting/event attendance · Fields: Event name, date, duration, type (meeting/training/event/other), notes · Submission history table · Monthly attendance summary | portal/staff/attendance.html | ⬜ TODO |
| I4 | **portal/staff/claims.html** | Attendance-based claim · Auto-pulls from attendance log · Month selector · Readonly: events attended, total sessions · Submit claim → Management approval queue | portal/staff/claims.html | ⬜ TODO |
| I5 | **portal/staff/content-bank.html** | Dept shared link bank · Add link: name/URL/date/desc · List view sorted newest-first · Search/filter · Supervisor sees all depts in dropdown | portal/staff/content-bank.html | ⬜ TODO |
| I6 | **portal/staff/schedule.html** *(PR/Ops only)* | Teacher schedule builder · Student-teacher assignment table (B-groups/C-groups/T-groups) · Conflict checker (auto-flag overlapping slots) · Batch/group code management · Assign students to teachers · Post-class submission tracker (WBD name, link, duration, recording — 24hr SLA, overdue flag + remind button per teacher) | portal/staff/schedule.html | ⬜ TODO |
| I7 | **portal/staff/hr-candidates.html** *(HR only)* | Candidate bank (name/role/status/CV link/notes, active/inactive) · Interview scheduler (self-service slot picker) · Trial task assignment + feedback form (star rating + text) · Offer letter tracker · Warning/termination log (management-triggered) · Outreach log for Topper Hunt (contacted/responded/invited) | portal/staff/hr-candidates.html | ⬜ TODO |
| I8 | **portal/staff/finance-rates.html** *(Finance only)* | Rate card matrix (course × country × group code: B-groups/C-groups/T-groups) · Invoice manager (auto-generate from enrolment + rate card, issue to parent) · Payment tracker (Paid/Due/Overdue/Deactivated per student, colour-coded) · Payment reminder stage tracker (5 stages, WA button auto-selects correct message) · Pre-check gate at student activation (payment method confirmed, first invoice paid) · Budget planner (dept allocation table, submit to management, approval status) · Discount/coupon manager (assign to student, auto-applies to next invoice) | portal/staff/finance-rates.html | ⬜ TODO |
| I9 | **portal/staff/marketing-calendar.html** *(Marketing only)* | Posting calendar (Canva link + Drive link + caption + date + status: Scheduled/Posted/Missed, auto-flag if missed) · Asset bank (name/type/Drive link/date/campaign tag) · Lead log (source/name/contact/date/passed-to-PR flag + handoff button → triggers PR ticket) · Ambassador tracker (name/cohort 3mo–6mo/referrals/enrolments/commission/status, auto-compute commission) | portal/staff/marketing-calendar.html | ⬜ TODO |
| I10 | **portal/staff/meetings.html** *(All staff)* | Interdept meeting request flow: Create meeting (title/dept/person/date/time/agenda) · Target dept/person accepts, reschedules, or declines · Confirmed meetings shown in calendar view · Bimonthly Workshop + Townhall scheduling (management creates, all-staff notified) | portal/staff/meetings.html | ⬜ TODO |

---

### PHASE J — Ambassador Portal (NEW)

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| J1 | **portal/ambassador/dashboard.html** | Sidebar · Welcome + role note (no student access) · Quick stats: tickets raised, open, resolved · Quick action: New Ticket | portal/ambassador/dashboard.html | ⬜ TODO |
| J2 | **portal/ambassador/tickets.html** | Raise ticket to DC staff · Select dept · Title/desc/priority/attachments · View own ticket history + replies · Cannot see student/parent data at any point | portal/ambassador/tickets.html | ⬜ TODO |

---

### PHASE K — Rename & Amendment Pass

One session to handle all renames and structural fixes before new portal phases launch.

| # | Task | Files | Status |
|---|------|-------|--------|
| K1 | Move `portal/staff/*` → `portal/teacher/*` · Update all paths, nav links, sidebar labels, role badges · "Staff Portal" → "Teacher Portal" throughout | portal/teacher/dashboard,attendance,timesheet,payment-claims | ✅ Done |
| K2 | Move `portal/admin/*` → `portal/management/*` · Update sidebar, role badge, nav items to match Phase H spec | portal/management/dashboard | ✅ Done |
| K3 | Update `portal/student/support.html` · Ticket routing: student selects dept when raising ticket · Remove hardcoded "WhatsApp DC" as primary — ticket system is primary | portal/student/support.html | ✅ Done |
| K4 | Update `portal/parent/fees.html` + `dashboard.html` · Add ticket raise option routed to Finance/HR as appropriate | portal/parent/ | ✅ Done |
| K5 | Update `auth/login.html` role routing · Add routes for: teacher / staff / ambassador / management portals | auth/login.html | ✅ Done |

**Build order going forward: I1–I5 → I6–I10 → J1–J2**

- K1–K5 ✅ Done
- H1–H3 ✅ Done
- H4 ✅ Done (file existed from prior session, PLAN.md updated)
- G5 ✅ Done
- Next: I1 (staff/dashboard.html) → I2–I5 → I6 (PR schedule) → I7 (HR candidates) → I8 (Finance rates) → I9 (Marketing calendar) → I10 (Meetings) → J1–J2 (Ambassador portal)

---

## 🔖 Handoff Notes — v13

**Last section built:** Section 13 — FAQ accordion
**Next section:** Section 14 — Footer CTA banner + Footer
**State of build:** Sections 0–13 complete. 7 FAQ items derived from UJM visitor pain points and PRD. Smooth grid-template-rows accordion. One-open-at-a-time logic in main.js. Gold WhatsApp CTA button at base.
**Watch out for:** Section 14 (Footer CTA + Footer) is the final section. Build two parts as one block: (1) a full-width gold/dark CTA banner; (2) a 4-column dark footer per the wireframe. Close off with copyright line. Replace `</body></html>` cleanly.
**Files changed this session:** index.html, css/styles.css, js/main.js, PLAN.md

---

## 🔖 Handoff Notes — v14

**Last section built:** Section 14 — Footer CTA banner + Footer
**Next section:** Phase A1 — css/shared.css + js/theme.js shared infrastructure
**State of build:** Homepage (index.html) 100% complete. Sections 0–14 all ✅ Done. Footer CTA: gold/dark gradient, "Think You Can Get A*? We Know You Can." + Enrol Now + Try Free Mock. Footer: 4-col (logo/tagline/social | Quick Links | Services | Contact & Social), Cambridge + CollegeBoard badges, bottom bar with copyright + Privacy Policy + T&C. Fully responsive.
**Watch out for:** Social URLs updated to real handles from BDG doc (instagram.com/divergencie_coaching, linkedin.com/company/divergencie-coaching). WhatsApp number still placeholder — admin must supply. Privacy Policy + T&C pages still needed (GDPR). Next session: build the shared infrastructure (A1) — theme.js, shared.css, Tailwind darkMode config, and retrofit index.html to load light by default with dark: variants. All pages default LIGHT; dark activates via Sun/Moon toggle persisted in localStorage.
**Files changed this session:** index.html, css/styles.css, PLAN.md

---

## 🔖 Handoff Notes — v16

**Last section built:** A1 — Theme Engine & Global Nav
**Next section:** A2 — Portal Shell Infrastructure (css/portal.css + js/portal.js)
**State of build:** Homepage fully retrofitted to light-mode default. `js/theme.js` created — reads `localStorage` key `dc-theme`, applies `class="dark"` to `<html>` before paint (no flash), Sun/Moon toggle persists preference. `css/shared.css` created — CSS custom properties for both light and dark token sets, shared nav styles, theme toggle button styles. `css/styles.css` root variables updated to light-mode defaults with `html.dark` overrides; light mode override block appended for all sections. Tailwind `darkMode: 'class'` config added to `index.html` `<head>`. Sun/Moon toggle added to both desktop nav-right and mobile controls area. Footer CTA + footer use dark background in light mode (intentional dark band at bottom — brand decision, looks premium).
**Watch out for:** `css/shared.css` is loaded AFTER `css/styles.css` in index.html — shared.css nav styles take precedence. Inner pages (Phase B+) should load `css/shared.css` and `css/inner.css` only — NOT `css/styles.css` (homepage-only). Every new page must include `<script>tailwind.config = { darkMode: 'class' }</script>` after Tailwind CDN, and `<script src="/js/theme.js"></script>` in `<head>`. The theme toggle button HTML (Sun/Moon SVGs with `.theme-toggle`, `.theme-icon-sun`, `.theme-icon-moon`) must be in every page nav. A2 portal.css/portal.js can reference shared.css variables.
**Files changed this session:** js/theme.js (new), css/shared.css (new), css/styles.css (retrofitted), index.html (Tailwind darkMode config + theme.js + toggle button)

---

## 🔖 Handoff Notes — v17

**Last section built:** Bug fixes from screenshots (pre-A2 patch)
**Next section:** A2 — Portal Shell Infrastructure (css/portal.css + js/portal.js)
**State of build:** 7 visual fixes applied: (1) Hero buttons now rect with inline SVG arrow — no Lucide dependency; (2) theme.js inlined into index.html head so path issues are gone, toggle works; (3) Nav links always white when transparent over hero, turn charcoal/muted when scrolled in light mode, white in dark scrolled; (4) Book a Free Call button inline SVG icon; (5) Press logos more visible — improved contrast in both modes; (6) Instagram CTA button improved — dark base with gradient revealed on hover instead of always-on garish gradient; (7) Instagram grid now shows real Unsplash education/graduation photos with readable overlay gradient and always-visible tags.
**Watch out for:** `js/theme.js` file still exists in the ZIP but index.html now uses the inline version — both are safe, inline takes precedence. Real Instagram photos use Unsplash URLs — they require internet connection to render. WhatsApp number updated to real number from PLAN.md (+919650675507). Instagram URL updated to real handle (divergencie_coaching).
**Files changed this session:** index.html, css/styles.css

---

## 🔖 Handoff Notes — v19

**Last section built:** Visual bug fixes (buttons, map labels, hero sub-text)
**Next section:** A2 — Portal Shell Infrastructure (css/portal.css + js/portal.js)
**State of build:** Fixed 3 bugs: (1) Duplicate `.btn-gold` CSS override removed — was forcing `inline-block` + pill shape, breaking icon/text layout; (2) `.hero-sub` colour hardcoded to `rgba(255,255,255,0.75)` — was using `var(--text-muted)` which goes dark grey in light mode, hiding it over the hero image; (3) `.dot-label` gets `fill: #1a1a1a` in light mode via `html:not(.dark)` override — was white-on-white. Instagram grid: real post scraping blocked by Instagram without Graph API token — current Unsplash placeholders preserved; owner must supply post URLs or API token to show real posts.
**Watch out for:** Instagram real posts require owner to provide 3 public post URLs or an Instagram Basic Display API token.
**Files changed this session:** css/styles.css, PLAN.md

---

## 🔖 Handoff Notes — v20

**Last section built:** Instagram grid — replaced Unsplash placeholders with real embeds
**Next section:** A2 — Portal Shell Infrastructure (css/portal.css + js/portal.js)
**State of build:** Instagram grid now uses 6 native `<blockquote>` embeds (instagram-media) loaded via `//www.instagram.com/embed.js`. Posts: DOfygNciKFU, DOObBBZCD85, DM20TmOM6rb, DMhwT5KsEdX, DMYlrM2Ml21, DIGkxkmxHWK. Grid is 3-col desktop, 1-col mobile. Embeds render the real post photo, caption, and likes in-browser — no API token needed.
**Watch out for:** Instagram embeds require internet connection to render. They load asynchronously so there may be a brief blank state. The embed.js script is loaded once at the bottom of the grid block.
**Files changed this session:** index.html, css/styles.css, PLAN.md

---

## 🔖 Handoff Notes — v21

**Last section built:** Instagram embeds — full inline-styled blockquotes
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** All 6 Instagram embeds now use the complete inline-styled blockquote format (matching Instagram's official embed code with data-instgrm-captioned, full SVG, inline styles). This fixes the grey/broken first card issue — all 6 cards render uniformly white with shadow effect. Posts: DOfygNciKFU, DOObBBZCD85, DM20TmOM6rb, DMhwT5KsEdX, DMYlrM2Ml21, DIGkxkmxHWK.
**Watch out for:** embed.js loads once after the grid — correct. Embeds require internet to render fully.
**Files changed this session:** index.html, PLAN.md

---

## 🔖 Handoff Notes — v22

**Last section built:** Footer link fixes
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** Fixed footer CONTACT & SOCIAL links — WhatsApp now points to real number (wa.me/919650675507), Instagram to @divergencie_coaching, LinkedIn to /company/divergencie-coaching/. Service card cut-off in screenshot was viewport crop, not a CSS bug. Footer icon links also corrected.
**Watch out for:** Nothing blocking.
**Files changed this session:** index.html, PLAN.md

---

## 🔖 Handoff Notes — v23

**Last section built:** Fix featured service card grey bg in light mode
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** `.svc-card--featured` was using `--dark-3` (#e8e8e8 in light mode) causing grey appearance. Light-mode override changed from `#f8f8f8` to `#ffffff` with gold border + subtle shadow to match other cards.
**Watch out for:** Nothing blocking.
**Files changed this session:** css/styles.css, PLAN.md

---

## 🔖 Handoff Notes — v24

**Last section built:** Lucide icon rendering fix
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** Root cause: Instagram `embed.js` (async) mutates the DOM after `lucide.createIcons()` runs, wiping rendered SVG icons. Fix: `createIcons()` now called 3 times — immediately, at 800ms, and at 2000ms — so icons survive embed.js DOM mutations. Affects footer social circles and footer contact icons (Instagram, LinkedIn rows).
**Watch out for:** Nothing blocking.
**Files changed this session:** js/main.js, PLAN.md

---

## 🔖 Handoff Notes — v25

**Last section built:** Instagram embeds disabled — dummy photo grid
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** Live Instagram embeds replaced with dummy Unsplash photo grid. Flag in HTML comment: `<!-- IG_EMBEDS_ENABLED: false -->`. To re-enable: set flag to true and restore blockquote embeds + embed.js script. Dummy grid uses same layout (4-col, wide+tall tiles, hover overlay with hashtag). embed.js removed so Lucide icon race condition is also resolved.
**Watch out for:** Lucide setTimeout re-runs in main.js (from v24) can now be simplified since embed.js is gone — leave as-is, harmless.
**Files changed this session:** index.html, css/styles.css, PLAN.md

---

## 🔖 Handoff Notes — v26

**Last section built:** Footer social icon fix — inline SVGs
**Next section:** A2 — Portal Shell Infrastructure
**State of build:** Footer social circle icons (instagram, linkedin, message-circle, star) and footer contact icons (map-pin) replaced with inline SVGs — no longer depend on lucide.createIcons() timing. Circles now always show icons.
**Watch out for:** Other data-lucide icons (faq plus, press globe, svc book-open etc) still use Lucide — leave as-is, they're less critical.
**Files changed this session:** index.html, PLAN.md

---

## 🔖 Handoff Notes — v26-a2

**Last section built:** A2 — Portal Shell Infrastructure (css/portal.css + js/portal.js)
**Next section:** B1 — about.html
**State of build:** A2 complete in 2 parts. `css/portal.css`: sidebar layout (fixed 240px, mobile slide-in), role badges (student/parent/staff/admin), portal topbar, stat cards + stats-grid, tabs, table, status badges, form elements, portal buttons (primary/outline/ghost/danger/sm), empty states, grid layouts, alert strips, modal overlay, welcome banner, full responsive. `js/portal.js`: sidebar toggle + overlay, active nav detection, tab switching with sessionStorage persistence, modal open/close (data-modal-open/close attrs + Esc key), theme toggle for portal topbar, role simulation (?role= param or localStorage dc-role), notification bell stub, auto-dismiss alerts, confirm buttons, window.DC.portal API (openModal, closeModal, getRole, setRole).
**Watch out for:** Every portal page must load: shared.css → portal.css → theme.js → portal.js (in that order). Never load styles.css on portal pages. Role sim via ?role=student|parent|staff|admin in URL. data-show-role="student,admin" on elements to show/hide by role. Portal theme toggle needs id="portal-theme-toggle".
**Files changed this session:** css/portal.css (new), js/portal.js (new), PLAN.md

---

## 🔖 Handoff Notes — v26-b1

**Last section built:** B1 — about.html
**Next section:** B2 — services.html
**State of build:** about.html complete. Also created css/inner.css (required for all Phase B pages — load after shared.css, never styles.css). Sections: inner-nav (navy bg, scrolled state), hero with breadcrumb, Our Story split layout (with stats), Mission/Vision/Values 3-card grid, Meet the Teachers 6-card grid (initials avatar, name, subject, qual, badge), World & Country Toppers pill strip (navy bg), Accreditations row (Cambridge + CollegeBoard + IB), footer CTA + full footer. All data-anim scroll animations wired inline. Nav active state on About link.
**Watch out for:** inner.css must be created BEFORE any Phase B page — it's now done. Footer HTML is the source of truth — copy verbatim for all B pages (update active nav link only). Teacher cards use initials avatar (no real photos); owner must supply photos to replace. Unsplash images used for story section — require internet.
**Files changed this session:** css/inner.css (new), about.html (new), PLAN.md

---

## 🔖 Handoff Notes — v27b

**Last section built:** B2 — services.html
**Next section:** B3 — services/igcse.html (Hero · Subjects list · What's included · Pricing CTA · Teacher bio · FAQ accordion · Enrol CTA)
**State of build:** services.html complete. Sections: inner-nav (Services link active/gold), hero (navy bg, radial gradient accents, breadcrumb, qualification badges), sticky filter tabs (All / Exam Prep / Language Tests / Admissions — JS filters cards by data-category), 6 exam prep cards (IGCSE, A Level, AP, IB, SAT/ACT, IELTS/TOEFL) + 2 wide admissions cards (University Applications, Career Counselling), each with icon, badge, subjects chips, stat footer, animated arrow — hover lifts + accent top border via CSS var --card-accent. Why DivergenCIE 2-col block (navy bg, 4 bullet points + 4 stat tiles). Gold CTA strip ("Not sure? WhatsApp us"). Footer CTA + full footer identical to about.html. Scroll animations via IntersectionObserver.
**Watch out for:** services/ subdirectory not yet created — B3 will need `mkdir -p divergencie/services/`. Filter tab JS shows/hides cards by data-category attr (all/exams/language/admissions). inner.css .anim-visible class must exist for scroll animations — it's in inner.css from v26-b1. Cards link to sub-pages (/services/igcse.html etc.) which are all ⬜ TODO — links will 404 until B3–B8 built.
**Files changed this session:** services.html (new), PLAN.md

---

## 🔖 Handoff Notes — v28

**Last section built:** B3 — services/igcse.html
**Next section:** B4 — services/a-level.html (Same structure as IGCSE · A Level specific content)
**State of build:** services/igcse.html complete. Sections: inner-nav (Services link active/gold), breadcrumb (Home › Services › IGCSE Coaching), hero (navy bg, radial gradient, Cambridge Authorised + Grades 9–11 badges, headline, sub, Enrol Now + Try Free Mock CTAs, 4 hero stats strip: 40+ World Toppers / 98% A*–B Rate / 25+ Subjects / 5+ Countries), Subjects grid (18 chips, highlighted core 4: Maths/Physics/Chemistry/Biology, all major IGCSE codes listed, WhatsApp fallback for unlisted), What's Included 6-card grid (Live 1-to-1 / Past Papers / A* Progress Tracker / Recordings / Doubt Resolution / Predicted Papers), Pricing CTA dark band (3 tier pills: Foundations/A* Track/World Topper + View Pricing + WhatsApp buttons), Teacher Bio (avatar initials RS, Riya Sharma profile, quals badges, subject specialist allocation note), FAQ accordion (6 Qs: start timing / O Level coverage / delivery / trial / payment / missed class), Enrol CTA (Book Free Session + Try Mock + WhatsApp + 4 trust signals), footer-cta + full footer (IGCSE link highlighted gold in Services col). Light/dark fully supported. Scroll animations via data-anim/IntersectionObserver. FAQ one-open-at-a-time.
**Watch out for:** B4–B8 (remaining service sub-pages) follow identical structure — clone igcse.html and swap: subject chips, hero headline/stats, teacher bio initials/name/subjects, FAQ (keep payment/delivery/missed class, swap subject-specific Qs). `services/` subdirectory already exists. Teacher data is placeholder — owner must supply real teacher names, quals, and World Topper counts per subject. Hero stats (40+/98%/25+/5+) are illustrative — owner should confirm real figures before going live.
**Files changed this session:** services/igcse.html (new), PLAN.md

---

## 🔖 Handoff Notes — v29

**Last section built:** B4 — services/a-level.html
**Next section:** B5 — services/ap.html (AP-specific content · CollegeBoard badge)
**State of build:** a-level.html complete. Cloned igcse.html, swapped all content: title/meta, breadcrumb, hero (headline: "A Level Coaching Built for University Offers", sub mentions Oxford/Cambridge/Imperial/LSE/UCL), hero stats (60+ University Offers / 98% A*–B / 20+ Subjects / 5+ Countries), subjects grid (18 A Level codes: 9709 Maths, 9702 Physics, 9701 Chem, 9700 Bio, 9708 Econ etc), included section sub updated for A Level paper focus, teacher bio (Aryan Patel, BSc Maths Imperial, Lead A Level Tutor), FAQ (AS vs full A Level Q, start timing for Yr12/Yr13), enrol CTA updated for university offers framing. Footer A Level link highlighted gold.
**Watch out for:** B5 ap.html needs CollegeBoard badge in hero (not Cambridge) — use hero-badge--cambridge class but with CollegeBoard text and different colour. AP subject codes are different (AP Calculus BC, AP Physics C etc). Teacher bio should reference US college admissions context. B6–B8 follow same clone pattern.
**Files changed this session:** services/a-level.html (new), PLAN.md

---

## 🔖 Handoff Notes — v30

**Last section built:** B5 — services/ap.html
**Next section:** B6 — services/ib.html (IB-specific content)
**State of build:** ap.html complete. Cloned igcse.html, swapped: title/meta (CollegeBoard Recognised badge, navy #003893 colour), hero headline ("AP Coaching Built for US College Admissions"), hero stats (30+ AP Scholars / 98% A*–B / 20+ AP Courses / 5+ Countries), subjects grid (18 AP courses: Calculus BC/AB, Physics C, Chem, Bio, Stats, CS A, Econ, Psych, English Lang/Lit, World/US History, Env Science, Human Geo, Gov & Politics, Spanish), teacher bio (Priya Nair, IIT Bombay → Imperial MSc, 30+ AP 5s badge), FAQ Q1 (Pre-AP coverage), enrol CTA updated for US college framing. Footer AP link highlighted gold.
**Watch out for:** B6 ib.html — IB uses its own badge (IBO, not Cambridge or CollegeBoard). IB subjects use course names not codes (HL/SL designation). Teacher should be a third profile. Hero stats should reference IB 7s not A*s. Pricing section language should reference IB DP (Diploma Programme) Years 1 & 2.
**Files changed this session:** services/ap.html (new), PLAN.md

---

## 🔖 Handoff Notes — v31

**Last section built:** B6 — services/ib.html
**Next section:** B7 — services/sat-act.html (SAT/ACT prep content)
**State of build:** ib.html complete. Cloned ap.html, swapped: IB World School badge (green #00783c), hero headline ("IB Diploma Coaching Built for Top University Offers"), hero stats (25+ IB 7s / 98% A*–B / 12+ IB Subjects / 5+ Countries), subjects grid (16 IB subjects: Maths AA HL, Physics HL, Chem HL, Bio HL, Maths AI, CS, Econ, Business, English A/B, History, Geo, Psychology, Visual Arts, TOK, EE), DP Year 1 & 2 badge, teacher (Arjun Mehta, Oxford Physics → UCL PGCE, 25+ IB 7s), FAQ (DP1/DP2 coverage), IB framing throughout.
**Watch out for:** B7 sat-act.html — SAT/ACT uses CollegeBoard (SAT) + ACT Inc badges. No subject grid needed — replace with score band targets (1400–1600 SAT / 30–36 ACT). Hero stats should reference score improvements. Teacher should be a 4th profile. Include a "SAT vs ACT — which suits you?" comparison block.
**Files changed this session:** services/ib.html (new), PLAN.md

---

## 🔖 Handoff Notes — v32

**Last section built:** B7 — services/sat-act.html
**Next section:** B8 — services/ielts-toefl.html (IELTS/TOEFL content)
**State of build:** sat-act.html complete. Cloned ap.html, swapped: CollegeBoard SAT badge, hero headline ("SAT & ACT Prep Built for Top US College Offers"), hero stats (150+ Avg Score Gain / 94% Hit Target / 1550+ Top Score / 5+ Countries), replaced subject chips grid with 2-col SAT vs ACT coverage cards (SAT: RW+Math+Digital SAT strategy; ACT: English/Math/Reading/Science/Writing) each with target score strip, plus a "SAT vs ACT — which suits you?" diagnostic info strip. Teacher: Sana Rizvi (LSE BA Econ, 1580 SAT, 35 ACT, 50+ students coached). FAQ Q1: SAT vs ACT decision → free diagnostic.
**Watch out for:** B8 ielts-toefl.html — language test, not academic subject. No subject chips grid. Replace with band/score targets (IELTS 7.0–9.0 / TOEFL 100–120). Hero stats should reference band score improvements. Badge should be "British Council" or "ETS TOEFL". Include IELTS vs TOEFL comparison strip (same pattern as SAT vs ACT). Teacher should be 5th profile, ideally English-specialist.
**Files changed this session:** services/sat-act.html (new), PLAN.md

---

## 🔖 Handoff Notes — v33

**Last section built:** B8 — services/ielts-toefl.html
**Next section:** B9 — pricing.html (3 package tiers: World Topper / A* / Foundations · pricing table · payment methods by country · FAQ)
**State of build:** ielts-toefl.html complete. Cloned sat-act.html, swapped: British Council & ETS badge, hero headline ("IELTS & TOEFL Prep Built for University & Visa Success"), hero stats (1.5+ Avg Band Gain / 96% Hit Target / 7.5+ Top IELTS Band / 5+ Countries), 2-col coverage cards (IELTS: Listening/Reading/Writing T1&T2/Speaking/Mocks; TOEFL: Reading/Listening/Speaking/Writing/iBT drills/Mocks), IELTS vs TOEFL comparison strip, teacher (Aisha Khan, MA Applied Linguistics Edinburgh, IELTS 9.0, 60+ students coached). All 6 service sub-pages B3–B8 now complete.
**Watch out for:** B9 pricing.html is a standalone page — do NOT clone a service sub-page. Build fresh from inner.css/shared.css base. 3 tiers: Foundations (2 sessions/wk), A* Track (3 sessions/wk), World Topper (daily + extras). Payment methods by country: MY → FPX/DuitNow, IN → Razorpay/UPI, KSA → Al Rajhi, UK → Stripe, PK → EasyPaisa, Intl → Wise. Include FAQ (cancellation, trial session, payment timing). Pricing amounts are placeholder — owner must supply real figures before go-live.
**Files changed this session:** services/ielts-toefl.html (new), PLAN.md

---

## 🔖 Handoff Notes — v34

**Last section built:** B9 — pricing.html
**Next section:** B10 — resources.html (Free Notes · Past Paper Books topical+yearly · Predicted Papers · AP Practice · IELTS/SAT Prep · Blog teaser)
**State of build:** pricing.html complete. Fresh build from inner.css/shared.css base. Sections: inner-nav (Pricing link gold), hero (breadcrumb, headline "Simple, Transparent Pricing"), 3-tier pricing grid (Foundations 2×/wk / A* Track 3×/wk featured with Most Popular badge / World Topper 5×/wk daily), all prices show "Contact Us" with disclaimer note (owner must supply real figures before go-live), payment methods grid (6 cards: MY FPX/DuitNow, IN Razorpay/UPI, KSA Al Rajhi/STC Pay/Mada, UK Stripe, PK EasyPaisa/JazzCash, Intl Wise/PayPal), 6-item FAQ accordion (trial session, payment timing, tier switching, missed sessions, subject pricing, cancellation), footer CTA + full footer (Pricing link gold).
**Watch out for:** B10 resources.html — build as a hub/catalogue page. No individual resource downloads needed (those are gated in the portal). Public page shows cards for each resource category with a preview/description and CTA to enrol or log in. Blog teaser is a 3-card strip — use placeholder post titles from the PRD/CI doc if available. Keep page light and fast — no large images needed.
**Files changed this session:** pricing.html (new), PLAN.md

---

## 🔖 Handoff Notes — v35

**Last section built:** B10 — resources.html
**Next section:** B11 — careers.html (Open roles: TA, SM, HR, IT, Accounts · Role cards with JD summary · Application form · Ambassador/Intern programme)
**State of build:** resources.html complete. Fresh build. Sections: inner-nav, hero ("Everything You Need to Get A*"), 6-card resources grid (Topical Past Papers/free, Yearly Past Paper Books/free, Predicted Papers/gated portal, AP Practice/free, IELTS+SAT Prep Guides/free, Chapter Notes/gated portal — gated cards show 🔒 badge instead of CTA), navy portal CTA strip (Go to My Portal + Enrol to Get Access), 3-card blog teaser (IGCSE Maths/A Level Chem/Uni Admissions — all "Coming Soon" badges per CI doc Phase 2 status), footer CTA + full footer.
**Watch out for:** B11 careers.html — roles from CI doc: TA (Teaching Assistant), SM (Social Media), HR, IT, Accounts. Build as role cards with a JD summary, skills needed, and time commitment. Include an Ambassador/Intern section for students. Application form needs name, email, role applied, CV upload field (note: CV upload is UI-only — no backend, placeholder action). Auto-confirmation note should say WhatsApp reply within 48hrs.
**Files changed this session:** resources.html (new), PLAN.md

---

## 🔖 Handoff Notes — v36

**Last section built:** B11 — careers.html
**Next section:** B12 — contact.html (WhatsApp QR + link · General enquiry form · Social links · Regional contact info · Map embed placeholder)
**State of build:** careers.html complete. Sections: inner-nav (Careers link gold in footer Quick Links), hero (breadcrumb, "Build World-Class Education With Us"), Why DC values strip (8 pills: Remote/Results-Obsessed/Fast Growth/Collaborative/Performance Pay/Global/Cambridge&CollegeBoard/World Topper), 6 role cards (TA/SM/HR/IT/Accounts/General Intern + featured Intern card with gold border), Ambassador Programme 4-step grid (navy bg, numbered gold circles: Apply→Represent→Earn Rewards→Build CV), Application form (name/email/WhatsApp/role select/why text/CV upload UI-only + form note with WhatsApp fallback + 48hr reply note), form submit shows ✅ confirmation state then resets. footer-cta + full footer (Careers link gold).
**Watch out for:** B12 contact.html — build fresh (not cloned). Needs: WhatsApp QR code (generate or use placeholder SVG), general enquiry form (name/email/subject/message), regional contact info cards (UK/MY/IN/KSA/PK with WhatsApp numbers if available), social links row, map embed placeholder (iframe with placeholder src, owner must supply Google Maps embed URL). Keep page light — no heavy imagery.
**Files changed this session:** careers.html (new), PLAN.md

---

## 🔖 Handoff Notes — v37

**Last section built:** B12 — contact.html
**Next section:** C1 — mock.html Landing & Subject Selector (Hero · Subject selector grid · Exam level/paper selector · Difficulty options · Start Timed Mock CTA · How it works · Past stats ticker)
**State of build:** contact.html complete. Sections: inner-nav (Contact link gold), hero ("Get in Touch — We Respond Fast"), 2-col contact layout (left: WhatsApp card with green bg + inline QR SVG placeholder + scan note + social links pills + response SLA strip; right: general enquiry form with name/email/phone/subject-select/message + submit with confirmation state), regional contacts 3×2 grid (UK/MY/IN/KSA/PK/International — each with flag emoji, payment methods, timezone, WhatsApp CTA), map section with placeholder div (owner to swap in Google Maps iframe), footer-cta + full footer (Contact link gold). Light/dark fully supported.
**Watch out for:** QR SVG in wa-card is a placeholder — owner must replace with real WhatsApp QR code image for +91 96506 75507. Map iframe placeholder marked with HTML comment instructions. C1 mock.html is a fresh build — 3 views in one file (landing, exam, results) controlled by JS show/hide. Start with landing view only in C1; exam and results views in C2 and C3. Use inner.css/shared.css base but mock landing can have a distinct dark hero since the exam UI is focus-mode dark.
**Files changed this session:** contact.html (new), PLAN.md

---

## 🔖 Handoff Notes — v38

**Last section built:** C1 — mock.html Landing & Subject Selector
**Next section:** C2 — mock.html Timed Exam Interface (full-screen exam UI · live countdown · question nav sidebar · MCQ + short answer · flag for review · progress bar · pause/resume · dark mode only · submit confirmation modal)
**State of build:** mock.html landing view complete. Sections: inner-nav (Free Mock link gold), hero (dark navy bg, radial dual-gradient, badge strip "Timed · Free · No Sign-Up", headline, sub, Start Free Mock + Enrol CTA, 4-stat strip: 12,400+ mocks / 78% improve / 6 qualifications / Free), 3-step configurator (Step 1: 6 subject cards with emoji icons + check mark on select; Step 2: paper/level pill buttons — populated dynamically by JS from SUBJECT_LEVELS map; Step 3: 3 difficulty buttons Foundation/A* Track/World Topper with coloured dots), launch bar (navy bg, live summary text updates as user selects, "Start Timed Mock" button enables only when all 3 steps complete), How It Works 4-step card grid (Pick → Timed → Results → Know Gaps), past stats ticker (scrolling animation, 8 result items, duplicated for seamless loop), Enrol CTA strip (Book Free Consultation + View Pricing), footer-cta + full footer (Free Mock link gold). Light/dark fully supported. launchMock() stubs an alert — C2 will replace with exam view show/hide logic.
**Watch out for:** C2 should be built inside the same mock.html file — hide landing view, show exam view via JS (toggle display on #landing-view and #exam-view divs). The exam view must be dark mode only (UJM: "Dark mode only for focus") regardless of system theme — force `document.documentElement.classList.add('dark')` when exam starts, restore on exit. State (selected subject/level/diff) is already in the JS `state` object — pass it into exam view header. launchMock() stub is the entry point — replace its body in C2.
**Files changed this session:** mock.html (new), PLAN.md

---

## 🔖 Handoff Notes — v38-fix

**Last section built:** Path fix pass — mock.html + index.html nav
**Next section:** C2 — mock.html Timed Exam Interface
**State of build:** Fixed root-relative paths in mock.html (all `/css/`, `/js/`, `/assets/`, `/pages` → bare relative). Site was blank because file:// protocol can't resolve root-relative paths. Also added Free Mock nav link to index.html desktop + mobile nav (was missing). All pages now load correctly from file://.
**Watch out for:** PLAN.md pathing rule says root-relative — but this only works on a server. Current delivery is via ZIP opened locally. All pages use bare relative or `../` relative — keep that convention for all future pages including C2/C3 and all portal pages.
**Files changed this session:** mock.html (paths fixed), index.html (Free Mock added to nav)

---

## 🔖 Handoff Notes — v39

**Last section built:** C2 + C3 — Timed Exam Interface + Results View (combined into mock.html)
**Next section:** D1 — auth/login.html
**State of build:** mock.html now has 3 views controlled by JS show/hide: (1) landing-view (existing C1), (2) exam-view (C2), (3) results-view (C3 functional). Exam engine: 10-question bank per diff for IGCSE (foundation/astar/worldtopper), fallback for other subjects. Fixed topbar (logo, title, gold countdown timer, Pause, Q X/N, Submit, Exit), 3px gold progress bar, sticky Q navigator sidebar (colour-coded: gold=current, navy=answered, red=flagged, dark=unanswered), question render (MCQ with A/B/C/D option buttons, Short Answer with textarea), Flag button, Prev/Next nav, pause overlay (freezes timer), submit confirm modal (shows answered/unanswered/flagged stats + time remaining), auto-submit on timer expiry. Results view: score card (% accuracy, projected grade, MCQ correct, short answer count, time taken), topic breakdown with coloured progress bars, A* gap callout if below 80%, Retake + Get A* Coaching CTAs. Dark mode forced on exam/results views regardless of system setting; restored on exit/retake. Retake resets all state and scrolls back to configurator.
**Watch out for:** Question bank is stub data only — owner must replace with real past paper questions. Short answer questions are not auto-marked (requires human review or ML) — results page shows MCQ accuracy only and notes short answers separately. Sidebar is hidden on mobile (≤768px) via CSS — consider adding a collapsible Q-nav drawer for mobile in a future polish pass. D1 auth pages: create auth/ subdirectory. Login page needs role auto-detection logic (stub: detect by email domain or dropdown). Use inner.css/shared.css base but login can have a dark split-layout per PLAN.md spec.
**Files changed this session:** mock.html (C2 exam engine + C3 results view added), PLAN.md

---

## 🔖 Handoff Notes — v40

**Last section built:** D1 + D2 — auth/login.html + auth/forgot-password.html
**Next section:** E1 — portal/student/dashboard.html (Sidebar nav · Welcome banner · Upcoming classes widget · Assignment due dates · Progress snapshot · Announcements feed · Quick links)
**State of build:** auth/ directory created. login.html: dark/light split layout (left panel — brand, stats, testimonial; right panel — email/password form, role auto-detection strip, Google OAuth stub, show/hide password toggle, remember me, loading state, demo auth stub: password "demo" routes to portal by detected role). forgot-password.html: centered card, email input, loading state, success state (shows sent email). Both pages support theme toggle (Sun/Moon), back links, enter-key submit. Sign In nav button added to all inner pages (about, services, pricing, resources, careers, contact, mock) and all services/ sub-pages.
**Watch out for:** Auth is stub-only — no real backend. In production replace the setTimeout demo block in login.html with a real API call (Firebase Auth, Supabase, Auth0, etc.) and the forgot-password setTimeout with a real password reset endpoint. Google OAuth button shows an alert — wire up your OAuth provider. Role detection is email-keyword based (staff/admin/teacher/tutor/parent → respective portals, else student) — replace with server-side role lookup post-auth. Portal pages (E1+) are all still ⬜ TODO — login currently routes to paths that 404.
**Files changed this session:** auth/login.html (new), auth/forgot-password.html (new), about.html, services.html, pricing.html, resources.html, careers.html, contact.html, mock.html, services/[all 6].html (Sign In nav button added), PLAN.md

---

## 🔖 Handoff Notes — v41

**Last section built:** E1 — portal/student/dashboard.html
**Next section:** E2 — portal/student/classes.html (Weekly calendar view · Class cards with subject/teacher/Zoom link · Attendance record table · Missed class tracker · Reschedule request button · Timezone display toggle)
**State of build:** Student dashboard complete. Sections: portal-sidebar (logo, initials avatar, role badge, full nav links: Dashboard/Classes/Assignments/Recordings/Progress/Curriculum/Support/Free Mock/Materials, sign out), sticky topbar (page title, live timezone badge, notification bell with dot, theme toggle Sun/Moon), missed-class alert banner (hidden by default, shown via ?missed=1), welcome banner (personalised name via ?name= param or localStorage, classes-today/assigns-due counts, View Schedule + My Progress CTAs), 4 stat cards (Classes This Week, Attendance Rate, Avg Mock Score, Chapters Done), 2-col responsive grid — left: Today's Classes (2 class cards with coloured dot/subject/teacher/time/Join Zoom button), Assignments Due (3 rows with due-today/due-soon/due-ok badges), Onboarding Checklist (5 items, 3 done, progress bar); right: Progress Snapshot (4 subject bars with A* gap analysis callout), Announcements Feed (3 items with gold/blue/grey left borders), Quick Links 3×2 grid (Zoom/GCR/WhatsApp/Free Mock/Notes/Support). Theme full light/dark. Timezone auto-detected from browser. Role simulation via ?role= URL param.
**Watch out for:** E2 classes.html — weekly calendar can be a 7-column grid (Mon–Sun) with class pills. Show timezone toggle prominently (UJM pain point: wrong timezone displayed). Attendance table: columns = Date, Subject, Teacher, Status (Present/Absent/Excused). Reschedule button should open a modal or link to support.html with pre-filled category. Use portal.css modal system (data-modal-open attr + DC.portal.openModal()). Load: shared.css → portal.css → theme.js → portal.js in that order — same as dashboard. Paths from portal/student/ to root = ../../.
**Files changed this session:** portal/student/dashboard.html (new), PLAN.md

---

## 🔖 Handoff Notes — v42

**Last section built:** E2 — portal/student/classes.html
**Next section:** E3 — portal/student/assignments.html (Active assignments list · Submit button · Submission history · Past paper checklist tick-off by subject/year)
**State of build:** classes.html complete. Sections: sidebar (same source-of-truth nav, Classes active), sticky topbar, timezone bar (auto-detects browser tz + manual switcher dropdown: MY/IN/KSA/UK/PK), week nav (prev/next/Today buttons, 5-week stub array), mobile note (cal hidden <900px, text fallback), 11-row weekly calendar grid (8am–6pm, 8 class pills across Mon/Tue/Wed/Thu/Fri — IGCSE Maths/Physics/A Level Chem/Bio, colour-coded: blue=maths, gold=chem, red=phys, grey=bio), click-pill opens class detail modal (subject/teacher/time/date/topic, Join Zoom + Whiteboard + Recording links), class list cards (8 cards with colour bar, subject/teacher/time/topic chips + Join Zoom button), missed class tracker (2 missed entries with Reschedule button each), reschedule modal (reason select + preferred window + notes + submit → success message + auto-close 2.8s), attendance table (10 rows: Date/Subject/Teacher/Status with present/absent/excused badges). Light/dark full support.
**Watch out for:** E3 assignments.html — active assignments: show card list with subject, description, due date badge, Submit CTA (opens modal or links to GCR). Submission history: table (Date Submitted, Subject, Assignment, Status: Submitted/Graded/Late). Past paper checklist: grouped by subject, each past paper year is a checkbox row student can tick off — store tick state in localStorage key `dc-pp-{subject}-{year}`. Use portal.css tabs to switch between Active / History / Past Papers views.
**Files changed this session:** portal/student/classes.html (new), PLAN.md

---

## 🔖 Handoff Notes — v43

**Last section built:** E3 — portal/student/assignments.html
**Next section:** E4 — portal/student/recordings.html (Subject filter tabs · Recording cards date/topic/teacher · Embedded YouTube/Zoom player · Download notes button)
**State of build:** assignments.html complete. 3 portal tabs: (1) Active — 4 assignment cards (IGCSE Maths/A Level Chem/IGCSE Physics/A Level Bio) with coloured dot, title, description, due-date chip, time-estimate chip, due badge (today/soon/ok), Submit button; 1 recently-submitted card (greyed, ✓ Submitted tag). Submit opens modal: submission method select (GCR/upload/Google Doc link), file upload zone (click to select PDF/image, filename previews), score field, teacher notes, confirm → success message + auto-close. (2) Submission History — table: Date/Subject/Assignment/Score/Status with Submitted/Graded/Late badges (8 rows of stub data). (3) Past Paper Checklist — 4 subjects (IGCSE Maths 8 papers, A Level Chem 8, IGCSE Physics 6, A Level Bio 7), each paper is a clickable tick row with inline score input; tick state + scores persisted in localStorage (keys: dc-pp-{id}, dc-pp-score-{id}); overall progress bar at bottom showing done/total count. Light/dark full support.
**Watch out for:** E4 recordings.html — filter tabs by subject (All / IGCSE Maths / A Level Chem / IGCSE Physics / A Level Biology). Recording cards: date, topic, teacher, duration, thumbnail placeholder (grey box with play icon), "Watch" button (opens inline player modal or links to YouTube/Zoom recording URL stub), "Download Notes" button (links to GCR or shows alert stub). UJM note: "Recording not uploaded promptly" pain point — show a "Coming Soon" badge on the most recent class (today/yesterday) to set expectations. Use inner.css/shared.css — same portal shell as other pages.
**Files changed this session:** portal/student/assignments.html (new), PLAN.md

---

## 🔖 Handoff Notes — v44

**Last section built:** E4 — portal/student/recordings.html
**Next section:** E5 — portal/student/progress.html (Monthly score line chart · Subject performance bars · A* gap analysis · Chapter checklist completion % · Doubt tracker log)
**State of build:** recordings.html complete. Filter pills (All/IGCSE Maths/A Level Chemistry/IGCSE Physics/A Level Biology) + live search input (filters by topic or teacher name). 12-card responsive grid (auto-fill minmax 280px): each card has coloured subject bar, thumbnail area with gold play circle ("Click to watch"), topic, teacher/date/duration chips, subject label, Watch button + Download Notes button. Most recent card (6 May, Quadratics Problem Set) has "Processing" coming-soon overlay per UJM pain point. Watch opens player modal (stub — dark player box with placeholder message + title/meta strip + Download Notes link). Notes btn shows alert stub. Filter + search both re-render grid live. UJM notice bar at top ("recordings uploaded within 24 hours"). Light/dark full support. Recording data in JS array — owner replaces url:'#' with real Zoom/YouTube URLs.
**Watch out for:** E5 progress.html — use inline SVG for the monthly score line chart (no external chart lib needed — draw polyline/circles on a fixed viewBox). Subject performance bars reuse same pattern as dashboard snapshot but with more detail (show chapter breakdown expandable). A* gap section: show target score (80% for A*, 90%+ for World Topper) vs current avg per subject with delta. Doubt tracker: simple log table — columns: Date, Subject, Chapter, Doubt description, Status (Open/Resolved). Add "Log a Doubt" button that opens a modal. Store doubt log in localStorage key dc-doubts as JSON array.
**Files changed this session:** portal/student/recordings.html (new), PLAN.md

---

## 🔖 Handoff Notes — v45

**Last section built:** E5 — portal/student/progress.html
**Next section:** E6 — portal/student/curriculum.html (Subject tabs · Chapter-by-chapter syllabus · Mark chapter complete toggle · A* checklist milestones · Doubt logger per chapter)
**State of build:** progress.html complete. Sections: 4 summary stat cards (Overall Avg 74% / Attendance 91% / Chapters 18/24 / Open Doubts 4 — live from localStorage), A* gap callout (gold banner, computed delta vs 80% A* threshold and 90% World Topper), Monthly Score Trend chart (inline SVG polyline — my scores vs DC average vs A* dashed line, 8 months Oct–May, interactive dot tooltips), Subject Performance 2×2 grid (IGCSE Maths 71% gap / A Level Chem 83% A* ✓ / IGCSE Physics 78% close / A Level Bio 63% priority — each card expandable to per-chapter breakdown with score colour coding: green ≥80%, amber 60–79%, red <60%), Doubt Tracker table (seeded with 6 real-style doubts, Open/Resolved badges, Log a Doubt modal → form → success toast → auto-close 2.2s, all state persisted in localStorage key dc-doubts). Light/dark full support.
**Watch out for:** E6 curriculum.html — tabs per subject, each tab shows chapter list as rows with: chapter name, A* checklist milestone marker, and a "Mark Complete" toggle (store state in localStorage key dc-curriculum-{subject}-{chapter}). Chapter complete % feeds a progress bar at the top of each tab. Doubt logger per chapter is a small inline "Log Doubt" icon button on each chapter row — opens the same doubt modal pre-filled with subject+chapter. Reuse the dc-doubts localStorage array from progress.html so doubt counts stay in sync across pages.
**Files changed this session:** portal/student/progress.html (new), PLAN.md

---

## 🔖 Handoff Notes — v46

**Last section built:** E6 — portal/student/curriculum.html
**Next section:** E7 — portal/student/support.html (Open/closed tickets list · New ticket form: category reschedule/tech/add-drop/other · Status badges · WhatsApp fallback link)
**State of build:** curriculum.html complete. Subject tabs (4 subjects, each shows completion % in tab label, active tab gold). Progress bar updates live as chapters are ticked. Chapter list grouped into named sections per subject; each row has: checkbox (mark complete, localStorage key dc-curriculum-{id}), chapter number circle, title (click to expand topic list), milestone badge (Core/A* Milestone/World Topper), ? doubt button (opens modal pre-filled with subject+chapter, appends to dc-doubts localStorage array shared with progress.html). Topics expand inline below each row. Demo completions seeded on first load (17 chapters across 4 subjects). Full IGCSE Maths/Chem/Physics/Biology syllabi (6–7 chapters each, grouped into 2–3 sections). Light/dark full support.
**Watch out for:** E7 support.html — use portal tabs: "My Tickets" (list) and "New Ticket" (form). Ticket list: show stub tickets with category badges and Open/In Progress/Resolved status. New ticket form: fields = Category (select: Reschedule / Technical Issue / Add or Drop Subject / Payment Query / Other), Subject (text), Description (textarea), Preferred Contact (WhatsApp/Email). On submit: show success → add ticket to list (localStorage dc-tickets). WhatsApp fallback strip at bottom: "Need urgent help? WhatsApp us directly" with wa.me/919650675507 link. This is the last student portal page (E7 of E1–E7); after this, next phase is F1 — parent portal.
**Files changed this session:** portal/student/curriculum.html (new), PLAN.md

---

## 🔖 Handoff Notes — v47

**Last section built:** E7 — portal/student/support.html
**Next section:** F1 — portal/parent/dashboard.html (Sidebar · Child selector if multiple · Attendance summary widget · Progress snapshot · Fee status · Upcoming classes read-only)
**State of build:** support.html complete. Student portal E1–E7 now fully done. Two tabs: "My Tickets" (open count badge) + "+ New Ticket". Ticket list: 4 seeded tickets (TK-001 Resolved/TK-002 In Progress/TK-003 Open/TK-004 Open) — each card shows ID, category chip, urgency badge, subject, date, contact preference, description, staff reply block if resolved. New Ticket form: Category select (Reschedule/Technical/Add-Drop/Payment/Recording Missing/Other), Subject, Description, Preferred Contact, Priority — on submit adds to dc-tickets localStorage, shows success state, redirects to My Tickets. WhatsApp fallback strip on both tabs (wa.me/919650675507). Light/dark full support.
**Watch out for:** F1 parent/dashboard.html — create portal/parent/ subdirectory. Parent portal sidebar must show role-badge role-parent (not student). Nav links differ from student: Dashboard / Child Progress / Fees (no Curriculum, no Recordings, no Assignments). Child selector: show a dropdown at top of dashboard if multiple children (stub with 2 child names). Stat cards: Attendance Rate, Avg Score, Fee Status (Paid/Due), Next Class. Progress snapshot: read-only subject bars (same data as student progress). Upcoming classes: read-only list (no Join Zoom button — parent view only). Load order: shared.css → portal.css → theme.js → portal.js. Paths from portal/parent/ to root = ../../.
**Files changed this session:** portal/student/support.html (new), PLAN.md
---

## 🔖 Handoff Notes — v48

**Last section built:** F1 — portal/parent/dashboard.html
**Next section:** F2 — portal/parent/progress.html (Monthly report · Scores by subject · Attendance % · Teacher comments placeholder · Download report button)
**State of build:** dashboard.html complete. Parent portal directory created. Sidebar: role-badge role-parent (sky-blue avatar), nav = Dashboard / Child Progress / Fees / Raise a Ticket / WhatsApp DC (no student-only links). Child selector dropdown (2 stub children: Aanya Sharma — IGCSE Maths/A Level Chem; Rohan Sharma — IGCSE Physics/A Level Bio) with live avatar + stat card updates on switch. Stat cards: Attendance Rate, Avg Score, Fee Status (Paid=green/Due=red), Next Class. 2-col grid: (L) progress snapshot — 4 subject bars (gold default, green ≥80%, red for priority) + last-updated note; (R) upcoming classes read-only list (5 classes, no Join Zoom — parent view only, timezone note at bottom). Quick actions: Full Report / Pay Fees / WhatsApp DC. Announcements: 2 seeded notices. Support modal: inline ticket form (category/subject/desc/contact), saves to localStorage dc-parent-tickets, 2.4s auto-close success. Alert banner: auto-shown for child with fee due (Rohan); can force via ?missed=1. portal.css patched: shorthand role aliases added (.role-student, .role-parent, .role-staff, .role-admin). Light/dark full support.
**Watch out for:** F2 progress.html — pull same subject bars but expand to per-chapter breakdown (collapsible). Add monthly score trend (reuse inline SVG polyline approach from student progress.html). Attendance % section: show monthly breakdown table (Month / Classes Attended / Total / %). Teacher comments section: stub cards per subject (placeholder text — "Teacher comment for May will appear here"). Download report button: triggers window.print() or generates a stub PDF alert. Paths from portal/parent/ to root = ../../.
**Files changed this session:** portal/parent/dashboard.html (new), css/portal.css (role alias patch), PLAN.md

---

## 🔖 Handoff Notes — v48 (F2)

**Last section built:** F2 — portal/parent/progress.html
**Next section:** F3 — portal/parent/fees.html (Invoice list · Pay Now button · Payment method selector by country · Payment guides: FPX/DuitNow, Razorpay/UPI, Stripe, EasyPaisa, Al Rajhi, Wise · Receipt download)
**State of build:** progress.html complete. Child selector (same 2-child stub as dashboard, switches all sections live). A* gap callout (gold banner, child-specific text). Monthly Score Trend: inline SVG polyline chart — child score / DC average / A* dashed line (80%), 8 months Oct–May, interactive dot tooltips. Subject Performance: 4 expandable subject cards per child (colour bar, score bar, badge: A*/On Track/Needs Attention/Priority), click-to-expand chapter breakdown (4 chapters each, colour-coded green/amber/red). Attendance: monthly table (8 months + Overall totals row), colour-coded % badges. Teacher Comments: 4 subject comment cards per child (subject, teacher, month note, stub comment text). Download Report button → window.alert stub. Light/dark full support.
**Watch out for:** F3 fees.html — two tabs: "Invoices" and "Payment Guide". Invoices tab: list of invoice cards (Invoice #, Month, Amount, Status: Paid/Due/Overdue, Due Date). Each Paid invoice has Download Receipt button (stub alert). Each Due/Overdue invoice has Pay Now button (opens payment modal). Payment modal: region dropdown (Malaysia/India/Saudi Arabia/UK/Pakistan/International) → shows relevant gateway (FPX/DuitNow, Razorpay/UPI, Stripe, Al Rajhi, EasyPaisa, Wise) with logo placeholder and payment instructions. Payment Guide tab: static guide per region — how to pay, which gateway, step-by-step. WhatsApp fallback strip for payment queries. Paths from portal/parent/ to root = ../../.
**Files changed this session:** portal/parent/progress.html (new), PLAN.md

---

## 🔖 Handoff Notes — v49

**Last section built:** F3 — portal/parent/fees.html
**Next section:** G1 — portal/staff/dashboard.html (Sidebar · Today's classes · Pending attendance submissions · Open support tickets · Payment claim status)
**State of build:** fees.html complete. Parent portal F1–F3 now fully done. Summary strip: Total Paid / Amount Due / Next Invoice. Two tabs: Invoices + Payment Guide. Invoices tab: 2 outstanding cards (INV-2025-04 Overdue/red border + INV-2025-05 Due Soon/amber) each with Pay Now button; 4 paid history cards with Download Receipt stub. Pay Now opens modal: region dropdown (MY/IN/KSA/UK/PK/INTL) → renders gateway name + step-by-step instructions (6 regions: FPX/DuitNow, Razorpay/UPI, Al Rajhi/STC, Stripe, EasyPaisa/JazzCash, Wise/PayPal) → optional ref field → Mark as Paid → success state → auto-close 2.8s. Payment Guide tab: 6 region cards (flag, currency, gateway pills, step-by-step), important notes card, WhatsApp strip on both tabs. Light/dark full support.
**Watch out for:** G1 portal/staff/dashboard.html — create portal/staff/ subdirectory. Staff sidebar: role-badge role-staff (green avatar), nav = Dashboard / Attendance / Timesheet / Payment Claims. Stat cards: Today's Classes (count), Pending Attendance (count), Open Tickets (assigned to me), Claim Status (last claim: Pending/Approved/Paid). Today's classes: list of class pills with time/subject/student name/Join Zoom + Whiteboard links. Pending attendance: list of unsubmitted sessions (date/subject/student) with Submit button linking to attendance.html. Open tickets: list of assigned student support tickets. Load order: shared.css → portal.css → theme.js → portal.js. Paths from portal/staff/ to root = ../../.
**Files changed this session:** portal/parent/fees.html (new), PLAN.md

## 🔖 Handoff Notes — v49 (G1)

**Last section built:** G1 — portal/staff/dashboard.html
**Next section:** G2 — portal/staff/attendance.html (Attendance submission form · Student list selector · Duration field · Whiteboard name + link · Attendance date · Format validation · Submission history table)
**State of build:** dashboard.html complete. portal/staff/ subdirectory created. Sidebar: role-badge role-staff (green #4caf50 avatar), nav = Dashboard / Attendance / Timesheet / Payment Claims / WhatsApp DC / Sign Out. Claim status strip at top: Last Claim (April Approved £640) / Amount / Pending Attendance count / Open Tickets count / Submit May Claim CTA. 4 stat cards: Today's Classes (3) / Pending Attendance (2) / Open Tickets (3) / Claim Status (April Approved). Quick actions 4-col: Submit Attendance / Log Session / Submit Claim / WhatsApp DC. Two-col grid: Today's Classes (3 sessions with Join Zoom + Whiteboard pill buttons) + Pending Attendance (2 unsubmitted with Submit → attendance.html). Open tickets full-width (3 tickets: TK-011 Open / TK-014 In Progress / TK-017 Open). WA fallback strip. Light/dark full support.
**Watch out for:** G2 attendance.html — two tabs: Submit Attendance (form) + History (table). Form: Student select (5 stubs), Subject select (by student), Date, Start/End Time, Duration (auto-computed), Whiteboard Name (format hint DC-[date]-[subject]), Whiteboard Link (validate https://), Recording Link (optional URL), Notes. On submit: validate → success → add to dc-staff-attendance localStorage → redirect to History tab. History tab: table (Date/Student/Subject/Duration/Whiteboard/Status: Submitted/Pending Review). Paths ../../.
**Files changed this session:** portal/staff/dashboard.html (new), PLAN.md

## 🔖 Handoff Notes — v50 (G2)

**Last section built:** G2 — portal/staff/attendance.html
**Next section:** G3 — portal/staff/timesheet.html (Log session hours form · Monthly summary table · Hours total · Link to payment claim)
**State of build:** attendance.html complete. Two tabs: Submit Attendance + History. Pending alert banner shows count of unsubmitted sessions (status: 'review'). Form: Student select (5 stubs: Priya/Rohan/Aanya/Arjun/Fatimah) → Subject select auto-populated from STUDENT_SUBJECTS map. Fields: Date, Start Time, End Time (duration auto-computed in minutes and displayed read-only), Whiteboard Name (format hint DC-[date]-[subject]), Whiteboard Link (validates https://), Recording Link (optional), Notes. On submit: full validation → success state (check icon, session detail string, Submit Another button) → record pushed to dc-staff-attendance localStorage (status: 'review'). History tab: table sorted newest-first (Date/Student/Subject/Duration/Whiteboard link/Recording link/Status badge: Submitted=green, Pending Review=amber). 5 seeded records on first visit. updatePendingAlert() recalculates banner count. Light/dark full support.
**Watch out for:** G3 timesheet.html — two tabs: "Log Session" (form) + "Monthly Summary" (table). Log Session form: Student (select), Subject (select by student, same STUDENT_SUBJECTS map), Date, Start Time, End Time (duration auto-computed), Session Type (Regular / Rescheduled / Trial), Notes. On submit: save to dc-staff-timesheet localStorage. Monthly Summary tab: group records by month (current month default, month selector dropdown). Show table (Date/Student/Subject/Duration/Type) + totals row (total hours for month). Hours total prominently displayed (e.g., "18h 30min this month"). CTA button: "Submit Payment Claim →" links to payment-claims.html. Paths ../../.
**Files changed this session:** portal/staff/attendance.html (new), PLAN.md

## 🔖 Handoff Notes — v51 (G3)

**Last section built:** G3 — portal/staff/timesheet.html
**Next section:** G4 — portal/staff/payment-claims.html (Submit claim form · Claim history · Status badges: Pending/Approved/Paid)
**State of build:** timesheet.html complete. Two tabs: Log Session + Monthly Summary. Log Session form: Student select (5 stubs) → Subject auto-populated, Date, Session Type (Regular/Rescheduled/Trial), Start/End Time (duration auto-computed), Notes. On submit: validate → success state (check icon, session detail, Log Another + View Summary buttons) → save to dc-staff-timesheet localStorage. Monthly Summary tab: month selector dropdown (built from distinct months in data + current month). Hours strip: Total Hours (h min format) / Regular / Rescheduled / Trial — all computed live. Table: Date/Student/Subject/Duration/Type badge/Notes, totals row (gold, Monthly Total + session count). 10 seeded records (May + April 2025). Empty state if no sessions for selected month. Claim CTA strip at bottom → payment-claims.html. Light/dark full support.
**Watch out for:** G4 payment-claims.html — two tabs: "Submit Claim" + "Claim History". Submit Claim: auto-populate from dc-staff-timesheet for selected month (show total hours and session count as readonly summary). Fields: Month (select), Total Hours (readonly, computed from timesheet), Bank/Payment Details (text — stub: "Barclays ****1234"), Notes/invoice ref (textarea). On submit: save to dc-staff-claims localStorage, show success. Claim History tab: table of past claims (Month / Hours / Amount / Status: Pending/Approved/Paid). Status badges colour-coded. 3 seeded claims (April Approved/March Paid/Feb Paid). Amount computed at £10/hr stub rate. Paths ../../.
**Files changed this session:** portal/staff/timesheet.html (new), PLAN.md

## 🔖 Handoff Notes — v52 (G4)

**Last section built:** G4 — portal/staff/payment-claims.html
**Next section:** H1 — portal/admin/dashboard.html (Phase H — Admin Portal begins)
**State of build:** payment-claims.html complete. Staff portal G1–G4 now fully done. Two tabs: Submit Claim + Claim History. Submit tab: timesheet pull strip (auto-reads dc-staff-timesheet localStorage → shows month/sessions/total hours for selected month). Month selector built from distinct timesheet months. Readonly fields: Total Hours (from timesheet), Claim Amount (computed at £10/hr stub). Editable: Bank Details (pre-filled Barclays ****1234), Notes/Invoice ref. Guard banners: already-claimed warning (disables submit if month already submitted), no-timesheet warning (disables submit if no sessions). On submit: save to dc-staff-claims localStorage (status: pending) → success state with detail string → View Claim History button. Claim History tab: claim cards (ID/month/sessions/hours/notes/amount/status badge: Pending=amber/Approved=green/Paid=blue). 3 seeded claims (April Approved £180/March Paid £160/Feb Paid £140). Totals strip: Total Earned YTD / Total Paid / Pending & Awaiting. WA fallback on both tabs. Light/dark full support.
**Watch out for:** H1 portal/admin/dashboard.html — create portal/admin/ subdirectory. Admin sidebar: role-badge role-admin (purple avatar), nav = Dashboard / Users / Claims / Tickets / Reports. Stat cards: Total Students (count), Active Staff (count), Open Tickets (count), Pending Claims (count). Sections: Recent enrolments list (5 stub students with subject + date), Pending payment claims (pull from dc-staff-claims or seed — with Approve/Reject actions), Open support tickets (unresolved — with Assign + Resolve actions). Load order: shared.css → portal.css → theme.js → portal.js. Paths from portal/admin/ to root = ../../.
**Files changed this session:** portal/staff/payment-claims.html (new), PLAN.md

## 🔖 Handoff Notes — v54

**Last section built:** H1 — portal/admin/dashboard.html
**Next section:** H2 — portal/admin/users.html (User table · Role filter · Add user form · Invite link generator · Deactivate toggle · Search)
**State of build:** Admin dashboard complete. Sidebar: purple avatar, role-admin badge, nav = Dashboard/Users/Claims/Tickets/Reports/WhatsApp/Sign Out. Stat cards pull from localStorage (dc-staff-claims, dc-tickets) with fallbacks. Enrolment trend inline SVG polyline chart (Jan–May, 5 data points). Recent activity feed. Recent enrolments table (5 stub students). Pending claims (2, with Approve/Reject actions + prompt for reason). Open tickets (3, with Resolve + Assign stubs). Actions update UI + append to activity feed live. Light/dark full support.
**Watch out for:** H2 users.html — build user table with all roles (student/parent/staff/admin). Role filter tabs. Add user form (name/email/role/subject) with invite link generation. Deactivate toggle (localStorage flag). Search filters table live. Paths from portal/admin/ = ../../.
**Files changed:** portal/admin/dashboard.html (new), PLAN.md

## 🔖 Handoff Notes — v55

**Last section built:** K1–K5 — Rename & Amendment Pass (all tasks)
**Next section:** H2 — portal/management/users.html (User table · Role filter · Add user · Supervisor assignment · Invite link · Deactivate toggle · Search)
**State of build:** K1: portal/staff/ copied to portal/teacher/ — all 4 pages patched (title, sidebar label "Teacher Portal", role badge "Teacher", role-teacher class). K2: portal/admin/dashboard.html moved to portal/management/ — "Management Portal" label, role-management badge, nav links updated (metrics/tickets/claims now real hrefs). K3: student/support.html — dept routing select added (PR/Finance/IT/HR/Marketing), ticket system made primary over WhatsApp. K4: parent/dashboard.html support modal — Finance/PR/HR/IT dept routing added; fees.html — Raise a Ticket sidebar link added. K5: auth/login.html — teacher/management/ambassador portals routed correctly.
**Watch out for:** Old portal/staff/ and portal/admin/ dirs still exist in ZIP — they are the legacy teacher/admin pages and should remain as-is until user confirms removal (to avoid broken links during transition). portal/staff/ will be repurposed for NEW Staff portal (Phase I) — do NOT delete it. portal/ambassador/ dir does not yet exist — J1–J2 will create it.
**Files changed this session:** portal/teacher/[all 4].html, portal/management/dashboard.html, portal/student/support.html, portal/parent/dashboard.html, portal/parent/fees.html, auth/login.html, PLAN.md

## 🔖 Handoff Notes — v56

**Last section built:** H2 — portal/management/users.html
**Next section:** H3 — portal/management/metrics.html (per-dept + per-staff performance · all metric categories · weekly trend line graphs · dept filter · staff drill-down · date range selector)
**State of build:** users.html complete. Stat strip (total/students/parents/staff+teachers). Add User panel (toggle show/hide): name/email/role/dept/supervisor tag/subject fields; invite link generator (base64 token stub, copy button); saves to dc-users localStorage. Role filter tabs (All/Students/Parents/Teachers/Staff/Ambassadors/Management). Live search (name+email). User table: avatar initials, role badge coloured, dept+subject, supervisor badge, active toggle (enable/disable), Make Supervisor / Deactivate actions. Deactivate confirm modal. 16 seeded users across all roles. Also fixed management/dashboard.html nav duplication (Users/Metrics icons swapped).
**Watch out for:** Invite link is a stub URL — no real backend. In production replace generateInvite() with a server-side token endpoint. dc-users localStorage is shared across portal pages — if metrics.html or tickets.html need user data, read from same key. Supervisor tag controls dept-level access in the role architecture — management must assign this correctly per dept.
**Files changed this session:** portal/management/users.html (new), portal/management/dashboard.html (nav fix), PLAN.md

## 🔖 Handoff Notes — v57

**Last section built:** H3 — portal/management/metrics.html
**Next section:** H4 — portal/management/tickets.html (all tickets across all roles · filter by role/dept/status/priority · assign · close · escalation queue · interdept view)
**State of build:** metrics.html complete. 6 category tabs: Productivity / Attendance / Financial / Activity / Workload / Quality. Filter bar: dept dropdown (PR/HR/Finance/Marketing/IT), staff member dropdown, date range (4w/8w/3m/6m). Metric cards: per-category KPIs with avg value, delta chip (up/down/flat vs prior half-period), inline sparkline. Weekly trend chart: per-staff sparkline for primary metric, all filtered staff overlaid. Staff breakdown table: per-staff row with mini progress bars, colour-coded (green ≥80%, red <60% or inverted for lower-better metrics), Drill Down button. Drill-down panel: expands below table with detailed sparklines per selected staff member. All data is seeded/deterministic — no real backend needed for prototype.
**Watch out for:** Metric data is stub (seeded with Math.sin for realistic waves). In production replace DATA object with API calls per category+filter. The `dc-users` localStorage from users.html (H2) is not yet read by metrics — future enhancement: pull staff list from dc-users dynamically. H4 tickets.html should read from `dc-tickets` localStorage (seeded in student/support.html and parent/dashboard.html) plus management-created tickets.
**Files changed this session:** portal/management/metrics.html (new), PLAN.md

## 🔖 Handoff Notes — v60

**Last section built:** PLAN.md update only — no code changes this session
**Next section:** H4 — portal/management/tickets.html (all tickets across all roles · filter by role/dept/status/priority · assign · close · escalation queue · interdept view)
**State of build:** PLAN.md updated: (1) Fixed stale ⬜→✅ for B5–B12, C1–C3, D1–D2, H2–H3, K1–K5. (2) ZIP integrity rule added to Agent Instructions (step 7). (3) Phase I expanded: I6 PR/schedule, I7 HR/candidates, I8 Finance/rates, I9 Marketing/calendar, I10 All-staff/meetings — each dept-specific page mapped to UJM + CSV workflows. (4) G5 now includes pre-class checklist widget on teacher dashboard. (5) File structure updated with I6–I10 paths. (6) Build order corrected: H4 → G5 → I1–I10 → J1–J2.
**Watch out for:** I6–I10 are dept-specific pages — they are accessed from the staff sidebar only when the logged-in user's dept tag matches (use JS show/hide or separate nav items per dept). I1 dashboard must read dept tag from localStorage dc-role or dc-dept and show relevant quick-action buttons accordingly. H4 must read dc-tickets from student/support.html + parent/dashboard.html localStorage seeds.
**Files changed this session:** PLAN.md only

## 🔖 Handoff Notes — v61

**Last section built:** G5 — portal/teacher/tickets.html + pre-class checklist widget on teacher/dashboard.html. H4 confirmed done (file existed, PLAN.md updated).
**Next section:** I1 — portal/staff/dashboard.html (dept-aware quick actions, stat cards, my tasks today, dept announcements)
**State of build:** teacher/tickets.html: 5 seeded tickets, reply-only interface, status auto-updates to "Awaiting Staff Review" on reply, comments thread, filter bar, stat strip, detail panel — cannot close/reassign. teacher/dashboard.html: pre-class 5-point checklist widget added (Recording ON / Breakout room / Camera on / Whiteboard titled / Students reminded), dismissible per day (localStorage dc-checklist-dismissed), check state persisted (dc-checklist), resets daily, gold progress bar. Tickets nav link added to teacher sidebar.
**Watch out for:** I1 staff/dashboard.html — portal/staff/ dir already exists (legacy teacher pages from before rename). Overwrite only dashboard.html — do NOT touch the teacher/ copies there. Staff dept tag drives which quick actions show (PR sees Schedule+Tickets+Content Bank; HR sees Candidates+Tickets; Finance sees Rates+Invoices+Claims; Marketing sees Calendar+Leads+Ambassador; IT sees Ticket Queue+Tool Access). Read dept from localStorage dc-dept or URL param ?dept=. Stat cards: open tasks, overdue, tickets this week, attendance streak.
**Files changed this session:** portal/teacher/tickets.html (new), portal/teacher/dashboard.html (checklist widget + tickets nav link), PLAN.md
