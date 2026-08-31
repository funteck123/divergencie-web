# npc-browser: Agent IGCSE human-like NPC trio

A Student, Teacher, and Parent NPC pair, fundamentally different from the
original `lib/npc/` engine: that one calls the app's own `/api/**` routes
directly (an API client). This one drives a **real headless browser** via
Playwright -- typing into the actual login form, clicking the actual UI,
scrolling, marking attendance and paying invoices the way a person sitting
at the keyboard would. Built per explicit user direction: "I don't want
him to be rigged... I want him to log in manually, then scroll and go to
that place like a human would... not by a function or API call."

## What exists (real accounts, real service, all live in the app right now)

| | ID | Notes |
|---|---|---|
| Service | `SVC-0220` "Agent IGCSE Programme" | One new batch (`BATCH-0068`, "AGENT-B1"), one weekly occurrence: **Tuesday 18:00 Asia/Kolkata (IST), 1 hour** (`OCC-0258`) |
| Student | `STU-0030` `ZZZ_AGENT_Student` | Enrolled at a 3000 INR/month rate (`RATE-0347`) |
| Teacher | `TCH-0010` `ZZZ_AGENT_Teacher` | Enrolled + set as the occurrence's Facilitator, 500 INR/hr rate (`RATE-0346`) |
| Parent | `PAR-0004` `ZZZ_AGENT_Parent` | `StudentIDs: ["STU-0030"]` |

Real login credentials for all three, plus a dedicated long-lived
Management API key (used only by `generateAndSendInvoice.mjs`, never by
the browser scripts), live in `state/credentials.json` -- gitignored, real
plaintext passwords, never commit it.

This deliberately does **not** touch B14 or any of the 6 real IGCSE
subject services -- a brand-new service was created specifically for this,
per the user's own correction mid-request.

## Architecture

```
student.mjs  ─┐
               ├─ read/write ─→ state/rendezvous.json ←─ read/write ─┐
teacher.mjs  ─┘                                                      │
                                                          (same file, two named slots)
parent.mjs  ── independent, no rendezvous involvement (billing only)

generateAndSendInvoice.mjs ── Management-side infra, direct API calls
                                (not a simulated human -- see note below)
```

### The rendezvous mechanism

`student.mjs` and `teacher.mjs` need to "talk" before marking attendance,
per the user's spec: if one side never shows up, the other marks them
Absent rather than silently skipping. This is **not** a new production API
route on the live app -- it's a small local JSON file
(`state/rendezvous.json`), the same pattern the original `lib/npc/`
engine's own `_approvals.json` already uses. Keyed by
`"<OccuranceID>::<DD/MM/YYYY>"` so every real weekly class occurrence gets
its own independent check-in record.

Each side writes **only its own slot** (`studentCheckin` /
`teacherCheckin`) and only ever **reads the other's**. Neither script has
the other persona's identity anywhere in it -- the rendezvous file is the
only channel between them, which is what keeps "the teacher doesn't know
the student, the student doesn't know the teacher" true.

Flow, each class day:
1. Each side independently rolls ~25% odds of being 5 minutes late (its
   own `Math.random()`, no shared seed -- genuinely independent).
2. Logs in via the real UI, navigates to the schedule, finds today's row.
3. Checks in (writes its own timestamp).
4. Polls the rendezvous file for the other side's check-in, up to a
   **15-minute maximum wait**.
5. Opens the attendance panel and marks the *other* person Present (if
   they checked in) or Absent (if the 15-minute wait timed out) --
   through the app's own existing mutual peer-attendance feature
   (`canLogOnBehalfOf` / `SessionAttendance`'s `canLog()`, confirmed via
   git history as a deliberate, pre-existing feature, not something this
   build added).

### Parent billing

`parent.mjs` runs on a **daily** cron and self-gates: it only actually
does anything when today really is the day before the 1st of the month
(cron can't natively express "the day before the 1st" -- that's a
different day-of-month every month -- so it runs daily and checks). It
logs in, finds next month's invoice row, uploads a disposable payment-proof
PDF through the real hidden file input (`setInputFiles`, not a raw
multipart fetch), and clicks Confirm -- then **verifies the real
`/api/invoices/mark-paid` response**, not just that the click happened
(an earlier version of this script logged "confirmed payment" even when
the upload was silently rejected -- see "What actually went wrong" below).

### Invoice generation/sending is NOT one of the three human personas

