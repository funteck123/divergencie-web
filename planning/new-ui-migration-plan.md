# Plan: the new UI (admin, Question Solver, Syllabus) with a toggle, classic UI untouched

Status: PLAN ONLY. Nothing is built. Written 2026-10-02, updated the same day with the user's answers and the design documents found in the parent folder.
Sources: the two hand-marked PDFs (`divergencie-web_admin-sketches-v1.0.4`, `divergencie-web_student-tools-sketches-v1.0.2`, read from the Downloads folder, 678 and 288 ink strokes decoded), the live code (8,464-line `app/dashboard/management/page.js`, 8 other dashboards, `public/mcq-digitizer/index.html`), `planning/same-domain-solver-and-syllabus-plan.md`, and the bundled Next.js 16.2 docs (`node_modules/next/dist/docs`).

## 0. Framing decided by the user (2026-10-02)

- **The classic UI is the main UI and stays the main UI.** It is what people use every day. The new UI is an **experimental redesign migration**: opt-in, labelled Beta, never forced, never the default unless the user decides that later. Nothing in this project may slow down, destabilise or delay work on the classic UI.
- **One switch for the whole portal, not per page.** A single "New UI (Beta)" / "Classic UI" switch flips the entire system for that account: every dashboard, the Question Solver and the Syllabus. Individual pages never have their own toggle.
- **Consequences:** classic gets new features and fixes first, the new UI follows (see the drift report in section 4.1); business rules live in shared `lib/` code so a fix lands in both; the parity target is "everything the classic UI does today", not the unbuilt features of the PRD (section 3.0).

## 0.1 What "done" means (the user's words, made testable)

| Requirement | How it is proven |
|---|---|
| Old UI untouched | `git diff` against the classic files is empty at every phase (CI check: no edits under the classic file list in section 6). |
| Toggle between old and new | A visible switch on both sides, remembered per account. Classic stays the default until the user says otherwise. |
| Full, correct replacement, no functionality lost | **Parity manifest** (section 4.1): every button, input, form, menu and API call of the classic UI is listed by a script, mapped to a new component, and a test drives both UIs and compares the API requests they send. Coverage must reach 100%, with an explicit written reason for anything merged or moved. |
| Migrate each UI one by one | Phases in section 7, one screen family at a time, each shippable behind the toggle. |
| Do not miss anything | The manifest is generated from the code, not from memory. The sketchbooks covered the Management dashboard and the two student tools only: the other role dashboards are listed in section 7 phase 6 and need their own design step. |
| Very high quality code | TypeScript strict in the new code, five-lens review per phase (swe), unit tests for pure logic, no duplicated business rules (reuse `lib/billing.js` etc.). |
| Fast, snappy | Performance budgets in section 4.4, measured per phase, a phase does not close if a budget is missed. |

## 1. Decision register: what the PDF marks say

Legend: ✓ picked, ✗ rejected. Items marked **CONFIRM** have a mark I could not read with certainty, or a note that changes the design. All 28 parts (13 admin, 15 student tools) are listed so nothing is lost.

### Admin (13 parts)

