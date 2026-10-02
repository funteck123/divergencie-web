# New UI, Phase 0 report (2026-10-02)

Ticket TKT-0322. Branch `new-ui` (local, not pushed). The classic UI is unchanged except 5 added lines in two files.

## Exit criteria

| Criterion | Result | Evidence |
|---|---|---|
| Manifest of the classic UI committed | Met | `planning/parity/classic-*.json`: 595 controls, 153 API calls, 28 files. `npm run parity:check` detects drift. |
| Toggle works both ways with an empty new UI | Met | Playwright on a production build: classic header shows "New UI (Beta)", click saves `{"preference":"next"}` and opens `/v2`; "Classic UI" saves `{"preference":"classic"}` and returns to `/dashboard/management`. Anonymous `/v2` goes to `/login`. A Teacher opening `/v2` goes to `/dashboard/teacher`. No page errors. Script: `ui2/testing/toggle-e2e.py`. Screenshots in `snapshots/` (git-ignored folder). |
| Budgets measured | Met | `planning/perf/baseline-2026-10-02.md` (below). |
| Guard test green | Met | `npm run guard:classic`: OK. 6 guard tests pass. A probe that edits a classic file fails the guard. |
| User approves the CONFIRM answers | Open | Needs the user. |

Other checks run after the last change: `npm test` 50/50, `npx vitest run` 9/9, `npm run typecheck:ui2` clean, eslint clean on all new files, `npx next build` passes (`/v2`, `/v2/system`, `/api/me/ui-preference` in the route list).

## What Phase 0 built

- Tokens from one palette file, with a WCAG AA contrast test (`ui2/styles`), `DESIGN_RULES.md`.
- Logo set with the partner banner cropped off (`public/ui2/logo`).
- Parity extractor, coverage report and manifest (`ui2/testing`, `planning/parity`).
- Classic-files guard (`scripts/guard-classic.mjs`).
- Data layer: typed `apiFetch`, TanStack Query defaults, optimistic helper, fake API (`ui2/queries`).
- Global toggle: `lib/uiPreference.js`, `PATCH /api/me/ui-preference`, `UiSwitchButton`, two classic hooks.
- New side: `/v2` layout, 56 px top bar shell, `Button` and `IconButton`, component gallery at `/v2/system`.

## Endpoint baseline (production, from the build machine)

| Endpoint | Median ms | KB |
|---|---|---|
| `/api/users` | 252 | 15.7 |
| `/api/services` | 255 | 68.7 |
| `/api/enrollments` | 250 | 6.6 |
| `/api/invoices` | 250 | 12.9 |
| `/api/paychecks` | 262 | 10.0 |
| `/api/schedule` | 284 | 217.1 |
| `/api/tickets` | 654 | 247.4 |
| `/api/auditlog?limit=50` | 288 | 42.3 |
| `/api/regforms` | 272 | 7.0 |
| `/api/leads` | 238 | 1.0 |
| `/api/guides` | 253 | 0.7 |

Reading: nearly every call costs about 250 ms regardless of size, so the floor is network round trip plus function start, not payload. Consequences for the build: never chain requests (fetch in parallel), prefetch on link hover, keep cached data on screen while refreshing (staleTime 30 s). `/api/tickets` (654 ms, 247 KB) and `/api/schedule` (217 KB) are the two heavy calls. Candidates for later: a paged or filtered tickets call (additive API only).
`/api/me` returned 404 "User not found" for the CLI key's identity, so it was not timed. Pre-existing and unrelated to this work.

## Five-lens review of the Phase 0 code

Scorecard (honest, from what was observed): Correctness 90, Robustness 82, Architecture 88, Security 90, Completeness 80. Overall about 86.

- [MEDIUM] [MISSING] No route-level test for `PATCH /api/me/ui-preference`. The validation logic is unit-tested (`lib/uiPreference.test.js`) and the route was exercised only with a mocked API in the browser. Option A: add a route test with a stubbed session and store. Option B: test it live against a disposable account in Phase 1. Default: A in Phase 1.
- [MEDIUM] [FOUND AND FIXED] Tailwind preflight outranked all new-UI styles. Cause: the site flattens `@layer` (TKT-0262), which leaves preflight at specificity (2,0,1). Fix and rule recorded in `DESIGN_RULES.md`. Every new stylesheet must follow it.
- [MEDIUM] [ARCHITECTURE] The session guard is client-side (`RequireUser`), same as the classic dashboards. The API still enforces real permissions. A signed-out visitor sees a skeleton for one frame before the redirect. Accepted: same model as classic.
- [LOW] [ASSUMPTION] `NEW_UI_ROLES` is `["Management"]`. Other roles get no switch button and are redirected from `/v2` to their classic home. Widened per role as each role's screens ship.
- [LOW] [ASSUMPTION] Switching back to classic goes ahead even if saving the preference fails, so nobody is trapped in the Beta. The next login then still reads the old preference.
- [LOW] [MISSING] No navy logo exists in the artwork. Light surfaces use the near-black logo. Ask the brand owner for a navy file if wanted.
- [LOW] [DEPENDENCY] `@tanstack/react-table` 9.2.4 is a new major version; its API differs from v8 examples. Read the installed types before the first table (Phase 1).
- [PRE-EXISTING] `npm audit` shows 22 vulnerabilities, including `next` and `sharp` in production dependencies (23 before this work). Suggest a separate ticket; not changed here.
- [LOW] Dev-server compiles stalled for over 20 minutes when the machine was overloaded by another process. Not a code fault. Production build and start were fast.

## Decisions still open (defaults apply unless the user says otherwise)

Services tree view plus the 7B switcher; billing modes (Table default, By person, By month, By due date, By status lanes); Audit page sizes 25/50/100/200; Question Solver Q2 = 2A and Q3C dropped; Merriweather not used.

## Next

Push approval for branch `new-ui` is needed before it leaves this machine. Pushing `new-ui` does not deploy production (only `main` does), but it is outward-facing, so it waits for the user. Then Phase 1: shell, tabs, Accounts table.
