# MCQ/syllabus score-and-completion tracking — atomic notes

27 atomic notes from the session that built score/progress/leaderboard
tracking for `prototypes/mcq-digitizer/` and `prototypes/syllabus-digitizer/`
(2026-09-02) — each MCQ attempt and each syllabus "Completed" tag now
persists to its own Supabase table, with a 4-tier (3-tier for syllabus)
leaderboard, per-subject/chapter progress charts, full attempt/completion
history, and Practice-mode logging. Full build context and current status
lives in `planning/mcq-digitizer-integration-plan.md` at the repo root —
these notes are the granular, one-idea-per-file gotchas and decisions from
building it, not a replacement for that plan doc.

## Architecture & design decisions

- [01-four-tier-leaderboard-architecture.md](01-four-tier-leaderboard-architecture.md) — Overall/Subject/Chapter/Paper, what each tier scopes to.
- [02-overall-tier-excludes-avg-percent.md](02-overall-tier-excludes-avg-percent.md) — why Overall is volume-only, never accuracy.
- [03-mcq-chapter-needs-two-regex-patterns.md](03-mcq-chapter-needs-two-regex-patterns.md) — the two title patterns that cover all 196 real papers.
- [04-syllabus-chapter-is-free-mcq-chapter-isnt.md](04-syllabus-chapter-is-free-mcq-chapter-isnt.md) — node_key vs. opaque paper_id.
- [05-by-volume-must-dedupe-by-paper-id.md](05-by-volume-must-dedupe-by-paper-id.md) — retaking a paper shouldn't inflate volume.
- [06-practice-mode-was-silently-discarded.md](06-practice-mode-was-silently-discarded.md) — the mode column and nullable score.
- [15-keep-prototype-tables-independent-of-main-app-db.md](15-keep-prototype-tables-independent-of-main-app-db.md) — why these tables bypass lib/db-supabase.js.
- [16-tunnel-url-centralized-in-one-config-row.md](16-tunnel-url-centralized-in-one-config-row.md) — the single source of truth for the tunnel URL.
- [17-pymupdf-cant-run-on-vercel-node-functions.md](17-pymupdf-cant-run-on-vercel-node-functions.md) — why extraction stays off Vercel.
- [23-flag-checkbox-is-client-only-by-design.md](23-flag-checkbox-is-client-only-by-design.md) — why "flag for review" never touches the server.

## Bugs found and fixed (real, not hypothetical)

- [07-null-score-coerces-to-zero-in-js.md](07-null-score-coerces-to-zero-in-js.md) — a practice session would have plotted as a failed test.
- [09-query-string-not-stripped-in-static-file-router.md](09-query-string-not-stripped-in-static-file-router.md) — both tools 404'd on their own tracking links.
- [10-proxy-fetch-needs-try-catch-for-tunnel-down.md](10-proxy-fetch-needs-try-catch-for-tunnel-down.md) — the exact failure mode the feature exists to survive wasn't handled.
- [11-score-bounds-validation-gap.md](11-score-bounds-validation-gap.md) — negative/over-total scores were accepted.
- [12-stacked-tables-need-shared-column-widths.md](12-stacked-tables-need-shared-column-widths.md) — sibling leaderboard tables didn't align.
- [13-quadratic-midpoint-smoothing-lies.md](13-quadratic-midpoint-smoothing-lies.md) — the first "smooth chart" attempt visually disagreed with real data.
- [24-practice-mode-timer-was-genuinely-absent.md](24-practice-mode-timer-was-genuinely-absent.md) — not hidden, not disabled — never built.

## Known, unfixed gaps

- [14-three-unaddressed-security-gaps.md](14-three-unaddressed-security-gaps.md) — accountId spoofing, cross-account history reads, incomplete enrollment scoping. Deliberately deferred, not forgotten.

## Process / environment gotchas

- [08-classifier-blocks-direct-schema-migrations.md](08-classifier-blocks-direct-schema-migrations.md) — every raw-SQL migration gets blocked, every time; this is by design.
- [18-data-already-logged-check-before-building.md](18-data-already-logged-check-before-building.md) — the attempt-history table needed zero new backend work.
- [19-password-field-was-already-fine-verify-first.md](19-password-field-was-already-fine-verify-first.md) — verify live UI state with a screenshot, not just a grep.
- [20-disposable-test-accounts-and-cleanup-discipline.md](20-disposable-test-accounts-and-cleanup-discipline.md) — never test against real students; always clean up rows after.
- [21-plaintext-secrets-in-files-trip-the-classifier.md](21-plaintext-secrets-in-files-trip-the-classifier.md) — pass credentials via env vars, never write them into a file, even a throwaway one.
- [22-playwright-first-picks-wrong-hidden-element.md](22-playwright-first-picks-wrong-hidden-element.md) — `.first()` ignores visibility across this app's multi-stage single-page tools.
- [25-not-every-real-request-has-a-ticket.md](25-not-every-real-request-has-a-ticket.md) — this whole feature has zero tickets filed.
- [26-verify-with-a-live-build-and-monitor-not-a-guess.md](26-verify-with-a-live-build-and-monitor-not-a-guess.md) — real build/restart discipline, and a Monitor-tool false-alarm gotcha.
- [27-atomic-commits-per-tool-not-one-giant-commit.md](27-atomic-commits-per-tool-not-one-giant-commit.md) — why the history is ~15 commits, not one.

## Common thread

Almost every bug in the "found and fixed" section shares one shape: a piece
of code that was correct for the assumptions true when it was first
written, and silently wrong the moment a *later* change in the same session
invalidated one of those assumptions — a nullable score added after the
chart already assumed non-null, a query string added after the router
already assumed a bare path, a second stacked table added after the first
table's width already auto-sized around only itself. None of these were
caught by reading the code again; all of them were caught by actually
running the feature end-to-end (Playwright against real seeded data, not
just curl) and looking at the result.
