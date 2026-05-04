# DivergenCIE Coaching — Build Plan & Session Tracker

**Domain:** divergencie.co.uk  
**Stack:** HTML5 · Tailwind CDN · Lucide Icons · Satoshi Font · Lottie  

**Reference:** Athena Education homepage (https://athenaeducation.co.in/) — clone layout, rebrand for DivergenCIE ·  Altacademy (https://altacademy.org/) for relevant inspiration 
**Real social links:** Instagram: https://www.instagram.com/divergencie_coaching/ · LinkedIn: https://www.linkedin.com/company/divergencie-coaching/ · WhatsApp: +919650675507

**Pathing Rule:** Use root-relative paths (e.g., `/assets/...` instead of `assets/...`) for all images and CSS/JS links. This ensures links work across subfolders like `/services/` and `/portal/`.
**Theme Strategy:** Every page must support Light/Dark toggling. Use Tailwind's `dark:` variant. Theme state must be persisted in `localStorage`. Default to 'dark' for the homepage and 'light' for portals, but allow user override on all.`
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

## ⚠️ AGENT INSTRUCTIONS (READ FIRST EVERY SESSION)

1. Read this `PLAN.md` — find the next `⬜ TODO` section
2. Read `divergencie-v[N].zip` files to understand current state
3. Build **only one page or module per session.** Respect file separation: use `css/styles.css`/`js/main.js` for the Homepage, `css/inner.css`/`js/inner.js` for public inner pages, and `css/portal.css`/`js/portal.js` for the dashboard system to prevent code bloat.
4. **Global Components:** When building inner pages or portals, use a "Source of Truth" for Nav and Footers. If you update the Navigation in `about.html`, ensure the same change is applied to all existing `PHASE B` pages to maintain consistency.`
5. **Universal Theme Support:** When building any section, you MUST apply both light and dark styles. (e.g., `class="bg-white dark:bg-black text-charcoal dark:text-white"`). Use the theme toggle logic in `js/theme.js` to ensure clicking the toggle on the homepage carries the preference over to the Portal.
6. Before ZIPping, update `PLAN.md` with a `## 🔖 Handoff Notes` block (see format below)
7. **ZIP immediately:** `cd /home/claude && zip -r divergencie-v[N].zip divergencie/`
8. Present ZIP to user - ensure this
9. Verify the build (check mobile responsiveness, 404 links, and JS console errors). Once confirmed working, mark section ✅ Done.
10. **STOP** — wait for user to say "continue"


### Handoff Notes Format
Add/replace this block at the bottom of `PLAN.md` before every ZIP:

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

- **No preamble.** Don't explain what you're about to do — just do it.
- **No summaries.** Don't recap what you just built — the ZIP speaks for itself.
- **No filler.** Cut phrases like "Great!", "Certainly!", "As you can see…"
- **Code only when asked.** Never paste code into chat — it lives in files.
- **Confirmations = 1 line.** e.g. `✅ Section 4 done — ZIP ready.` Nothing more.
- **Questions = 1 line max.** If blocked, ask the single most important question only.
- **High quality is non-negotiable.** Brevity never means cutting corners on the build.

---

## 🎨 BRAND TOKENS

### Dark Mode (homepage default — current build)
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

### Light Mode (all pages have both options)
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
├── about.html                  ⬜
├── services.html               ⬜ (hub page — links to per-subject pages)
├── services/
│   ├── igcse.html              ⬜
│   ├── a-level.html            ⬜
│   ├── ap.html                 ⬜
│   ├── ib.html                 ⬜
│   ├── sat-act.html            ⬜
│   └── ielts-toefl.html        ⬜
├── pricing.html                ⬜
├── mock.html                   ⬜ (Free Mock Simulator — timed past paper UI)
├── resources.html              ⬜
├── careers.html                ⬜
├── contact.html                ⬜
├── auth/
│   ├── login.html              ⬜
│   └── forgot-password.html    ⬜
├── portal/
│   ├── student/
│   │   ├── dashboard.html      ⬜
│   │   ├── classes.html        ⬜
│   │   ├── assignments.html    ⬜
│   │   ├── recordings.html     ⬜
│   │   ├── progress.html       ⬜
│   │   ├── curriculum.html     ⬜
│   │   └── support.html        ⬜
│   ├── parent/
│   │   ├── dashboard.html      ⬜
│   │   ├── progress.html       ⬜
│   │   └── fees.html           ⬜
│   ├── staff/
│   │   ├── dashboard.html      ⬜
│   │   ├── attendance.html     ⬜
│   │   ├── timesheet.html      ⬜
│   │   └── payment-claims.html ⬜
│   └── admin/
│       ├── dashboard.html      ⬜
│       └── users.html          ⬜
├── PLAN.md
├── README.md
├── assets/
│   ├── images/logo.jpg
│   └── fonts/
├── css/
│   ├── styles.css              ✅ homepage styles
│   ├── shared.css               ⬜ shared dark/light-mode page styles
└── js/
    ├── main.js                 ✅ homepage JS
    ├── theme.js                ⬜ shared page JS (nav, mobile, theme toggle)
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
| A1 | **Theme Engine & Global Nav** Create `js/theme.js` (logic to sync theme across all pages) + `css/shared.css` (variables for light/dark). Implement the Theme Toggle component (Sun/Moon icon) in the global Nav.` | css/shared.css, js/theme.js | ⬜ TODO |
| A2 | `css/shared.css` + `js/theme.js` — sidebar layout, tabs, role badge, portal nav shell | css/portal.css, js/portal.js | ⬜ TODO |

---

### PHASE B — Public Inner Pages

| # | Page | Key Sections (per UJM + IA + PRD) | Files | Status |
|---|------|-----------------------------------|-------|--------|
| B1 | **about.html** | Hero banner · Our Story · Mission & Vision · Meet the Teachers (cards) · World & Country Toppers · Cambridge + CollegeBoard affiliations | about.html | ⬜ TODO |
| B2 | **services.html** | Hub page · Subject grid cards (IGCSE, A Level, AP, IB, SAT, IELTS, Career Counselling, Uni Applications) · Each card links to sub-page · Sticky filter tabs | services.html | ⬜ TODO |
| B3 | **services/igcse.html** | Hero · Subjects list · What's included · Pricing CTA · Teacher bio · FAQ accordion · Enrol CTA | services/igcse.html | ⬜ TODO |
| B4 | **services/a-level.html** | Same structure as IGCSE · A Level specific content | services/a-level.html | ⬜ TODO |
| B5 | **services/ap.html** | AP-specific content · CollegeBoard badge | services/ap.html | ⬜ TODO |
| B6 | **services/ib.html** | IB-specific content | services/ib.html | ⬜ TODO |
| B7 | **services/sat-act.html** | SAT/ACT prep content | services/sat-act.html | ⬜ TODO |
| B8 | **services/ielts-toefl.html** | IELTS/TOEFL content | services/ielts-toefl.html | ⬜ TODO |
| B9 | **pricing.html** | 3 package tiers (World Topper / A* / Foundations) · Pricing table · Payment methods by country (MY FPX, IN Razorpay, KSA, UK Stripe, PK EasyPaisa, Intl Wise) · FAQ | pricing.html | ⬜ TODO |
| B10 | **resources.html** | Free Notes · Past Paper Books (Topical + Yearly) · Predicted Papers · AP Practice · IELTS/SAT Prep · Blog teaser | resources.html | ⬜ TODO |
| B11 | **careers.html** | Open roles (TA, SM, HR, IT, Accounts) · Role cards with JD summary · Application form · Ambassador/Intern programme | careers.html | ⬜ TODO |
| B12 | **contact.html** | WhatsApp QR + link · General enquiry form · Social links · Regional contact info · Map embed placeholder | contact.html | ⬜ TODO |

---

### PHASE C — Free Mock Simulator (timed past paper solver)

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| C1 | **mock.html — Landing & Subject Selector** | Hero · Subject selector grid (IGCSE/A Level/AP/IB/SAT/IELTS) · Exam level/paper selector · Difficulty options · "Start Timed Mock" CTA · How it works steps · Past stats ticker | mock.html | ⬜ TODO |
| C2 | **mock.html — Timed Exam Interface** | Full-screen exam UI · Live countdown timer (top bar) · Question number nav sidebar · MCQ + short answer question types · Flag for review button · Progress bar · Pause/Resume · Dark mode only for focus · Submit confirmation modal | mock.html (exam view) | ⬜ TODO |
| C3 | **mock.html — Results & Profile Stats** | Score breakdown by topic · Accuracy % · Time-per-question analytics · Weak area highlights · Comparison vs DivergenCIE average · Enrol Now upsell CTA · Share result button · Retake button | mock.html (results view) | ⬜ TODO |

---

### PHASE D — Auth Pages

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| D1 | **auth/login.html** | Logo · Email + password form · Google OAuth button · Forgot password link · Role auto-detection on login · Dark/light split layout | auth/login.html | ⬜ TODO |
| D2 | **auth/forgot-password.html** | Email entry · Confirmation state · Back to login | auth/forgot-password.html | ⬜ TODO |

---

### PHASE E — Student Portal

| # | Page | Sections (per UJM Student Journey) | Files | Status |
|---|------|-------------------------------------|-------|--------|
| E1 | **portal/student/dashboard.html** | Sidebar nav · Welcome banner · Upcoming classes widget · Assignment due dates · Progress snapshot (mini chart) · Announcements feed · Quick links (Zoom, GCR, WhatsApp) | portal/student/dashboard.html **Role Simulation:** Assume a "Student" role is active. Use `localStorage` or a URL parameter (`?role=student`) to simulate different portal views during this phase so logic in `portal.js` can be tested. | ⬜ TODO |
| E2 | **portal/student/classes.html** | Weekly calendar view · Class cards (subject, teacher, Zoom link) · Attendance record table · Missed class tracker · Reschedule request button · Timezone display toggle | portal/student/classes.html | ⬜ TODO |
| E3 | **portal/student/assignments.html** | Active assignments list · Submit button · Submission history · Past paper checklist (tick off by subject/year) | portal/student/assignments.html | ⬜ TODO |
| E4 | **portal/student/recordings.html** | Subject filter tabs · Recording cards (date, topic, teacher) · Embedded YouTube/Zoom player · Download notes button | portal/student/recordings.html | ⬜ TODO |
| E5 | **portal/student/progress.html** | Monthly score line chart (Chart.js or inline SVG) · Subject performance bars · A* gap analysis · Chapter checklist completion % · Doubt tracker log | portal/student/progress.html | ⬜ TODO |
| E6 | **portal/student/curriculum.html** | Subject tabs · Chapter-by-chapter syllabus · Mark chapter complete toggle · A* checklist milestones · Doubt logger per chapter | portal/student/curriculum.html | ⬜ TODO |
| E7 | **portal/student/support.html** | Open/closed tickets list · New ticket form (category: reschedule / tech / add-drop / other) · Status badges · WhatsApp fallback link | portal/student/support.html | ⬜ TODO |

---

### PHASE F — Parent Portal

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| F1 | **portal/parent/dashboard.html** | Sidebar · Child selector (if multiple) · Attendance summary widget · Progress snapshot · Fee status · Upcoming classes read-only | portal/parent/dashboard.html | ⬜ TODO |
| F2 | **portal/parent/progress.html** | Monthly report · Scores by subject · Attendance % · Teacher comments placeholder · Download report button | portal/parent/progress.html | ⬜ TODO |
| F3 | **portal/parent/fees.html** | Invoice list · Pay Now button · Payment method selector by country · Payment guides (FPX/DuitNow, Razorpay/UPI, Stripe, EasyPaisa, Al Rajhi, Wise) · Receipt download | portal/parent/fees.html | ⬜ TODO |

---

### PHASE G — Staff Portal

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| G1 | **portal/staff/dashboard.html** | Sidebar · Today's classes · Pending attendance submissions · Open support tickets · Payment claim status | portal/staff/dashboard.html | ⬜ TODO |
| G2 | **portal/staff/attendance.html** | Attendance submission form · Student list selector · Duration field · Whiteboard name + link · Attendance date · Format validation · Submission history table | portal/staff/attendance.html | ⬜ TODO |
| G3 | **portal/staff/timesheet.html** | Log session hours form · Monthly summary table · Hours total · Link to payment claim | portal/staff/timesheet.html | ⬜ TODO |
| G4 | **portal/staff/payment-claims.html** | Submit claim form · Claim history · Status badges (Pending/Approved/Paid) | portal/staff/payment-claims.html | ⬜ TODO |

---

### PHASE H — Admin Portal

| # | Page | Sections | Files | Status |
|---|------|----------|-------|--------|
| H1 | **portal/admin/dashboard.html** | Live stat cards (enrolments, revenue, active classes, open tickets) · Enrolment trend mini chart · Recent activity feed · Quick actions | portal/admin/dashboard.html | ⬜ TODO |
| H2 | **portal/admin/users.html** | User table (all roles) · Role filter · Add user form · Invite link generator · Deactivate toggle · Search | portal/admin/users.html | ⬜ TODO |

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
**Next section:** Phase A1 — css/shared.css + js/thene.js shared infrastructure
**State of build:** Homepage (index.html) 100% complete. Sections 0–14 all ✅ Done. Footer CTA: gold/dark gradient, "Think You Can Get A*? We Know You Can." + Enrol Now + Try Free Mock. Footer: 4-col (logo/tagline/social | Quick Links | Services | Contact & Social), Cambridge + CollegeBoard badges, bottom bar with copyright + Privacy Policy + T&C. Fully responsive.
**Watch out for:** Social URLs updated to real handles from BDG doc (instagram.com/divergencie_coaching, linkedin.com/company/divergencie-coaching). WhatsApp number still placeholder — admin must supply. Privacy Policy + T&C pages still needed (GDPR). Next session: build the shared inner.css + inner.js infrastructure that ALL inner pages will rely on — do this before building any inner page.
**Files changed this session:** index.html, css/styles.css, PLAN.md