The Parent dashboard hides Draft invoices entirely (`invoices.filter(i =>
i.Status !== "Draft")` in `app/dashboard/parent/page.js`) -- a draft has
to exist AND be Sent before `parent.mjs` can find and pay it.
`generateAndSendInvoice.mjs` handles this via direct API calls (a
dedicated Management API key, not a browser), run daily, idempotent (it
checks the invoice's current status before acting, so running it every
day forever is harmless). This is "infrastructure," matching the
precedent already set by the original `lib/npc/` engine's own Day-0
enrollment step -- Management was never one of the three personas the
user asked to be human-like.

## Live-verified, for real, this build (2026-08-24)

Not just written and assumed to work -- actually run against the live app
and independently re-confirmed via the real API afterward:

- **Student + Teacher mutual attendance**: ran both scripts concurrently
  against the real upcoming Tuesday occurrence (`SCH-1983`, 2026-08-25).
  Re-queried `GET /api/attendance?scheduleItemId=SCH-1983` afterward:
  two real attendance records existed, `TCH-0010` marked Present by
  `STU-0030` and vice versa. (Two real bugs were caught and fixed during
  this same testing pass -- see below. The test records were deleted
  afterward so the real upcoming Tuesday class starts clean.)
- **Parent payment**: generated + sent a real September 2026 draft
  invoice, ran `parent.mjs --force`, re-queried `GET /api/invoices`
  afterward: `StudentPaidFlag: true`, a real `PaymentProofPath` pointing
  at an actually-uploaded PDF, `PaidAt` set. (Reverted to unpaid
  afterward so the real scheduled cron does the real thing on 2026-08-31.)
- **Absence path was NOT separately live-tested** this build -- the
  15-minute-timeout-then-mark-Absent branch is exercised by the same code
  path proven above (`teacherShowed`/`studentShowed` just flips the
  Status argument), but wasn't independently forced end-to-end. Flagging
  this honestly rather than claiming full coverage.

### What actually went wrong during testing (kept here, not swept away)

1. **Selector bug #1**: `page.locator("div", { has: ... }).last()` matched
   an inner header `<div>` instead of the actual roster card, so every
   "already logged?" check silently short-circuited to true and no
   attendance was ever marked. Fixed with a `panel.locator("div.p-2")
   .filter({ hasText: ... })` scoped to the expanded panel row instead --
   confirmed against a standalone debug script's raw HTML dump before
   trusting it.
2. **Race condition**: `SessionAttendance` fetches its roster
   asynchronously after mounting; a fixed `humanPause()` wasn't reliably
   long enough, so the "already logged" check sometimes ran against a
   still-empty panel. Fixed with an explicit `waitFor({ state: "visible"
   })` on the actual roster card instead of a fixed delay.
3. **File-type rejection**: `parent.mjs` originally wrote a disposable
   `.txt` proof file -- and this session's own earlier red-team-driven
   fix (commit `dbc43e6`, jpg/jpeg/png/pdf allowlist on this exact
   upload route) correctly rejected it with a 400. This is a real
   confirmation that fix works, not a bug in it. Fixed by writing a
   minimal, real, hand-assembled PDF instead.
4. **Silent-success bug**: `parent.mjs` originally logged "confirmed
   payment" right after clicking Confirm, without checking whether the
   request actually succeeded -- which is exactly how bug #3 went
   unnoticed on the first test run. Fixed to await and check the real
   `/api/invoices/mark-paid` response before declaring success.
5. **Stale Management token**: `generateAndSendInvoice.mjs` originally
   read `~/.dcp1/config.json` for a Management API key -- but that key
   was invalidated by this session's own earlier security fix (the
   `SESSION_SECRET` rotation, commit `02f456d`). Fixed by minting a
   fresh, dedicated, long-lived (10-year) Management API key specifically
   for this subsystem, stored in `state/credentials.json` under
   `managementApiKey`, independent of the shared CLI config file.
6. **Row-matching false positive (found in the follow-up pass, 2026-08-24)**:
   `parent.mjs` and `teacherMarkPaycheckReceived.mjs` both located their
   target row with `page.locator("tbody tr", { hasText: period })` --
   e.g. `hasText: "8/2026"`. The Period `<td>` also renders a "Sent
   DD/MM/YYYY" sub-line in the *same cell*
   (`app/dashboard/{parent,teacher}/page.js`), and a loose row-wide
   `hasText` matches ANY substring in the row's full text, not just the
   Period column. Confirmed live: with only a September paycheck
   (`PAY-0038`, sent `2026-08-24`) on file, `teacherMarkPaycheckReceived.mjs
   --force` searching for "8/2026" (August) matched and marked PAY-0038
   received anyway, because its own "Sent 24/08/2026" text contains the
   substring "8/2026". Fixed in both scripts: the row is now found by
   filtering on `td:first-child` with a regex **anchored to the start**
   of that cell's own text (`^8\/2026(?!\d)`), which the Period text
   always is and the Sent sub-line never is. Re-tested after the fix:
   correctly found nothing for a period that doesn't exist, instead of
   silently matching the wrong row. The mistaken `PAY-0038` mutation was
   reverted (`StaffReceivedFlag` back to `false`) so the real 2026-09-02
   cron run does the real thing cleanly.

