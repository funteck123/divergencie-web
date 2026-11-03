# Session handout: Recording Library, billing carry-over, Beta tag, video rebuild paused (2026-11-04)

Written for whichever agent picks up this project next. Read fully before touching anything. Also read the
auto-memory index (`MEMORY.md`): several standing rules apply to every task.

This repository is PUBLIC. This handout has no student or staff names, no money figures, no sheet links and no
passwords on purpose. Anything personal lives in `data/ops-work/` (gitignored) and in the memory files.

## What shipped (1 to 4 Nov 2026, all on `origin/main`, each deploy confirmed READY and Sentry clean)

| Area | Ticket | Commit | What it is |
|---|---|---|---|
| Question Solver | TKT-0301 | see log, 8 commits | Paper 3 mark schemes: answer-mark totals equal 40 on 371 of 394 papers (was 108). 23 papers left. |
| Quality | TKT-0385 | `4691346`, `c04441e` | The 12 lint errors silenced with a reason each; Sentry loads on demand (first-load JS on the Accounts route 486 to 250 KB, Student 359 to 242 KB). Performance budget decision still open. |
| Library PDFs | TKT-0299 | `f006264` | Banner removal that keeps real lines; five files rebuilt. Three other repaired files not done. |
| Coverage audits | TKT-0379, TKT-0349 | `68c81ab`, `0657e60` | Which components have topical, yearly or solved papers; which Maths worksheets have gaps. |
| Recordings | TKT-0358 | `210e6e3`, `9da6568`, `392f827`, `ffb7527`, `2d11a20` | YouTube upload tool (unlisted, 6 per quota day) and the student **Recording Library** (one course at a time, chapters, previous and next). 23 videos live. |
| Billing tables | TKT-0402 to 0405 | `61c0495` | ID column first, By batch view, one-line sent date, name column no longer squeezed away. |
| Carry over | TKT-0406 | `fe13c00`, `20dd1da`, `b1a378f` | "Carry over to next month" in the row menu of an invoice and of a paycheck (see below). |
| Portal polish | none | `e56aeec`, `1bcf124` | AI-design tells removed (brand font Satoshi, no side stripes, no nested cards, no emoji icons); service groups aligned. |
| Beta tag | TKT-0407 | `b5d3d47` | Removed from the top bar, the classic switch button and the tab title. |
| Templates | TKT-0409 | `b5d3d47` | Message templates are Management only: card removed for Teacher and Staff, API refuses them. |

## How the new pieces work

**Recording Library** (`app/v2/recordings`, `ui2/features/recordings`, `app/api/recordings`, `lib/recordings.js`)
- Data lives in a new Supabase table `recordings` (row security on) and the collection `recordings`. The database function
  `read_full_db()` was extended; the old definition is in `backups/supabase-recordings-20261103/`.
- A student sees a recording only if its subject code matches an enrolled subject, its batch (when it names one) is the
  student's batch, and its component (for example Pure 1 versus Statistics 1 under 9709) matches when both name one.
  Management sees all; teachers and others see none.
- **After every YouTube upload batch run:** `python3 scripts/ops/recordings_import.py --post` (safe to repeat; dry run without
  `--post`). It reads the gitignored dataset in `data/youtube/`. A long title loses its component prefix, so the script
  also reads the full lesson text from `data/youtube/processed_ledger.json`.
- The uploader is `scripts/ops/youtube_upload_ready.py --limit 6` with `.env.local` loaded. The quota day is the PACIFIC
  day (resets 15:00 or 16:00 Singapore time depending on US daylight saving). I got the reset time wrong once after the US clock change: always check the Pacific date.

**Carry over** (`app/api/invoices/carry-over`, `app/api/paychecks/carry-over`, helpers in `lib/billing.js`)
- Invoice: same subjects, batches, amounts and discount, next month, Draft, converted at the new month's rate; no hours, no
  notes, no Sent or Paid marks. Paycheck: NOT last month's amounts; each line is priced at the current full rate for the new
  month, hours left empty (add them by hand with Edit on each line, or Rebuild Drafts once attendance is logged).
- Both leave out a line whose enrollment has ended, not started or does not exist (same rule as Generate Drafts), name what was
  left out, and refuse a one-off record or a month that already has one.
