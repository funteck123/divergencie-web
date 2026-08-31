# NPC engine, v1 (no LLM)

Deterministic, script-driven bots that use the real DivergenCIE app through its own API, exactly
like a real user's browser would, no AI/LLM involved in this phase. Persistent (state lives in a
JSON file per NPC), triggered manually or via cron by calling one API route.

## Files

- `lib/npc/actions/http.js`: shared HTTP plumbing (`callApi`, `callApiForm`, `callChecked`,
  `mintApiKeyFromCredentials`), plus `evalCondition()`, a tiny, safe `==`/`!=`-only condition
  evaluator (no `eval()`, no arbitrary expressions).
- `lib/npc/actions/self.js`: self-service action handlers (any account type the real route allows).
- `lib/npc/actions/management.js`: Management-persona-only action handlers.
- `lib/npc/actions/index.js`: merges both into the `ACTIONS` table `engine.js` expects, re-exports
  `evalCondition`. Split into these 4 files from one `actions.js` after a `/swe` review flagged it
  trending toward a God-module; `callChecked` also came out of that review, replacing ~14 near-
  identical hand-written "not ok -> report an issue" blocks.
- `lib/npc/actions/flagSchema.js`: `KNOWN_FLAGS`, a flat registry of every flag name any action
  actually sets, checked once per NPC per tick against every `if`/`waitUntil` in that NPC's script.
  An unrecognized flag name (a typo) becomes a visible warning in `state.log` instead of silently
  evaluating false forever, live-verified: a deliberate `hasAcount` typo produced exactly that
  warning, timestamped, on a real tick.
- `lib/npc/actions/*.test.js`: `node --test` suite (`npm test`), no new dependency, covers
  `evalCondition` and `callChecked` against a mocked `fetch`.
- `lib/npc/engine.js`: loads a persona/script/state file, runs whatever steps are due as of today,
  saves state back. Per-file in-process lock (`withFileLock`) serializes overlapping ticks on the
  same NPC, live-verified against two genuinely concurrent requests (log went from 6 to 8 entries,
  not 7, both timestamps captured, no write lost). Per-step try/catch means one NPC crashing
  (malformed condition, a network failure) no longer kills the rest of the batch, live-verified:
  a forced crash on one NPC left `crashed: true` + a timestamped error in its own log, while the
  other two NPCs in the same batch call completed normally.
- `lib/npc/state/`, **gitignored**, one JSON file per NPC. Each file embeds that NPC's own
  live API key, treat these exactly like `planning/keys.md`, never commit one. `npcFile` values are
  restricted to bare `<word-chars>.json` filenames (`resolveNpcPath` in `engine.js`) -- a `/swe`
  review CRITICAL finding: an unvalidated `npcFile` let a caller path-traverse outside this
  directory for both reads and writes. Live-verified closed: `../../../../etc/passwd` now returns
  a clean 400, not a 500, and nothing outside `state/` was touched either time.
- `app/api/npc/tick/route.js`: Management-only POST route, the trigger. `{}` ticks every NPC,
  `{ "npcFile": "foo.json" }` ticks just one.

## Script/state file format

```json
{
  "npcId": "NPC-0001",
  "persona": { "name": "...", "role": "Student", "country": "...", "background": "...", "personality": "..." },
  "account": { "userId": "STU-xxxx", "apiKey": "<a real dcp1 API key for this account>" },
  "script": {
    "startDate": "2026-08-01",
    "steps": [
      { "id": "s1", "dayOffset": 0, "action": "check_schedule", "if": null, "params": {} },
      { "id": "s2", "dayOffset": 0, "action": "log_attendance", "if": "hasClassToday==true", "params": { "status": "Present" } },
      { "id": "s3", "dayOffset": 0, "action": "submit_feedback", "if": "issueFound==true", "params": {} }
    ]
  },
  "state": { "cursor": 0, "lastRunDate": null, "flags": {}, "log": [] }
}
```

`persona` is descriptive only in v1 (not read by any logic), kept so a human can tell which NPC is
which and so it's ready for a later, richer persona-driven phase.

`dayOffset` is measured in whole days from `script.startDate` against the real current date, so a
script can span a day, a month, or several months. Each step runs at most once, in order; a step
whose `if` evaluates false is skipped (cursor still advances), not retried later. `if` conditions
read `state.flags`, which is exactly what each action handler is free to set.

## Adding a new NPC

1. Create a real account: `node cli/dcp1.mjs users create --json '{"userType":"Student","name":"..."}'`
2. Mint it a real API key: `node cli/dcp1.mjs apikeys create --user <id> --label "..." --expires-days N`
3. Write `lib/npc/state/<name>.json` following the schema above, using that account's userId and key.
4. Trigger a run: `POST /api/npc/tick` (Management auth) with `{}` (all NPCs) or `{"npcFile": "<file>"}`.

## Adding a new action

