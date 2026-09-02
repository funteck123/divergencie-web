# MCQ digitizer: score tracking + full app integration — plan

Status: **decisions locked below (2026-09-02), build not yet approved.** Captured
verbatim from the 2026-09-02 request so we don't re-derive it, plus the
current-state research that shaped the questions, plus the answers.

## Decisions (final, as of 2026-09-02)

- **Sequencing**: build score tracking now, on the existing tunnel setup, kept
  as independent of the main Next.js app as possible. No auth/dashboard
  integration yet — that's a separate, later migration (section 5/6 below,
  unchanged, still not started).
- **Storage**: a new Supabase table + bucket, written to directly from
  `prototypes/mcq-digitizer/server.mjs` with its own Supabase client (same
  project/credentials the main app uses, via `.env`, but no dependency on any
  Next.js route or `lib/db-supabase.js` collection code). Rationale: this
  server has already had its process killed and restarted once this session
  (the tunnel outage) — a local JSON file isn't durable enough for a scores
  ledger, and building directly against Supabase avoids a second migration
  when this later plugs into the main app.
- **Account identity**: no login in the prototype. The account travels as a
  URL param (e.g. `?account=STU-0006`) on the link a student is given/clicks.
- **Leaderboard names**: first name + last initial (matches the DC Team
  convention from this session, e.g. "Aisyah F.").
- **Leaderboard "overall" score**: show **both** average % correct and total
  questions answered correctly — two ranked lists, not a single blended
  number.
- **Progress overlay**: same chart as the student's own progress-history line
  — every other student's trajectory drawn faint/grey behind it, the
  viewer's own line highlighted on top.
- **Placement**: inside the digitizer page itself (`index.html`), not the
  main app's student dashboard — consistent with keeping this independent.
