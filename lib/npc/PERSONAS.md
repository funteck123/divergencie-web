# NPC personas and what they can do (v1 status, 2026-08-23)

Written answer to: what personas exist, what can each one do, and do they reach every part of
the app. Short answer to the last question: no, not yet, see the coverage table at the bottom.

## The 3 personas that exist right now

| Persona | File | Real account | Purpose |
|---|---|---|---|
| ZZZ_NPC_TestStudent | `state/npc-0001-teststudent.json` | `STU-0026` (disposable test Student) | Daily-loop proof: check schedule, log attendance, report an issue if something's wrong, view guides. |
| Management-Sim | `state/npc-0002-management.json` | `MGT-0001` (the operator's own real Management account) | Plays the Management role: reviews and approves pending registrations every day. Not a disposable account, it's the real one already used for admin work. |
| ZZZ_NPC_TrialApplicant | `state/npc-0003-trialapplicant.json` | started with none, now `TRL-0013` | Full-lifecycle proof: applies with no account, waits for Management-Sim to approve, claims its own real login, requests a Trial slot. |

All three ran successfully just now (`POST /api/npc/tick`, no errors), confirmed live, not just in
theory. Full run log for each is in its own state file's `state.log` array, each entry now stamped
with a real ISO timestamp (`2026-08-23T...Z`), not just a date, fixed this pass since the older
format only recorded the day, not the time.

## What each persona can actually do (the shared action library, `actions/`)

Any persona can be scripted to use any of these 14 actions, they're not persona-specific code,
just which script points a persona at which ones:

**Self-service** (works for whichever account type the real route allows):
`check_schedule`, `log_attendance`, `submit_feedback` (files a real ticket), `apply_registration`
(the one action with no account yet), `claim_account_credentials`, `request_slot` (Trial or
Interview), `upload_interview_profile`, `submit_interview_task`, `accept_interview_offer`,
`submit_trial_feedback`, `mark_invoice_paid` (real file attachment), `mark_paycheck_received`,
`request_reschedule`, `view_guides`.

**Management-only**: `review_registrations`, `review_schedule_requests`, `send_interview_offer`,
`convert_account`, `close_ticket`.

## Coverage: does this reach every part of the app?

No. Mapped against the actual role/action study from earlier this session:

| Area | Covered | Not covered yet |
|---|---|---|
| Generic (login, schedule check, attendance, tickets) | Yes | |
| Trial applicant lifecycle | Yes, proven end to end | |
| Interview applicant lifecycle | Actions written | Never run live: no NPC has gone through upload-resume through offer-accept yet |
| Money (invoices/paychecks) | Actions written | Never run live: `mark_invoice_paid`/`mark_paycheck_received` untested against a real invoice/paycheck |
| Guides | Yes, verified live | |
| Reschedule requests | Action written | Never run live, needs a real enrolled session |
| Management: registrations | Yes, verified live | |
| Management: scheduling requests | Action written | Never run live (no pending requests existed when written) |
| Management: interview offers, ticket closing, conversion | Actions written | Never run live |
| Teacher/Staff/Ambassador-specific actions beyond attendance+paycheck | No | Nothing built for Services/Enrollments management, Staff departments, Batches |
| Parent-specific actions | No | Nothing built (viewing a linked child's data, etc.) |
| Services, Enrollments, Users management (the deep Management CLI surface) | No | Not scripted into any action yet |

So: broad *code* coverage across the main student/applicant/money/management surface, but real
*live-verified* coverage is narrower, several written actions have never actually been run against
the live app yet. That distinction matters, "written" isn't the same claim as "proven."

## Engine-level guarantees (added after a `/swe` review, all live-verified, not just reasoned about)

- **Crash isolation**: one NPC hitting a broken step (malformed condition, network failure) no
  longer takes down the rest of the batch. Forced live: `ZZZ_NPC_TestStudent` crashed on a
  deliberately malformed condition (`crashed: true`, error logged with a timestamp), while
  `Management-Sim` and `ZZZ_NPC_TrialApplicant` both completed normally in the *same* tick call.
- **Concurrency safety**: two overlapping ticks on the same NPC no longer race. Forced live: two
  simultaneous requests against `Management-Sim` produced exactly 2 new log entries (6 to 8, not
  6 to 7), both timestamps captured, neither write lost.
- **Path traversal closed**: `npcFile` is restricted to bare filenames. Live-verified:
  `../../../../etc/passwd` returns a clean 400, nothing outside `lib/npc/state/` was touched.
- **Typo'd flag names now surface**: an unrecognized flag in a script's `if`/`waitUntil` produces a
  timestamped warning in `state.log` instead of silently evaluating false forever. Live-verified
  with a deliberate `hasAcount` (missing a `c`) typo.