- The create step was tested only against a fake database and in the browser, not on a real record on the live site.
  The owner was asked to try it once on a real row (TKT-0406 stays open until then).

## Rules and traps that cost time this session

1. **The classic guard** (`scripts/guard-classic.mjs`) forbids changing any file under `app/api/`, `components/`, `app/dashboard/`
   unless it is listed in `HOOKS` with a size limit. New files under `app/api/` are allowed. So add a new route instead of
   editing a classic one; when the owner asks for a change to a classic file, add a small `HOOKS` entry with a reason.
   The guard compares against `HEAD`, so after a commit use `GUARD_BASE=<last good commit> node scripts/guard-classic.mjs`.
   **A command chain with `| tail` hides its exit code**: run the guard on its own and stop on failure. One commit went out with
   a guard failure this session and had to be corrected in a follow-up (no force-push).
2. **Component CSS must sit inside the "specificity lift" block** (see `DESIGN_RULES.md`), or the Tailwind reset beats it.
   Tokens are generated: edit `ui2/styles/palette.mjs`, then `node scripts/build-tokens.mjs`. `node scripts/lint-design.mjs` must pass.
3. **Never `pkill -f` or `pgrep -f` with a pattern that appears in your own command**: it matches and kills the shell (exit 144) and
   the rest of the command silently does not run. Kill by PID from `ss -ltnp | grep :3111`.
4. A `next build` and `next start` race: start the server only after `BUILD EXIT 0` is in the log, and look for "Could not find a
   production build" in the server log. A stale server on port 3111 serves the OLD build and gives false results.
5. `vitest` only runs files listed in `vitest.config.mts`; add new test files there.
6. The quick tunnel (`funteck`) dies after about a day ("Tunnel not found" in `~/funteck/logs/tunnel.log`); `funteck stop` then
   `funteck start` gives a new address and breaks every older link. The WSL side cannot resolve fresh tunnel hostnames, so verify in a browser or through the tunnel log.
7. Do not trust a search or a regex as a count: check each case and say "checked X of N" (standing rule). The AI-tells sweep
   did this and is saved as the user skill `ai-ui-tells-removal`.

## Open work and who owns the next move

- **Owner decisions or checks:** TKT-0405 (confirm names show in Billing on the live site), TKT-0406 (try carry-over once), the
  8 student-invoice tickets and 6 paycheck tickets (TKT-0388 to 0401: amounts and sending are the owner's call), TKT-0381,
  0380, 0376, 0375, 0347, 0286, 0288.
- **Paused by the owner: the video rebuild** (TKT-0408, TKT-0308, TKT-0287). The owner judged the current videos cheap
  (robotic voice, generated music, soft captures, wrong redrawn logo). Decisions: Sesame csm-1b voice on the UM DICC GPUs;
  free-licence music chosen by the agent with options kept; the 707 px repo logo; the agent audits bugs; build ONE 15 to 20
  second benchmark advert first. **Blockers:** the owner's Hugging Face token, and a working cluster login (password and key
  both refused from here; details in the memory file `reference_dicc_access_state`). Do not restart unprompted.
- **Next ticket I would pick up:** TKT-0237 (question search, phase 1). Start by measuring how many questions have a text
  layer versus image-only, as `planning/mcq-digitizer-question-search-plan.md` says. Other candidates: TKT-0301 (23 papers),
  TKT-0304 (English 9093), TKT-0299 (3 files), TKT-0206 part 2 (needs owner answers).
- **Daily wake-up:** the `claude-daily-wakeup` skill, cron job `0 8,13,18,23`, is session-only (dies with the session, expires about
  7 days after it was set on 1 Nov). Top job is the YouTube uploads, then the import script above. 2 ready videos were left.

## Where the private working files are (all gitignored, never commit)

- `data/ops-work/` per topic (ticket helpers in `ticket-helpers/`, staff and student records, backups of sheets and invoices under `backups/`).
- `data/youtube/` (dataset, ledgers with the unlisted video ids). The ids must not be published.
- Credentials: `.env.local` (tokens; it now also holds cluster login variables that do not work yet). Never print them.

## Fresh checks before you start

`git status`, `git log --oneline -5`, the Vercel deployment state, Sentry unresolved issues, `node data/ops-work/ticket-helpers/lt2.mjs`
(open tickets). Numbers in this file drift; trust the live system over this page.