- **Day-one scope**: same coverage the prototype already has (195 papers /
  5775 questions — IGCSE + A-Level Physics/Chemistry/Biology; Math once
  TKT-0151's separate digitizer exists, not blocking this).
- **Backfill**: none — tracking starts clean from ship date, no attempt to
  reconstruct history from anything already run through the tool.

## The request, as given

1. Track MCQ digitizer scores in a database, keyed to the student's account —
   currently the tool is reached through an ephemeral Cloudflare tunnel URL with no
   auth, so the account needs to travel as a URL param for now.
2. Show each student a progress-history graph.
3. Show a leaderboard: overall ranking, and per-paper ranking.
4. Show a "progress track overlay" — all students' progress plotted in the
   background of an individual's own graph, over time.
5. Bigger move: retire the tunnel entirely. Consolidate:
   - Image/PDF storage → Supabase Storage (not local disk / Drive links).
   - Score data → Supabase tables (not a local JSON file).
   - The mcq-digitizer and syllabus-digitizer tools stop being standalone
     prototypes reached by tunnel and become real pages inside the main
     Next.js app (`app/`), under the app's own auth.
6. Access control: a student should only ever see subjects they are actually
   enrolled in — not the full subject library, which is what the standalone
   prototype currently exposes to anyone with the tunnel link.

## Current state (verified in this session, not assumed)

- `prototypes/mcq-digitizer/` is a **standalone** Node HTTP server
  (`server.mjs`, no framework), explicitly `"Not part of the main app's build"`
  per its own `package.json` description. No auth. No DB — the "database" it
  reads from is `data/mcq-digitizer/full-library/database.json`, a static
  pre-built file, not a live store.
- Grading happens **entirely client-side** in `index.html` — the server never
  sees a submitted answer or a score today. Score tracking is 100% new surface,
  not a hookup to an existing signal.
- The tunnel (`cloudflared tunnel --url http://localhost:5178`) is a **quick
  tunnel**: no stable domain, a new random subdomain every restart, and it dies
  whenever the local `node server.mjs` process dies (confirmed earlier this
  session when background-task cleanup killed it).
- The main app already has a working Supabase Storage pattern to copy:
  `lib/storage.js` — a private bucket (`payment-proofs`), `uploadPaymentProof()`
  writes a `Buffer` to `{id}/{timestamp}.{ext}`, `signedProofUrl()` hands back a
  time-limited signed URL. Same shape would work for MCQ crop images/PDFs.
- The main app's DB is Supabase Postgres via `lib/db-supabase.js`
  (`DB_BACKEND=supabase`), JSONB-collection style (see `read_full_db()` —
  flagged in memory as hardcoded per-table, not generic; a new `mcqAttempts`
  or similar table needs it patched in by hand).
- Enrollment already exists as its own collection (`enrollments`, keyed by
  `EnrolmentID`) separate from `services` (`ServiceID`) — subject-level access
  control ("only subjects a student is enrolled in") has a real join to build
  on, not something invented from scratch.

## Why this needs your answers before a build plan can be written

This is really three separate projects wearing one request:
- **(A)** A new analytics feature (score tracking + graphs + leaderboard).
- **(B)** An infra migration (tunnel + local files + local JSON → Supabase
  Storage + Supabase tables).
- **(C)** A product move (standalone prototype → first-class authenticated
  page inside the main app, with real per-student subject scoping).

(B) and (C) are prerequisites for (A) to even have real per-account data to
show — you can't show a login-less student a personal progress graph. So the
real sequencing question is which of B/C happens first, or whether they're
one combined migration.

## Open questions (answers needed before scoping a build)

Grouped by topic — answer inline, in full sentences or short notes, whatever's
fastest; skip any you want me to default on.

### Graphs — "type of graphs, what data they'll cover, how many, what info"
- Progress-history graph: line chart of score-over-time per attempt? Per
  subject, or one combined line across all subjects?
- Leaderboard "overall": one score per student combining all subjects/papers
  into a single number — how? (average %, total correct, papers attempted?)
- Leaderboard "per paper": a separate ranked list for each individual past
  paper, or per subject?
- The "overlay" — all other students' trajectories as faint background lines
  behind the viewer's own highlighted line, on the *same* progress-history
  chart? Or a separate chart?
- How many distinct graphs total on the page, and what's the intended reading
  order (e.g. "your progress" first, then "how you compare")?

### Privacy / leaderboard visibility
- Leaderboards mean each student's performance becomes visible to other
  students in some form. Real names, first-name + initial (matching the DC
  Team convention from this session), or anonymized/pseudonymous ranks?
- Does Management see a different, fuller (named) version of the same
  leaderboard/overlay that students don't get?
- Opt-in or on-by-default? (Some students/parents may not want to be ranked
  publicly at all.)

### Placement / access
- Where does this live once built — a new tab on `dashboard/student/page.js`,
  its own route, or embedded inside the digitizer page itself?
- Does the teacher/management dashboard get its own view of this data (e.g.
  per-class aggregate), or is this student-facing only for now?

### Sequencing
- Build (A) analytics on top of the *existing* tunnel setup first (score data
  keyed by a URL param, like the request literally says), then do the (B)/(C)
  migration later? Or do (B)/(C) — bring mcq-digitizer into the main app,
  drop the tunnel — *before* building analytics on top of real accounts?
- Does syllabus-digitizer need to move into the main app in the same pass as
  mcq-digitizer, or can that wait?

### Scope boundaries
- Is there an existing scores/attempts source to backfill from (e.g. anything
  already logged locally from prior tunnel sessions), or does tracking start
  clean from whenever this ships?
- Any target subjects/papers this needs to support on day one, or is "same
  coverage as the prototype has now" (195 papers / 5775 questions, IGCSE +
  A-Level Physics/Chemistry/Biology + Math per TKT-0151) the right scope?

## Build plan (proposed, pending go-ahead)

### Supabase schema

New table `mcq_attempts` (own table, not part of `lib/db-supabase.js`'s
JSONB-collection system — a plain relational table, queried directly):

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| account_id | text | value of the `?account=` URL param, verbatim |
| subject | text | e.g. "IGCSE Physics" |
| paper_id | text | matches the `qpId`/paper identifier already in `database.json` |
| score | integer | questions correct |
| total_questions | integer | questions in that paper |
| submitted_at | timestamptz | default now() |

No new Storage bucket needed yet — crop images already live under
`data/mcq-digitizer/full-library/` on this server's disk; only attempt/score
rows are new. Row-level security: server writes with the service-role key
only (same trust model as `lib/storage.js`), no public anon access.

### Server changes (`prototypes/mcq-digitizer/server.mjs`)

- New Supabase client, own module, reading `V7_SUPABASE_URL` /
  `V7_SUPABASE_SERVICE_ROLE_KEY` from `.env` directly (no import from `lib/`,
  keeping the "independent of the main app" boundary literal).
- `POST /api/attempts` — record one graded attempt: `{account, subject,
  paperId, score, totalQuestions}`. Grading itself stays client-side, unchanged
  — this just logs the result after the fact.
- `GET /api/progress?account=...` — that account's attempt history, for the
  personal progress-history chart.
- `GET /api/progress/all` — every account's attempt history (account id +
  score + timestamp only, no other PII), for the background overlay.
- `GET /api/leaderboard` — both rankings (avg % and total correct), overall
  and broken out per paper.

### Client changes (`prototypes/mcq-digitizer/index.html`)