Add a function to `lib/npc/actions/self.js` (or `management.js` for a Management-only action) with
signature `(npc, params, ctx) => { flags, log }`, export it, then wire it into the `ACTIONS` table
in `lib/npc/actions/index.js`. `ctx` has `{ baseUrl, apiKey, today, approvals }`. Prefer
`callChecked(ctx, method, path, body, actionName)` from `./http` over calling `callApi` directly --
it returns `{ failed, body }` or `{ failed, result }` (the standard issue-shape ready to return),
covering the common case; drop to `callApi` directly only when the error handling is genuinely
different (see `logAttendance`'s "already logged" carve-out or `reviewRegistrations`'s loop for
real examples of when that's warranted). If the action sets any new flag names, add them to
`KNOWN_FLAGS` in `flagSchema.js` or a script referencing them will warn as an unrecognized flag.
Never call `lib/db.js` directly, same rule as the CLI/MCP server.

## Action inventory (self-service)

Verified live unless noted. `check_schedule` &rarr; `/api/me?userId=<id>` (note the required query
param, a real bug caught during v1's first live run: 403 without it). `log_attendance` &rarr;
`/api/attendance/log`. `submit_feedback` &rarr; `/api/tickets`, only fires if a prior step set
`issueFound`. `apply_registration` &rarr; `/api/register` (the one no-API-key action, an applicant
doesn't have one yet). `claim_account_credentials` &rarr; reads the shared `ctx.approvals` ledger,
logs in + mints its own key once approved. `request_slot` &rarr; `/api/schedule/pick`, Trial or
Interview track. `upload_interview_profile` &rarr; `/api/interview-profile` (sets a Resume link,
required before an Interview `request_slot` will succeed). `submit_interview_task` &rarr;
`/api/interview-task`. `accept_interview_offer` &rarr; `/api/interview-offer` (self accept).
`submit_trial_feedback` &rarr; `/api/trial-feedback`. `mark_invoice_paid` &rarr;
`/api/invoices/mark-paid` (multipart, a real file attachment, via `callApiForm`, not yet run live).
`mark_paycheck_received` &rarr; `PATCH /api/paychecks` (flag-only, no attachment route exists for
paychecks, confirmed asymmetry, not yet run live). `request_reschedule` &rarr;
`/api/schedule/reschedule-requests` (needs a real enrolled session, not yet run live).
`view_guides` &rarr; `/api/guides`, verified live (found 4 real guides).

## Action inventory (Management-persona)

`review_registrations` &rarr; lists + approves every Pending `regForm`, writes credentials into
`ctx.approvals`, verified live end to end against a real applicant NPC (0 &rarr; account &rarr;
own API key &rarr; a real Trial request, in 2 tick calls). `review_schedule_requests` &rarr; lists
pending Trial/Interview requests, finds an open matching-Service slot via `/api/schedule`, assigns
it (tries candidates in order, a 409 just means try the next one), not yet run live (no pending
requests existed at the time this was written). `send_interview_offer`, `convert_account`,
`close_ticket` &rarr; each takes an explicit id in `params` rather than discovering its own queue,
since the real app doesn't expose a single list-everything-ready endpoint for any of the three.
None of the three run live yet.

## Explicitly NOT done yet

- No OpenRouter/LLM integration anywhere. When it's added, it should be constrained to choosing
  among a fixed set of already-defined actions (structured/tool-call output only, never freeform
  text), for randomization where a script step genuinely offers a choice, not for writing prose or
  making unconstrained decisions.
- No automatic scheduler/cron wired up yet, `POST /api/npc/tick` is manual/external-cron-only for now.
- Per explicit direction: prioritizing action-library breadth over NPC headcount right now. Only 3
  real NPCs exist (`ZZZ_NPC_TestStudent`/`STU-0026`, `Management-Sim`/`MGT-0001` reusing the
  operator's own key, `ZZZ_NPC_TrialApplicant`/now `TRL-0013`), not a full cast.
- Staff department actions, teacher/staff/ambassador-specific flows beyond attendance/paycheck, and
  Parent-specific actions (viewing a linked child's data) aren't covered by a dedicated action yet,
  though the generic ones (mark_invoice_paid, etc.) already work for any account type the real
  route itself allows.
- Plaintext API keys at rest in `lib/npc/state/*.json` (`/swe` review LOW finding): accepted for a
  local/dev-only v1 tool, same sensitivity class as `planning/keys.md`, would need addressing before
  any shared-server or production use.

## `/swe` review fix round (2026-08-23)

A five-lens review (`/swe 5 lens`) found 1 CRITICAL, 2 HIGH, 4 MEDIUM, 2 LOW findings plus 1
QUESTION against this module. Every finding was fixed and independently live-verified afterward
(not just code-reviewed) via `ai-rigor-audit`, which specifically caught that the first pass had
claimed two of the fixes "done" on reasoning alone without actually forcing the failure condition
live -- both were then genuinely tested (a forced crash, two real concurrent requests) and confirmed
working. See inline `// /swe review, <SEVERITY> finding:` comments at each fix site for the specific
finding each one addresses.