| Part | Marks | Decision for the build |
|---|---|---|
| 1 Shell | 1A ✓, 1B ✗, 1C ✓ | **DECIDED 2026-10-02: 1A only** (two-tier sticky bar: top bar plus section tabs). The icon rail (1C) is not built. |
| 2 Toolbar | 2A ✗, **2B ✓**, 2C ✗ | Two rows: actions above, filters below. Edits on 2B: remove the count badge next to the title, and remove the "Columns" and "Export" buttons (struck out, arrow to "Create account"): only buttons that exist today stay. |
| 3 Record rows | 3A ✗, 3B ✗, 3C ✗ | Nothing picked. Notes: "**all columns should be visible without horizontal scroll**" and "3C grouped by batch is an option to choose" (a view mode). **DECIDED 2026-10-02: one line per row, no two-line rows.** Three one-line options are sketched at the real 1280 width in `prototypes/accounts-one-line-options` (A fit all, trimmed; B column sets; C priority columns). Recommended: A. Awaiting the pick. |
| 4 Row actions | **4A ✓**, 4B ✗, **4C ✓** "better" | Two visible buttons (Edit, Log in as) plus an overflow menu, and the "select rows, act in a bar" bar. Note: "how will two selected work?" **CONFIRM:** plan: Edit opens one record at a time; bulk bar offers only actions that are safe in bulk (Deactivate, Activate, Reset password, Delete with a typed confirmation); Edit and Log in as are disabled with a reason when more than one row is selected (the sketch greys "Log in as"). |
| 5 Edit record | **5A ✓**, **5B ✓✓**, 5C ✗ | Expand in place (5A) and bottom sheet with the list visible above (5B, ticked twice). Build both: sheet on desktop and phone as default, in-place expand as a setting. |
| 6 Create forms | 6A ✗, **6B ✓**, **6C ✓** | Draft row at the top of the list for Create account (6B). Full-width form page for Create service (6C, the longest form). |
| 7 Grouped lists | 7A ✗ with note, **7B ✓**, **7C ✓** | Note on 7A: "**Tree view instead, like how the current UI does it**". 7B group switcher is ticked. 7C (Enrollments: people list, enroll strip on top, rows open into the person's services) is ticked. **CONFIRM:** Services: tree view like today (default) plus the 7B switcher as an alternate mode. |
| 8 Pipeline | 8A no mark, **8B ✓**, 8C ✗ | One queue, one next action per row, stage and type in columns, the rest in a menu. |
| 9 Schedule | **9A ✓**, **9B ✓**, **9C ✓** "new feature" | Agenda by day with conflicts pinned, month grid with pills, and the day timeline per instructor. 9C is marked "new feature": it does not exist today, so it is built as an additive feature after parity, with its own ticket (see section 9). |
| 10 Billing | 10A no mark, 10B "this works", **10C ✓** "I like this, this should be a mode" | Default: **full table**. Group views as modes: by entity (person ledger, 10B), by month, by due, and more. Lifecycle lanes (10C) as a mode. Sorting on every column. Filtering by values and by range. Marked "add ticket for billing" (see section 9). |
| 11 Tickets | **11A ✓**, 11B no mark, 11C ✓ then "I prefer table tho" | Table with icon actions (11A). Note: "open in new tab for full info": a ticket opens in its own tab or page with the full thread. **CONFIRM:** 11C compact cards is ticked but the note prefers the table; plan: table, cards not built. |
| 12 Audit log | **12A ✓**, 12B no mark, 12C ✗ "this is mode view" | Table with action filter and pager (12A) plus **a selectable page size** ("choose number per view"). Grouped by entity (12C) is a view mode, not the default: **CONFIRM** whether to build it as a mode. |
| 13 Phone | 13A ✗, **13B ✓** "good too", **13C ✓** with a note | Bottom navigation (13B) and the menu sheet (13C). Notes: the bar must hide on scroll down and show on scroll up; "more PC compatible but touch centric". The floating "+" button is crossed out: Create stays in the toolbar. |

### Question Solver and Syllabus (15 parts)

| Part | Marks | Decision for the build |
|---|---|---|
| Q1 Header and stage bar | 1A ✗, **1B ✓**, **1C ✓** | Three stage tabs (Library, Upload paper, My progress) and a bar that changes with the stage (library state above, quiz state below). Both ticked: tabs for navigation, the bar for the quiz state. |
| Q2 Library picker | **2A ✓** "but one column, more like the actual UI position, I like the style here though", **2B ✓**, 2C ✗ | Keep the select style of 2A but in **one column**, in the position the current UI uses; step chips (2B) as the alternate. **CONFIRM:** which one is the default (plan: 2A style in one column; chips optional). The 2B ink also has an X near the buttons: treat the bottom buttons overlap as a bug to avoid. |
| Q3 Mode choice and upload | **3A ✓** with an X on the upload strip, 3B no mark, 3C ✓ at Start with circled tabs | Two equal buttons Practice Mode and Test Mode. The **upload strip is removed from this card**: uploading lives in the Upload paper stage tab (Q1B). Q3C's single Start button idea is noted, **CONFIRM** if wanted. |
| Q4 Quiz bar | **4A ✓**, 4B no mark, 4C ✗ | Top bar pinned with the number strip (timer, Pause, Cancel, jump numbers). |
| Q5 MCQ card | **5A ✓**, 5B ✗, 5C ✗ "works in a way but... some perspective, a mode view, I can't like it yet" | Tabs above the image (Question and Answer), letters below, check answer, flag. The collapsed card (5C) is a possible later mode, not built now. |
| Q6 Structured card | 6A no mark, **6B ✓**, 6C ✗ | Answer and result as tabs: Question, Your answer, Marks, Full-mark answer. |
| Q7 Results | **7A ✓**, 7B ✗, 7C ✗ | Banner then a compact review table, one row per question. |
| Q8 Progress and leaderboard | 8A no mark, **8B ✓**, 8C ✗ | Four tabs: Progress, History, Mistakes, Leaderboard. **Chart note:** add dates on the axis and faint lines per student for comparison. |
| Q13 Phone | **13A ✓** "I want this on PC too", **13B ✓**, 13C ✗ "make a list like the website" | Picker with stacked selects and Fetch pinned at the bottom, on phone **and on desktop**. Quiz with the bar pinned at the bottom. Results as a list like the Q7A table (not the number grid). |
| S1 Syllabus list | **S1A ✓**, S1B ✗, S1C ✗ | Full-width subject list with the filter in the bar. |
| S2 Subject header | 2A ✗, **2B ✓**, 2C ✗ | Sub-bar pinned under the top bar (subject, actions, tag filter stay in view). |
| S3 Topic rows | **3A ✓**, 3B ✗, 3C ✗ | Title left, six tag chips wrap under it, colours kept, icons added. |
| S4 Expanded topic | **4A ✓**, 4B ✗, 4C ✗ | Opens in place, image full width, sub-topics under the image. |
| S5 Progress and leaderboard | 5A no mark, **5B ✓**, 5C partly ✓ | Tabs Progress, History, Leaderboard, plus the top **summary strip of counts** from 5C (Completed, Revise, Doubt, Rank) ticked; the folded sections of 5C are crossed out. |
| S13 Phone | **13A ✓**, **13B ✓**, **13C ✓** | All three accepted: subject list with filter on top, topic cards with a tag sheet, progress with segments. |

### Rules that apply to every screen (from the sketchbook cover pages, still in force)

Top bar pinned, only the list scrolls. Full width, no sideways scroll at 1280 and 390. One record, one row, the rest opens in place. Forms collapsed until needed. Every current button kept (new place, new size, nothing invented: that is why 2B drops Columns and Export). Dropdowns A to Z and searchable. Labels only, no helper sentences in the UI. Brand palette, Inter, line icons.

## 2. Architecture

### 2.1 Where the new UI lives (classic stays byte for byte)

```
app/
  dashboard/...            CLASSIC, not edited (except 2 tiny additive hooks below)
  mcq-digitizer/ (public)  CLASSIC Question Solver, not edited
  v2/                      NEW routes
    management/...         one route per section: /v2/management/accounts, /billing, ...
    student/, teacher/ ... later phases
    question-solver/       NEW Question Solver
    syllabus/              NEW Syllabus
ui2/                       NEW shared code (not under app/, so nothing is routed by accident)
  components/              design-system components (section 3)
  features/<section>/      one folder per screen family: view, hooks, tests, manifest mapping
  queries/                 data layer (section 2.3)
  styles/                  tokens and base CSS
  testing/                 fixtures, fake API, parity harness
```

- **Toggle (global, one switch for the whole portal).** "New UI (Beta)" in the classic header and "Classic UI" in the new header. The choice is stored per account (new field `UiPreference` on the user record, written by a new additive endpoint `PATCH /api/me/ui-preference`) with `localStorage` as the instant fallback. Signing in opens the UI the account chose; **classic is the default for everyone**. The new portal has its own Resources section linking to the new Question Solver and Syllabus, so those follow the switch with **no edit to the classic Question Solver or its links**. A classic URL opened directly always shows classic. **Only two classic files get a hook:** the shared header (`components/DashboardShell.jsx`, one switch button) and the post-login redirect (`lib/client.js` `roleHomePath`). Both are additive and tested; every other classic file stays untouched.
- **Shared logic, not copied:** the new UI imports pure rules from `lib/` (`billing.js`, `invoiceDiscount.js`, `accountImport.js`, `timezones.js`, `countryCodes.js`, schedule helpers). If a rule is missing from `lib/` and lives inside a classic page, it is **extracted into `lib/` first** in a separate commit with tests, and the classic page imports it unchanged in behaviour (a refactor commit, verified by the existing behaviour).
- **API:** no breaking change. The new UI calls the same `/api/*` routes with the same bodies, so the classic UI and every other client (CLI, MCP) keep working. New endpoints are additive only (section 2.5).

### 2.2 Stack choices (approved by the user: "yes, more is okay")

| Layer | Choice | Why it improves the experience |
|---|---|---|
| Language | TypeScript `strict` in `ui2/` and `app/v2/` (the repo already has `.tsx` and a `tsconfig`) | Catches shape and prop errors an 8,000-line JS page hides. |
| Data and cache | TanStack Query | Instant tab switches from cache, background refresh, request dedupe, optimistic updates with rollback. |
| Tables | TanStack Table plus TanStack Virtual | Sorting on every column, value and range filters, 1,000+ rows at 60 fps, full control of markup. |
| Accessible primitives | Radix Primitives (Dialog, Popover, DropdownMenu, Tabs, Tooltip, Toggle, Checkbox) | Correct keyboard, focus trap and screen-reader behaviour for every menu, sheet and tab, instead of hand-rolled versions. |
| Searchable A to Z select and command search | `cmdk` on a Radix Popover | Fast filtering of long lists, keyboard first. Replaces `SearchSelect` everywhere. |
| Bottom sheets with touch gestures | `vaul` | Drag-to-close sheets for the 5B edit sheet and phone menus. |
| Toasts | `sonner` | Small, accessible, stackable confirmations and error toasts. |
| URL state | `nuqs` | Type-safe filters, sort, view mode, page size and open record in the URL (back button, shareable links, open in new tab). |
| Charts | `uPlot` | Tiny and very fast line charts (dates on the axis, faint comparison lines, tooltips). |
| Dates | `date-fns` | Predictable date maths and formatting in one place. |
| Fonts | Inter through `next/font` (self-hosted, no layout shift) | Same face as the sketches, no flash of unstyled text. |
| Class names | `clsx` | Tidy conditional classes. |
| Styling | Existing CSS variables plus CSS Modules in `ui2/` | No new CSS framework, no runtime cost, no clash with classic styles. |
| Icons | `lucide-react` (already installed) | Same line style as the sketches. |
| Validation | `zod` (already installed) | One rule set per form, matching the server. |
| Field performance | `web-vitals` reporting to the existing Sentry | Real INP, LCP and CLS numbers from real use, not only lab tests. |
| Tests | Playwright test runner, Vitest with Testing Library, `@axe-core/playwright` | Journeys and parity, component states, automatic accessibility checks. |

All are pinned, small or tree-shakeable, and wrapped behind our own components so any of them can be swapped without touching screens.

### 2.3 Data layer (the heart of "snappy")

- One typed client (`ui2/queries/client.ts`) wrapping the existing `api()` behaviour (cookie session, error shape). Query keys per resource and per filter, so a tab switch reads from cache and shows data **instantly**, then revalidates quietly.
- **Optimistic updates** for every toggle and small edit (tag changes, status flips, flags, deactivate/activate) with rollback and a toast on failure.
- **Prefetch on intent:** hovering or focusing a section link, a row, or a tab prefetches its data and code (`next/link` prefetch and `queryClient.prefetchQuery`).
- **Route-level parallel loading:** each section issues its requests in parallel, never in a chain. Skeletons mirror the final layout so nothing jumps.
- **Cache hygiene:** mutations invalidate only the affected keys (the classic page reloads whole lists).
- **Cross-tab sync:** `BroadcastChannel` so an edit in one tab refreshes the others.
- **Server cost:** today's `readDB()` returns the whole database (cached in-process, 0.9 to 3.4 s cold). The new UI must not multiply that. Phase 0 measures every endpoint the new screens need; Phase 6 adds **additive** read endpoints with paging and field selection (`?limit=&cursor=&fields=`) only where the measurements show a need. The classic endpoints are never changed.

Next.js 16 features reviewed in the bundled docs: Cache Components (`use cache`, `unstable_instant`) are marked draft, and enabling `cacheComponents` is a project-wide switch that could change classic pages. **Decision: do not enable it for this migration.** Use client navigation, `next/link` prefetch, route-level code splitting (each section is its own route, so the 8,464-line classic page is never loaded) and `loading.js` skeleton shells. Revisit Cache Components after the classic UI is retired.

### 2.4 State, routing, URLs

- Section, filters, sort, view mode, page size and open record live in the **URL** (searchParams), so back/forward, reload and "open in new tab" (the tickets note) all work and a link can be shared.
- Selection state, open sheets and drafts live in component state; unsaved drafts warn on leave.
- Keyboard: Tab order matches reading order, `Esc` closes sheets and menus, arrow keys in menus and comboboxes, `/` focuses search. Visible focus rings. Respect `prefers-reduced-motion`.

### 2.5 Additive server changes (all backward compatible, each with tests)

1. `PATCH /api/me/ui-preference` (stores `UiPreference` = "classic" | "next").
2. Optional paging and field selection on the big list endpoints, **only if** Phase 0 measurement requires it.
3. Syllabus same-origin proxy `app/api/syllabus/[...path]` (the recommended option A of `planning/same-domain-solver-and-syllabus-plan.md`) with a session check, needed by the new Syllabus UI.
4. Nothing else. Billing views (group, sort, filter) are client-side over the data the API already returns.

## 3. Design system: every component is there for a reason

Built once in `ui2/components/`, documented in a single page (`/v2/_system`, development only) with every state. Each component lists the screen that needs it, the sketch it came from and its accessibility contract.

| Component | Needed by | Intent |
|---|---|---|
| `AppShell` (TopBar, SectionTabs, PhoneBottomNav) | all admin | Pinned two-tier bar (1A), bottom bar that hides on scroll on phones. |
| `DataTable` (virtualised, sticky header, sortable on every column, column priority) | Accounts, Services, Billing, Tickets, Audit, Enrollments | One table engine for ten screens, so behaviour is identical. |
| `FilterBar` (search, type tabs, value filters, **range filters**) | all tables | Filters by value and by range, state in the URL. |
| `GroupedView` (tree and group-switcher modes) | Accounts, Services, Billing, Audit | Tree like today, group-by modes, counts, fold state remembered. |
| `RowActions` (2 visible plus overflow menu) | Accounts and others | The 4A pattern; same component everywhere. |
| `SelectionBar` | Accounts | The 4C bulk bar with disabled-with-reason actions. |
| `RecordSheet` (bottom sheet) and `InlineExpand` | Accounts, Services, Enrollments | 5A and 5B, one form definition rendered either way. |
| `DraftRow` | Create account | 6B, with validation per cell and confirm/cancel. |
| `FormPage` (stacked sections) | Create service, long forms | 6C. |
| `Combobox` (A to Z, searchable) | every select | Replaces `SearchSelect` with keyboard support and virtualised long lists. |
| `ConfirmDialog` / `TypedConfirm` | Delete, bulk delete | Destructive actions need a deliberate second step. |
| `Toast`, `Skeleton`, `EmptyState` (labels only), `Badge`, `StatusDot`, `Tabs`, `Segmented` | all | The shared vocabulary. |
| `CalendarAgenda`, `CalendarMonth`, `DayTimeline` | Schedule | 9A, 9B, and the new 9C. |
| `StageSteps` | Pipeline | The progress dots of 8B. |
| `LineChart` (dates on the axis, faint comparison lines, tooltip) | Solver and Syllabus progress | Canvas or SVG, no heavy library. |
| `PinnedBar` (top and bottom) | Quiz, Syllabus | Timer, Pause, Cancel, number strip. |
| `TagChips` / `TagSheet` | Syllabus topics | Six tags with their colours and icons. |
| `PdfLink`, `CopyButton`, `CopyMenu` | Billing, reminders | The reminder message menus already built. |

Tokens: colours, spacing scale, radii, type scale and elevation come from the brand guide used for the sketchbooks (Inter, Lucide, sharp-corner rule). Contrast is checked against WCAG AA; any conflict with the brand guide is reported, not silently fixed (the same rule as the sketch rounds).

### 3.0 Design source of truth (documents found, and what they say)

The new UI is built from the DivergenCIE design documents in the parent folder `/home/funteck/projects/dc_p1/`, not from guesswork:

| Document | Where | What we take |
|---|---|---|
| Brand and Design Guidelines BDG v1.0 | `01_BDG_Brand_Design_Guidelines_v1.md` (parent folder) and `01_BDG_Brand_Design_Guidelines_v1.docx` (Downloads) | Palette, Inter, line icons (Lucide 2 px), logo versions and clear-space, tone of voice, brand do and don't. |
| Mockup and Visual Design Guide MU v2 | `12_MU_Mockup_Guide_v2.md` | 8 px grid and spacing tokens, radius tokens, breakpoints, component inventory with required states, motion spec, accessibility rules, per-page mockup specs. |
| User Journey Map UJM v3 | `06_UJM_User_Journey_Map_v3.md` | Real tasks and pain points per role (used in section 3.2). |
| Product Requirements PRD v2 | `03_PRD_Product_Requirements_Document_v2.md` | Non-functional requirements: LCP under 2.5 s, CLS under 0.1, load under 3 s on 4G, WCAG 2.1 AA, last two versions of Chrome, Safari, Firefox and Edge, timezone shown in the user's local time, English only in phase 1. |
| Logos | Downloads: `DC Logo ...` variants (black, grey and white horizontal, with and without banner, transparent), `logo_circle_*_v4/v5` (icon), `latest_logo_*` | The new UI uses the full logo and the icon-only logo. BDG asks for SVG or high-resolution PNG; only PNGs exist, so Phase 0 exports an optimised set (and an SVG if the original artwork exists). Minimum width 120 px, clear space equal to the height of the "D". |

**Conflicts found between those documents and usability (reported, not silently fixed; the user decides):**

| # | Conflict | Numbers | Recommendation |
|---|---|---|---|
| C1 | **Three palettes exist.** BDG v1 (navy `#1A3C5E`, gold `#E8A832`, sky `#4A9FD4`, coral `#E05A4E`, charcoal `#5C5248`), MU v2 (navy `#1B2A4A`, teal `#0D6E8A`, gold `#C9922A`, red `#C0392B`, green `#1A7A4A`), and what the app really uses (BDG hex in the site, a blue accent `#3b82f6` in the dashboards). | | One token set. Use **BDG v1** for brand colours (it matches the live site and the logo) and add the semantic colours the BDG lacks (success, warning, error, info). Adopt MU v2's rules, not its hex codes, unless the user prefers MU's palette. |
| C2 | BDG: primary CTA is gold with **white** text. | white on `#E8A832` = **2.08:1** (needs 4.5) | Navy text on gold (5.44:1), or a navy primary button. |
| C3 | BDG: links are sky blue. | `#4A9FD4` on white = **2.92:1** | Underlined navy links, or a darker sky for text. Sky stays a fill and accent colour. |
| C4 | BDG: errors in coral. | coral `#E05A4E` on white = **3.66:1** | Error text in a darker red (MU's `#C0392B` is 5.44:1); coral stays a fill. |
| C5 | MU: gold H3 text on white. | `#C9922A` on white = **2.75:1** | Gold only as fill, border or icon, never as small text on white (BDG itself says this). |
| C6 | BDG: "do not create new colours or tints", but hover, selected, disabled and chart states need them. | | A small, documented set of derived tokens (fixed mixes of the palette with white or navy), so nothing is invented screen by screen. |
| C7 | Fonts: BDG says Inter plus Merriweather for body; MU says Inter only; sketches used Inter and a mono face for IDs. | | Inter for all UI (tabular numbers for IDs and phones). Merriweather only for long reading text if the user wants it (guides, syllabus notes). |
| C8 | Type scale: BDG and MU scales are page scales (body 16 px, H1 36 to 40). Data screens need 12 to 14 px. | | A "dense UI" scale inside the same family: 12 px table text, 13 px labels, 14 px body in tools, 16 px in reading views. |
| C9 | **Navigation:** MU specifies a fixed **left sidebar** (240 to 260 px) for the Student, Staff, Parent, Ambassador and Management portals. The user picked the **two-tier top bar (1A)** for admin. | | Because the user wants one consistent portal, use the 1A top bar pattern in **all** portals (sections as tabs on desktop, bottom bar on phones). This departs from MU and will be recorded in `DESIGN_RULES.md`. |
| C10 | **Dark theme:** the classic app has light and dark themes; BDG and MU define only light. | | **DECIDED: no dark theme in the new UI.** Light only. Tokens are still named by role (not by colour) so a dark theme could be added later without touching screens. |
| C11 | MU names Recharts for charts. | Recharts is much heavier than needed | `uPlot` (section 2.2) to meet the speed budgets, same look. |
| C12 | MU breakpoints (xs under 480, sm 480 to 767, md 768 to 1023, lg 1024 to 1279, xl 1280 and up). | | Adopt exactly these; test widths 375, 390, 768, 1024, 1280, 1440, 1920. |

**Spec details adopted from MU v2 (so every screen matches):** 8 px grid with tokens space-1 to space-16 (4, 8, 12, 16, 24, 32, 48, 64); radius sm 4, md 8, lg 12, xl 20, full; motion: hover 150 ms, dropdown 150 ms, modal 200 ms, page transition 250 ms (under 300), toast 300 ms in and 3 s on screen, skeleton shimmer 1.2 s, never animate more than two properties, a no-motion fallback for `prefers-reduced-motion`, a loading state within 100 ms of any action; every component has Default, Hover, Active, Disabled and Focus states; sentence case labels (no ALL CAPS except badges); body line length at most 680 px in reading views; copy rules from BDG section 6 (active voice, always write A*, IGCSE, A Level, Cambridge, DivergenCIE exactly).

**Out of scope but recorded.** The PRD and UJM describe features the app does not have yet (claims approval with linked evidence, budget approval, meetings module, missed-class banner, pre-class checklist, onboarding checklists, department dashboards for PR, HR, Finance, Marketing and IT, ambassador earnings, in-app notifications replacing WhatsApp). This migration reproduces **what exists today**; it does not add these. They are listed so the design system has room for them (cards, checklists, approval panels), and the user can request them as separate tickets later.

### 3.1 Consistency program (the user asked for the same look and behaviour across the whole DC portal)

One system for **every** surface: Management, Student, Teacher, Staff, Parent, Ambassador, Trial, Interview, Resources, Question Solver, Syllabus, and the login and register pages. A user who moves between screens or roles must never have to relearn anything.

1. **Six page archetypes**, every screen is one of them: List page (toolbar, filters, table), Record sheet (bottom sheet or in place), Form page (stacked sections), Dashboard home (cards of what needs attention), Tool workspace (pinned bars, one task in focus), Auth page. A new screen picks an archetype; it does not invent a layout.
2. **Tokens only.** Colour, spacing, type, radius, elevation, motion duration and breakpoints (390, 768, 1024, 1280, 1440, 1920) come from one token file. A style rule bans raw colours and pixel values outside it.
3. **One component per job.** One Button (primary, secondary, danger, icon), one Table, one Select, one Sheet, one Toast, one Confirm. Raw `<button>`, `<select>` and `<table>` are banned in `app/v2` and `ui2/features` by lint.
4. **State matrix for every component and screen:** default, hover, focus, active, disabled (with a reason), loading (skeleton shaped like the content), empty (label only), error (what happened, what to do), offline, no permission. A screen is not done until every state exists.
5. **A copy deck:** every label, verb and message lives in one file. The same action has the same word everywhere (Create, Save, Cancel, Delete, Reset password, Log in as), the same icon, the same position (primary action bottom right of sheets, top right of lists), and the same confirmation pattern for destructive actions.
6. **One set of formatters:** dates, times and timezones, money and currency, phone numbers, names, statuses and their colours come from shared helpers, so a date never looks different on two screens.
7. **Behaviour rules identical everywhere:** sort and filter state in the URL, pagination and page size, selection, keyboard shortcuts (`/` search, `Esc` close, arrows in menus), focus order, scroll restoration, unsaved-change warnings, optimistic updates and their rollback toast.
8. **Responsive rules identical everywhere:** pinned bars, bottom navigation on phones that hides on scroll down and shows on scroll up, no sideways scroll at any listed width, touch targets at least 44 px on touch devices while staying dense on desktop.
9. **Enforcement, not goodwill:** (a) lint rules for tokens and banned elements, (b) a consistency audit script that scans the new code for off-token values and non-system components and fails the build, (c) a gallery page (`/v2/_system`) showing every component in every state, (d) visual regression snapshots of every screen at the six widths, (e) an axe accessibility check in every journey test.
10. **Reviews:** at the end of every phase a cross-role walkthrough (the same task done as each role, looking only for differences), a heuristic review (Nielsen's ten plus the portal rules above), and a side-by-side review page of all screens built so far for the user. Any inconsistency found is fixed in that phase, not logged for later.
11. **Single source for decisions:** every new decision (a layout choice, a wording choice) is added to a short `DESIGN_RULES.md` so the next screen follows it automatically.

### 3.2 Task-first speed targets per role (the user said "sure": derived from real usage and the User Journey Map)

Evidence for Management: the production audit log, 2,178 entries from 2026-07-28 to 2026-10-01. **Treat as indicative only**: much of it comes from scripted maintenance (schedule clean-ups, rate edits) done through the command-line key, so it over-counts deletes and service edits. Top entries: schedule item delete 547, service edit 327, ticket close 287, attendance log create 113, account edit 110, account create 75, invoice delete 64 (rebuild), account delete 55, impersonate 53, enrollment create 52, invoice generate 47, ticket note 43, invoice edit 40, paycheck generate 36.

| Role | Most frequent tasks (evidence) | Speed target (clicks from the section's first screen) |
|---|---|---|
| Management | Close or note a ticket (audit log, UJM "ticket oversight"); edit a service and its rates; create and edit an account; log in as a user; enroll a student; generate drafts, edit and send an invoice, copy the fee reminder; check conflicts and the week's schedule; log attendance | Close a ticket: 1 click on the row icon, then confirm. Edit account: 1 click, sheet opens with data already loaded. Create account: 1 click to a draft row, type, Enter. Fee reminder: 2 clicks. Generate drafts: 1 click plus confirm. |
| Student | See today's classes and join; open recordings and notes; progress tracker and doubts; invoices and paying; raise a ticket; Question Solver and Syllabus (UJM journey 2) | Today's next class and its join link visible on the first screen with no click. Open a recording: 2 clicks. |
| Teacher | Check the schedule; log attendance; timesheet; see paycheck (UJM journey 4) | Log attendance for a session: 2 clicks from the schedule row. |
| Parent | Child's attendance and progress; invoices and paying; tickets (UJM journey 3) | Due invoice and a way to pay visible on the first screen. |
| Staff and Ambassador | Their schedule, resources and timesheet, tickets, paycheck | Their own next session and open tickets on the first screen. |
| Trial and Interview candidates | Book a slot, see status, submit the task (existing pages) | Next step visible on the first screen. |

These targets become acceptance tests (count the clicks in the journey tests) and set what gets prefetched first.

## 4. Quality, testing and performance

### 4.1 The parity manifest (how "do not miss anything" is enforced)

1. **Extract.** A script (`ui2/testing/extract-classic.mjs`) parses each classic page (`@babel/parser` is already in the toolchain via Next) and lists, per component: every `<button>`, link, input, select, textarea, form, `onClick`/`onChange`/`onSubmit` handler, every `api("...")` call with method, and the visible label. Output: `planning/parity/classic-<page>.json` (generated, committed, diff-reviewed).
2. **Map.** `ui2/features/<section>/PARITY.md` maps each manifest entry to a new component or marks it `merged`, `moved` or `dropped` with a written reason that the user approves. Dropped items need explicit user sign-off (for example the sketches already agreed to drop invented buttons, not real ones).
3. **Check.** `npm run parity` fails if any classic entry is unmapped. The number must be 100% per phase.
4. **Behaviour test.** For each screen a Playwright test runs the same scripted user journey in classic and new against the **same mocked API**, records the sequence of `(method, url, body)` requests, and asserts they match (order-insensitive where the UI legitimately batches). This proves a button still does exactly what it did.
5. **Drift report.** Because classic stays the main UI and keeps changing, the extractor also runs in CI on every push and compares against the committed manifest. A new button, input or API call in a classic page shows up as `NEW IN CLASSIC, UNMAPPED` in the report. It never fails the classic build; it creates a ticket line for the new-UI backlog.
6. **Number of things to cover (today):** management page 8,464 lines, about 154 button sites, 174 inputs, 8 forms, 80 `api()` calls across 52 components in ten tabs (Applications, Pipeline, Accounts, Services, Schedule, Enrollments, Billing, Guides, Tickets, Audit Log); eight more dashboards (interview 560 lines, student 449, staff 425, ambassador 422, teacher 417, parent 379, trial 302, resources 116); the Question Solver single file of 2,956 lines; the Syllabus single file. The generated manifest replaces these estimates with exact numbers on day one.

### 4.2 Test layers

| Layer | Tooling | Scope |
|---|---|---|
| Unit | `node --test` (already used) and Vitest for components if added | Pure rules, formatters, filter and range logic, grouping, import parsers, discount math (existing tests keep running). |
| Component | Playwright component or Vitest plus Testing Library | Each design-system component in every state, keyboard paths included. |
| Journey and parity | Playwright (Python harness already used in this project) with a mocked API | Per screen, classic vs new request equivalence plus assertions on visible results. |
| Visual | Screenshots at 1440, 1280, 1024, 390 with zoomed crops reviewed section by section | The "high-res cropped review" habit; stored under `snapshots/`. |
| Performance | Playwright traces plus Lighthouse CI in a script | Budgets below, run on a fixed fixture of 1,000 accounts. |
| Accessibility | axe checks in the journey tests plus manual keyboard pass | AA on every screen. |
| Safety | A guard test: classic files unchanged; no real data in fixtures; no secrets in the client bundle | Run in CI and before every push. |

Test data is **fictional and generated** (`ui2/testing/fixtures`). No real student or parent data is used in any test or screenshot that leaves the machine.

### 4.3 Code standards (swe)

- Five-lens review (archaeologist, adversary, architect, auditor, skeptic) at the end of every phase, findings listed before fixes; the scorecard goes in the phase report.
- Small modules, one responsibility each; no component over about 250 lines; no business rule in a component (it lives in `lib/` or `ui2/features/*/model.ts` with tests).
- No `any`, no silent `catch`, every async action has loading, success and error states.
- Conventional Commits, `CHANGELOG.md` `[Unreleased]` updated in the same commit, tickets for each phase in `/api/tickets` (real tickets only), a note on the ticket per milestone.
- **Never push without the user's approval.** Every phase ends with a local commit set, a build, tests green, and a report; the user says "push".

### 4.4 Performance budgets (measured, per phase)

| Metric | Budget |
|---|---|
| Section switch with cached data | under 100 ms to first paint of the new list |
| Section switch cold | skeleton in under 100 ms, data under 600 ms on the production API |
| Input latency (INP) | under 100 ms at the 75th percentile, on a mid-range laptop |
| Table with 1,000 rows | scroll at 60 fps, filter or sort result in under 100 ms |
| Open edit sheet | under 100 ms (data already in cache), form interactive immediately |
| JS per route | under 170 KB gzipped for the shell plus the section |
| Layout shift | CLS under 0.05 (skeletons mirror final layout) |
| Quiz screen | next question under 50 ms, no network wait (questions preloaded) |

A phase cannot close if a budget is missed; the fix goes in the same phase.

## 5. Question Solver and Syllabus specifics

- **Today:** Question Solver is a single static file `public/mcq-digitizer/index.html` (about 2,956 lines, vanilla JS, localStorage state, history-API router, `data-action` delegation) calling `/api/mcq/*` through a same-origin proxy. Syllabus is a separate page on the home machine reached through a Cloudflare quick tunnel (the domain changes in the address bar), identified only by URL parameters.
- **New build:** React routes `app/v2/question-solver` and `app/v2/syllabus`, using the **same** `/api/mcq/*` proxy and the new `/api/syllabus/*` proxy. Classic Question Solver stays at `/mcq-digitizer/index.html`, untouched. The global switch (section 2.1) decides which one the portal links to: the new portal links to the new tools, the classic portal keeps linking to the classic ones. No edit to the classic tool is needed.
- **Prerequisite for the new Syllabus:** the same-domain proxy of `planning/same-domain-solver-and-syllabus-plan.md` (option A). It also fixes the identity gap (session instead of `?account=&name=`). It is built first inside Phase 7a and ships on its own.
- **Quiz engine:** one state machine (`idle → picking → ready → running → paused → submitted → reviewing`) with a pure reducer and tests, so timer, pause, cancel, flag, check-answer and submit behave exactly as today; the old single-file behaviours are captured as test cases from the current code before any UI is written.
- **Snappy by design:** preload the paper's question images and answer data when "Fetch this paper and start" is pressed; prefetch the next question image; keep answers in memory and persist incrementally; no network call on question change.
- **Chart note from the marks:** dates on the axis and faint lines for other students (leaderboard comparison) are part of `LineChart`, with a tooltip and a legend toggle.

## 6. Classic files that must not change (CI-enforced)

`app/dashboard/**`, `app/login`, `app/register`, `public/mcq-digitizer/**`, `components/*` (except the one additive switch button in `DashboardShell.jsx`), `lib/client.js` (except the additive redirect hook), `app/api/**` (additive routes only, existing routes unchanged in behaviour). The guard test compares file hashes against a committed list; any change outside the two hooks fails the check.

## 7. Phases (each ships behind the toggle, each ends with parity 100% for its scope)

Effort is in agent working sessions (one long focused session each), not calendar time.

| # | Phase | Scope | Exit criteria | Size |
|---|---|---|---|---|
| 0 | Foundations | Resolve the CONFIRM items (section 8). Parity extractor and first manifest. Light-theme design tokens from BDG v1 and MU v2 with the accepted accessibility fixes (section 3.0), logo set exported (full and icon, light and dark, optimised) from the Downloads files, `DESIGN_RULES.md` started, component skeletons. Data layer with a fake API. Toggle plumbing and the two classic hooks. CI guards. Baseline performance measurements of every endpoint. | Manifest committed, toggle works both ways with an empty new UI, budgets measured, guard test green, user approves the CONFIRM answers. | 2 |
| 1 | Vertical slice: Shell and Accounts (Students) | AppShell (1A), DataTable, FilterBar, RowActions, Accounts list for Students with the 21-column solution, URL state, skeletons. | Students list at 1280 and 390 with no sideways scroll, budgets met on 1,000 rows, parity for the Students table actions at list level. | 3 |
| 2 | Accounts, complete | All account types and tabs; RecordSheet and in-place edit; DraftRow create; selection bar; Log in as; Reset password; Activate/Deactivate; Convert; Delete (with history guard); Import from form (just built); Copy credentials; groups modes. | Every Accounts manifest entry mapped and tested; parity journeys pass; five-lens review done. | 4 |
| 3 | Services and Enrollments | Tree view and group modes, Create service FormPage (rates, batches, occurrences, facilitators, links), rate editing, service uptime, Enrollments (7C), enroll strip, add service, dates, rate move. | Parity for services and enrollments; the date-wipe bug class covered by tests (the earlier PATCH wholesale lesson). | 4 |
| 4 | Billing | Full table default, group modes, sort every column, value and range filters, lifecycle lanes mode, generate and rebuild drafts, manual forms, invoice rows, line items, discount editor, approve/partial payment, PDF, reminder menus (UPI, Stripe local, international, Indian full), paychecks, acknowledgement copy. | Parity for every billing action and message text byte for byte; discount and INRDue math verified by the existing unit tests plus journeys. | 5 |
| 5 | Pipeline, Applications, Schedule, Tickets, Audit, Guides, Settings | 8B pipeline, applications review, Schedule with agenda, month, conflicts, offer slot, reschedule, weekly image link, then the new day timeline (9C); Tickets table with open-in-tab thread, notes, hold, close, uptime check; Audit with page size; Guides; resource toggles; registration settings; MCQ config. | Every tab of the classic Management dashboard has a mapped, tested new equivalent. | 5 |
| 6 | Other dashboards (same look, section 3.1) | Student, teacher, staff, parent, ambassador, trial, interview, resources, login and register. **Not covered by the sketchbooks, decided: same look and behaviour as the rest of the portal.** Built from the six page archetypes and the shared components, no new layouts invented. One side-by-side review page of all of them for the user before building details; extra sketch options are made only where a screen truly has no archetype. | Parity per dashboard, cross-role consistency walkthrough passes. | 4 |
| 7a | Syllabus same-domain proxy | `/api/syllabus/*` with session check and caching (option A of the existing plan). | Classic link unchanged, proxy tested, images cached at the CDN. | 1 |
| 7b | New Question Solver | Q1 to Q13 as decoded in section 1; quiz state machine; structured grading UI; results; progress chart; phone layouts; desktop version of the 13A picker. | Parity for every Question Solver action (including Mistakes Mode, Upload own QP + MS, Digitize this paper, leaderboard); quiz budgets met. | 5 |
| 7c | New Syllabus | S1 to S13, tags with colours and icons, summary strip, progress tabs. | Parity with the classic page including Export tagged topics and view raw JSON. | 3 |
| 8 | Hardening and sign-off | Accessibility pass, cross-browser (Chrome, Firefox, Safari-class), 390 and 768 and 1024 and 1280 and 1440 and 1920 checks, load test, security review (no new unauthenticated surface), parity audit report, documentation. | 100% parity report, all budgets met, user acceptance walk-through. | 2 |
| 9 | Opt-in Beta (not a rollout) | Beta label, feedback link that creates a ticket, error and speed monitoring through the existing error tracking. The switch stays opt-in per account. **Classic remains the default and the main UI.** Making the new UI the default, or retiring classic, would be a separate decision for the user and is not planned. | Beta users can switch both ways at any time without losing work; rollback is simply switching back. | 1 |

Total about 40 sessions, plus a small recurring cost to keep the new UI in step with new classic features (drift report, section 4.1). Phases 1 to 5 deliver the whole Management dashboard; phases 7a to 7c can run in parallel with 3 to 5 if a second agent is used (they share only the design system from phase 0 and 1).

## 8. Decisions and open questions

Decided by the user on 2026-10-02:
1. **Shell:** 1A only (two-tier sticky bar), used in all portals.
2. **Accounts table:** one line per row, **option A** (fit all 21 columns, trimmed). The 5 long text columns are cut with an ellipsis and show in full on hover and in the record sheet; IDs, phones, status and course always show whole.
3. **Bulk actions:** "sure" to the proposal: Deactivate, Activate, Reset password, Delete (names listed, typed confirmation, capped at 25, each in the audit log); Edit and Log in as are greyed with a reason. "Set one field for all selected" is **not** in the first release.
4. **Other dashboards:** same look and consistent behaviour across the whole portal (section 3.1).
5. **Dependencies:** approved, more is fine (section 2.2).
6. **Role tasks:** delegated to me; derived in section 3.2.
7. **Devices and connections, languages:** not needed (English only; no RTL work planned).
8. **Toggle:** one switch for the whole portal, not per page.
9. **Classic UI is the main UI; the new UI is an experimental, opt-in redesign** (section 0).
10. **Brand files:** exist; found and read (section 3.0).
11. **Palette (C1):** Brand Guidelines (BDG v1) colours as the source, plus derived semantic colours. Accepted.
12. **Accessibility fixes (C2 to C5):** accepted (navy text on gold buttons, underlined navy links, darker error red, gold never as small text on white).
13. **Dark theme:** not needed. The new UI is light only.
14. **New Student fields** (Gender, Help wanted, Subjects, Referrer, Heard about us, Can score A*): shown in the record sheet. **All current table columns stay** (the 21 of option A); no existing column is dropped and the new fields are not added as table columns.

Still open (the stated default applies if unanswered):
- **Merriweather (C7):** not used in the app UI. [not used]
- **Services:** tree view like today as default plus the 7B group switcher. [yes]
- **Billing modes:** Table (default), By person, By month, By due date, By status lanes. [as listed]
- **Audit page size:** 25, 50, 100, 200. [yes]
- **Question Solver Q2 default:** 2A selects in one column. Q3C single Start button: dropped. [yes]

## 9. Tickets to open (real tickets, one per item)

- **TKT-0322** Epic: "New UI (admin, Question Solver, Syllabus) behind a toggle" with this plan linked.
- **TKT-0323** Billing: "Billing views: default full table, group modes (person, month, due, status lanes), sort on every column, filter by value and range" (marked "add ticket for billing" on the PDF).
- **TKT-0324** Schedule: "Day timeline per instructor" (marked "new feature" on 9C).
- Optional per-phase tickets created when each phase starts.

## 10. Risks and how they are handled

| Risk | Mitigation |
|---|---|
| A classic behaviour is missed | Parity manifest from code, request-equivalence tests, user sign-off on every dropped item. |
| New UI slower than classic on big data | Budgets and a 1,000-row fixture from Phase 0, virtualised tables, prefetch, additive paged endpoints only when measured. |
| The 21-column table cannot be both full and readable | Decision in section 8 question 2, validated with a screenshot review at 1280 before building the rest. |
| Classic accidentally edited | Hash guard in CI and before each push. |
| Scope growth (other dashboards not sketched) | Phase 6 has its own sketch step and approval. |
| Real data leaks into tests, screenshots or bundles | Generated fictional fixtures only; client-bundle scan for secrets as in earlier releases; screenshots with real data stay private. |
| Two UIs diverge on business rules | Rules live in `lib/` and are shared; a rule change updates both. |
| Dependency risk | Three small headless libraries, pinned versions, an adapter layer so they can be swapped. |
| Long migration, long-lived branch | Each phase merges behind the toggle (default off), so `main` stays releasable. |
| Classic keeps changing while the new UI is built | Drift report in CI lists any classic control or API call not yet mapped; classic features land first; shared `lib/` rules mean fixes reach both; the new UI is allowed to lag classic by one phase but never to block it. |

## 11. What happens next

1. User answers the open items in section 8 (defaults apply to anything unanswered).
2. Create the tickets in section 9.
3. Start Phase 0. Nothing is pushed without the user's approval.

## 12. Status (2026-10-02)

Phases 0 to 9 are built. Evidence, budgets met and missed, and open decisions are in `planning/new-ui-final-report.md`.