- Read `?account=` from the URL on load; if absent, tracking/graphs/leaderboard
  simply don't render (grading still works standalone, unaffected).
- On grading a quiz, POST the result to `/api/attempts`.
- New "My Progress" view: line chart, this account's score % per attempt over
  time, chart library TBD (likely a small dependency-free canvas chart to
  match the "no framework" philosophy of this prototype, or Chart.js via a
  plain `<script>` tag — open to either).
- Overlay: same chart, every other account's line rendered faint/grey behind.
- "Leaderboard" view: two tables (avg %, total correct) — overall, and a
  per-paper breakdown, first-name-plus-initial formatting matching the DC Team
  convention (needs a name lookup — see open question below).

### Name source — resolved

Link format is `?account=STU-0006&name=Faraz` — whoever generates/sends a
student their link includes both. The tool never calls the main app; if
`name` is missing, fall back to showing the raw `account` id rather than
failing.

## Main-app merge — "Option B" (locked 2026-09-02)

Extraction (`prototypes/mcq-digitizer/server.mjs`, `extract_mcq.py`) stays on
this always-on machine — most papers are pre-extracted PNGs served straight
from disk, only manual uploads and the ~10 uncached papers still shell out to
live `python3`/PyMuPDF, which can't run on a Vercel Node function. Everything
else (student-facing UI, auth, enrollment-based subject scoping, leaderboard)
moves into the main Next.js app. Reachability: kept the existing ephemeral
Cloudflare quick-tunnel (no named-tunnel login needed) but centralized —
Management updates the current URL in one place (`mcqconfig` table via the
Management dashboard), every proxied request reads it live, no redeploy.

### Built so far

- `data/tmp/migration_mcq_attempts_and_config.sql` — **pending manual
  approval**, blocked by the auto-mode classifier (production schema
  change). Adds `mcq_attempts` (scores.mjs's table) and `mcqconfig` (the
  URL store), both queried directly by their own client, not through
  `lib/db-supabase.js`'s COLLECTIONS/`read_full_db()` aggregate.
- `lib/mcqConfig.js` — `getMcqExtractionUrl()` / `setMcqExtractionUrl()`.
- `app/api/mcq-config/route.js` — GET (any session) / PATCH (Management).
- `app/api/mcq/[...path]/route.js` — server-to-server proxy to the
  extraction service. GET `/api/mcq/library` is filtered to the session's
  enrolled subjects (Board+SubjectName match against `db.enrollments`/
  `db.services`) for everyone except Management, who see the full library.
- `app/dashboard/management/page.js` — new "MCQ Digitizer Extraction
  Service" card (Guides tab) to set/update the URL.
- `public/mcq-digitizer/index.html` — copy of the prototype client, its 3
  `fetch()` calls repointed from `/api/*` to `/api/mcq/*` (same-origin,
  proxied). No other changes — grading is still 100% client-side.
- Both `next build` passes confirmed clean (no type/route errors).

### Known gap — flagged, not silently claimed as solved

Subject-enrollment filtering is only applied to the **library listing**
(`GET /api/mcq/library`). Every other proxied endpoint (`fetch-and-digitize`,
`digitize`, `attempts`, `progress`, `leaderboard`) is a plain pass-through
with **no server-side check** that a requested `qpId`/`msId` actually belongs
to a subject the caller is enrolled in — a student who already has a
qpId/msId from elsewhere (e.g. shared by a classmate) could still fetch it
directly. Hiding it from the picker is not the same as enforcing it. Real
enforcement needs the same subject-match applied to the specific paper being
requested before proxying `fetch-and-digitize`, not yet built.

