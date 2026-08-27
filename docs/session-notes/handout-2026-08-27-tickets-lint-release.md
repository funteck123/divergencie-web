# Session handout: real-ticket audit, lint cleanup, release process fix (2026-08-27)

Written for whichever agent picks up this project next. Read fully before touching anything. Also
read the auto-memory index (`MEMORY.md`) — several standing rules apply regardless of task, and
[reference_credential_locations.md](../../study/agent-notes/) (see below) covers where tokens live.

## What changed this session (chronological, latest last)

1. Fixed 13 real, user-reported bugs (own ad-hoc "TKT-0125"–"TKT-0150" numbering, **not** the
   app's real ticket IDs — see the collision warning below), spanning Billing, Pipeline, Accounts,
   mobile layout.
2. Audited commit/release discipline against `CONTRIBUTING.md` — found hand-writing
   `CHANGELOG.md` all session was a real deviation from this repo's own documented process
   (`npm run release` / `commit-and-tag-version` is supposed to generate it from commit messages).
   Backed up the hand-written file to `backups/CHANGELOG.pre-v0.2.0.<timestamp>.md`, then ran the
   real release: **package.json is now 0.2.0**, tag `v0.2.0` exists locally.
3. Audited every table in the Management dashboard for search/sort coverage (a direct user
   question, not assumed) — added missing search+sort to Attendance Conflicts, Pending Reschedule
   Requests, Existing Guides, and made Invoices/Paychecks' person-order sortable (was hardcoded
   alphabetical). Deliberately left some columns unsortable where a row can expand into multiple
   nested values (Services' Rate/Occurrences, Pipeline's action columns) — not oversights.
4. Checked the app's own **real** ticket system (`GET /api/tickets`, Management-only) rather than
   assuming my own session numbering was the full picture: 127 total tickets, only 5 actually open
   (the real field is `ClosedAt`, empty = open — a `Status`/`State` guess undercounts wildly wrong
   the other way, first pass said 127 "open"). Closed one real ticket (`TKT-0150`, distinct ID
   space from my session's own "TKT-0150") via the app's own API after confirming its fix was
   live.
5. Fixed all 11 pre-existing `react-hooks/set-state-in-effect` ESLint errors: 1 was a real bug
   (state derived from state via an Effect, in Services' Create Service form — fixed by computing
   at render time instead), 10 were the standard mount-fetch pattern falsely flagged by a noisy
   React Compiler lint rule (documented with inline `eslint-disable-next-line` rather than
   silently suppressed or architecturally reworked). `next build` confirmed clean.

## ⚠️ Naming collision to know about

This session used "TKT-0124" through "TKT-0150" as its **own** informal numbering for tracking
work within the conversation. The app's **real** ticket system (Supabase `tickets` collection,
`GET /api/tickets`) independently has its own tickets numbered the same way, created by real
users through "Report an Issue." These are two different ID spaces that happen to overlap
numerically — confirmed genuinely confusing mid-session. When anyone says "TKT-0150," check which
one is meant before acting.

## Current git/deploy state (verify fresh — this drifts fast)

```
git log --oneline origin/main..HEAD    # 5 commits ahead of origin/main as of this handout
git tag -l                             # v0.1.0, v0.1.1, v0.2.0 (v0.2.0 not yet pushed)
```

**Nothing has been pushed since `push` was last explicitly requested and confirmed mid-session**
(that earlier push landed `35ed6d4..8405ce4`). The 5 commits since then, including the `v0.2.0`
release commit/tag, are local only. Pushing requires `--follow-tags` to bring the tag along:
`git push --follow-tags origin main`. This auto-deploys to production — confirm with the user
first, same standing rule as always.

## Known untracked cruft (not this session's work — investigate before touching)

`git status` shows `.agents/`, `.claude/`, `app/api/npc/`, `lib/npc-browser/`, `lib/npc/`,
`prototypes/exam-grader/`, `prototypes/quiz-digitizer/`, `skills-lock.json`, and an older handout
file, all untracked and unexplained by this session. Left alone deliberately — see
[study/agent-notes/11-transition-from-prototype-to-main-app.md](../../study/agent-notes/11-transition-from-prototype-to-main-app.md).

## Access & credentials

Full detail in the `reference_credential_locations` memory (auto-loaded) and
[study/agent-notes/10-dev-server-open-close-login-cli.md](../../study/agent-notes/10-dev-server-open-close-login-cli.md).
Short version: `GITHUB_TOKEN` in `.env`, `SUPABASE_ACCESS_TOKEN`/`VERCEL_API_TOKEN`/
`V7_SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — check these before asking the user for a
credential again. Never touch a real account/record for testing; create a disposable Management
account via direct Supabase insert, log in through the real `/api/login`, delete it when done —
full recipe in note 10 above.

## Process going forward

- **Don't hand-write `CHANGELOG.md` per-commit anymore.** Write good Conventional Commit
  messages; run `npm run release` when actually cutting a version.
- **Re-query the real ticket system**, don't trust a prior session's own informal numbering, when
  asked "what's open" or "what tickets remain."
- Every git push is a production deploy. Always confirm before pushing, even when it feels like a
  natural continuation of already-approved work.