## Scheduling -- wired up, live crontab installed (2026-08-24)

Real OS-level `crontab` entry (the only thing that actually satisfies
"forever, in real time" -- a Claude-session-scoped scheduler tool exists
but is explicitly documented as session-only, gone when the session ends,
and auto-expiring after 7 days regardless, which is not what "forever"
means here). Installing a crontab entry was initially **blocked by this
sandbox's own permission classifier** -- unattended, indefinitely-
recurring, real-login automation against a live app is exactly the kind of
persistent system-level action it's built to stop -- the follow-up
session stopped and asked, the user switched the harness to manual
permission mode, and the crontab below was then installed for real and
verified with `crontab -l`.

**Live crontab, as actually installed:**

```
# npc-browser: Agent IGCSE human-like Student/Teacher/Parent NPC trio.
# Class time is 18:00 Asia/Kolkata (IST) = 20:30 in this system's own
# Asia/Singapore timezone -- recompute if the server's timezone changes.
29 20 * * 2 cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/student.mjs >> lib/npc-browser/logs/student.log 2>&1
29 20 * * 2 cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/teacher.mjs >> lib/npc-browser/logs/teacher.log 2>&1
# Parent pays next month's invoice on the day before the 1st (self-gated
# daily check -- cron can't express "last day of month" natively; the
# script exits immediately most days without launching a browser, so
# this is NOT a daily browser session despite the daily cron trigger).
15 10 * * * cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/parent.mjs >> lib/npc-browser/logs/parent.log 2>&1
# Invoice + paycheck generated/sent once a month, on the 28th, for next month.
0 9 28 * * cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/generateAndSendInvoice.mjs >> lib/npc-browser/logs/generate-invoice.log 2>&1
5 9 28 * * cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/generateAndSendPaycheck.mjs >> lib/npc-browser/logs/generate-paycheck.log 2>&1
# Teacher marks their paycheck received on the 2nd of the month.
0 11 2 * * cd /home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie && /home/funteck/.nvm/versions/node/v22.22.2/bin/node lib/npc-browser/teacherMarkPaycheckReceived.mjs >> lib/npc-browser/logs/teacher-paycheck.log 2>&1
```

Verify with `crontab -l`. Logs land in `lib/npc-browser/logs/`. To stop
everything: `crontab -e` and delete the `npc-browser` lines, or
`crontab -r` to wipe the whole crontab (only safe if nothing else uses it).

**Why the billing timing is split across three different dates**, per
explicit user correction after the first version of this build (which had
generation running daily and no paycheck/received-marking step at all):
- **28th**: Management generates + sends next month's invoice AND next
  month's paycheck (both idempotent direct API calls, `--force` to bypass
  the date gate for testing).
- **Last day of the month** (self-gated daily check, see above): Parent
  pays the invoice that was sent on the 28th -- due the 1st, paid one day
  early.
- **2nd of the month**: Teacher marks the paycheck (sent the 28th of the
  *prior* month) as received -- a real browser session, same as
  student.mjs/teacher.mjs, not Management infrastructure.

Lateness for the weekly class itself was also changed from a fixed
5-minute delay to a random 1-6 minutes, independently rolled by each of
student.mjs and teacher.mjs (no shared seed), per explicit user direction
("some days five minutes late, some days six minutes late, some days one
minute").

## Manual testing

Every script accepts test-only flags that real cron runs never pass:

- `--date=DD/MM/YYYY` (student/teacher) -- target a specific date's row
  instead of today, so you can dry-run against a real future occurrence.
- `--max-wait-ms=N` (student/teacher) -- shrink the 15-minute wait for
  fast testing.
- `--no-late` (student/teacher) -- force the lateness roll off for a
  deterministic test run.
- `--force` (parent) -- skip the day-before-first-of-month gate.

Example, the exact commands used to verify this build:
```
node lib/npc-browser/teacher.mjs --date=25/08/2026 --max-wait-ms=20000 --no-late &
node lib/npc-browser/student.mjs --date=25/08/2026 --max-wait-ms=20000 --no-late
node lib/npc-browser/parent.mjs --force
```