The Board+SubjectName string-matching itself is also unverified against real
live enrollment/service data (normalized case/hyphen/whitespace, but never
spot-checked against what's actually in production) — needs a real check
before this is trusted, same discipline as everything else this session.

### Completeness pass (2026-09-02) — client UI + syllabus-digitizer built

- Migration ran successfully; `mcq_attempts`/`mcqconfig` confirmed live.
- MCQ client UI built into `public/mcq-digitizer/index.html`: after a
  Test-mode submit, the attempt POSTs to `/api/mcq/attempts` (only for
  library-sourced papers — manual uploads have no stable `paperId` and are
  never tracked). New "View my progress & the leaderboard" view: a vanilla-
  canvas cumulative score-% chart (own line highlighted, every other
  account faint behind it) plus two ranked tables (avg%, total correct),
  Overall + a tab per paper (readable title, cross-referenced from the
  already-loaded library data, not the raw Drive file ID). Verified
  end-to-end via Playwright against the real tunnel + real Supabase table
  — digitized a real paper, submitted, confirmed the attempt saved and
  the progress/leaderboard view rendered correctly with real data.
- Syllabus-digitizer's equivalent built the same way: its existing
  "Completed" tag chip (previously localStorage-only) now also POSTs to
  a new `prototypes/syllabus-digitizer/progress.mjs` module / new
  `syllabus_completions` Supabase table (migration run, confirmed live)
  when accountId is present, and unmarking deletes the row. New
  header link → same chart-+ single-ranking-table pattern (no "avg
  score" concept here since there's no grading, just topics-completed
  count, overall + per subject). Verified end-to-end the same way.
- Two real pre-existing bugs found and fixed while wiring this up: (1)
  both prototypes' own static-file routers never stripped the query
  string, so `/?account=X` 404'd instead of serving `index.html` — fixed
  in both `server.mjs` files. (2) the mcq proxy's `fetch()` calls had no
  try/catch, so an unreachable tunnel threw instead of returning a clean
  503 — fixed, plus added score-bounds validation (`InvalidAttemptError`)
  to `scores.mjs`.
- Still open, explicitly deferred to a separate discussion per user
  request: the two HIGH security findings from the swe-skill audit
  (POST /api/mcq/attempts doesn't verify the caller owns the accountId
  it's posting; GET /api/mcq/progress?account=X lets any session read any
  account's history) — not fixed yet, on purpose.
- Navigation: still nothing links students to `/mcq-digitizer/index.html`
  from inside the main app's own dashboards — placement not decided.

### Leaderboard/progress architecture, finalized (2026-09-02)

Four tiers for MCQ, three for syllabus (no "paper" concept there) --
broadest to narrowest:

| Tier | MCQ | Syllabus | Ranking |
|---|---|---|---|
| Overall | all subjects | all subjects | **Volume only** (attempts/questions answered, or topics completed) |
| Subject | e.g. "IGCSE Physics" | e.g. "Accounting" | avg% + total correct (MCQ) / topics completed (syllabus) |
| Chapter | e.g. "1.1" | e.g. "0" (top-level node) | same as Subject, scoped narrower |
| Paper | one specific worksheet | n/a | same as Subject, narrowest |

Design decision, not just an added tier: **Overall deliberately excludes
avg%** for MCQ -- ranking accuracy across different-difficulty subjects
isn't a fair comparison (a student who did 2 hard A-Level Chemistry
papers at 40% would rank below one who did 50 easy IGCSE papers at 90%,
which isn't "who's better," just an artifact of which papers they took).
Accuracy comparisons only ever appear once a subject/chapter/paper scope
makes them apples-to-apples by construction. A subject/chapter tier is
inherently already scoped to accounts with activity there -- no separate
enrollment-filtering needed for fairness at that tier, though the earlier
security gap on GET /api/mcq/progress?account=X (any session can read any
account's data) still applies equally at every tier and is still deferred.

Personal progress charts (both tools) also filter by Subject and Chapter
(Subject dropdown populates Chapter dropdown from that account's own
completed chapters) -- "account-wide history of subject-wise history,"
per the request that prompted this design pass.

**Chapter derivation differs by tool, verified against real live data:**
- Syllabus: free -- node_key is a dot-path ("0", "0.1", "0.1.2"...) built
  by the outline renderer; its first segment IS the chapter. No schema
  change needed.
- MCQ: NOT free -- paperId is an opaque Google Drive file ID with no
  chapter info in it at all. Chapter lives in the paper's *title*, which
  the client already has from the library listing. Checked all 196 real
  papers in the live library (2026-09-02): 100% parse via exactly two
  regexes -- `Ch(\d+(?:\.\d+)?)` for every subject except A Levels
  Chemistry, which instead uses a bare leading `1.1-topic-name` with no
  "Ch" prefix (a real, confirmed naming inconsistency between subjects).
  Client computes chapter once at fetch-and-digitize time and sends it
  explicitly in the attempt POST; a title matching neither pattern stores
  `null` rather than guessing (excluded from chapter-scoped views, not a
  crash). New nullable `chapter` column + index added via
  `data/tmp/migration_mcq_chapter.sql` (migration run, confirmed live).

All four/three tiers verified end-to-end via Playwright for both tools
against real Supabase data (not just curl) -- chart filtering, leaderboard
drill-down (Subject select → populates Chapter select → populates Paper
select for MCQ), and the Overall/volume-vs-scoped/accuracy view switch all
confirmed rendering correctly with real attempts/completions.

## Not yet decided (explicitly out of this doc until answered above)

- Exact DB schema for attempts/scores.
- Exact chart library/approach.
- Whether syllabus-digitizer's migration is in scope now or a separate ticket.
- Any UI mockup/layout.
