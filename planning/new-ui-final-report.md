# New UI (Beta): final report

Ticket TKT-0322. Branch `new-ui`. Classic stays the default and is untouched except two allowed hooks (`components/DashboardShell.jsx`, `lib/client.js`), enforced by `npm run guard:classic`.

## What exists
- Every role has a new portal: Management (Accounts, Services, Enrollments, Billing, Applications, Pipeline, Schedule, Tickets, Audit Log, Guides), Student, Teacher, Staff, Ambassador, Parent, Trial, Interview, resource pages, login and register.
- Question Solver (`/v2/question-solver`) and Syllabus Viewer (`/v2/syllabus`), with a new same-origin proxy `/api/syllabus/*`. Both read and write the same data as the classic tools.
- Shell: Beta marker, Report an Issue (creates a real ticket), Install app, impersonation banner, a way back to classic, and a `/v2` error page that reports to Sentry (tag `ui: v2`).

## Evidence
| Check | Result |
|---|---|
| Parity manifest (`npm run parity`) | 595 of 595 controls mapped, each to code and a journey test |
| Unit tests | 158 vitest, 53 node tests pass |
| Browser journeys (`npm run e2e:ui2`, production build, fake data) | 16 of 16 pass |
| Production build | passes, all `/v2` routes present |
| Typecheck (`npm run typecheck:ui2`) | both tsconfigs clean. `next build` uses the looser root one, which caught one bug the strict one missed |
| Classic guard | OK |
| Accessibility and width sweep (`npm run a11y:ui2`) | axe A and AA at 390, 768, 1024, 1280, 1440, 1920 px. No findings on `/v2` pages. Only classic pages remain (its error page, button contrast) |
| Sideways scroll | none on `/v2` at any width |

## Performance (production build, fake API, `planning/perf/budgets-2026-10-02.md`)
Passed: sort 1,000 rows 66 ms, scroll 60 fps, layout shift 0.001, next quiz question 30 ms.
Not met:
- Filter on 1,000 rows: about 124 ms against 100 ms. Tables over 60 rows draw only the rows near the screen.
- JS per route: 300 to 440 KB gzip against 170 KB. About 144 KB is the site-wide Sentry bundle (framework chunk plus Replay) loaded by classic too. Reducing it means changing `instrumentation-client.js`, which affects classic. Needs your decision.

## Fixed along the way
Student report: Question Solver dropdowns closed when the phone keyboard resized the window (on `main`, 7f45863). Sweep fixes: keyboard access for scrolling tables, readable toasts and schedule chips (text colour computed from the background), grid tracks that stretched pages on phones, and a screen-reader text element escaping the table box. Proxy hardening: path allowlist, no slashes inside a path segment, account taken from the session.

## Known limits
- Ctrl-F does not find table rows that are off screen (tables over 60 rows). Use the search box.
- Journeys that drive desktop tables run from 768 px up. Phone tables are card lists, scanned by the sweep but not clicked through.
- Preview deployments share the production database.

## Needs the user
1. Decide on the Sentry bundle (site-wide, touches classic).
2. Tickets (real `/api/tickets`): `npm audit` for Next and sharp, TKT-0307, TKT-0321, and filter speed on very large tables.
3. Try the preview, then say when to merge `new-ui` into `main` (a merge deploys to production, classic remains default).
