# Testing pattern used throughout: disposable accounts, always cleaned up

**Applies to:** every Playwright/curl verification this session (dozens of
test attempts against `mcq_attempts`/`syllabus_completions`).

Never test against a real student account. Pattern used consistently:

1. Create a disposable account with a clearly-fake, greppable ID/name —
   either `ZZTEST <purpose>` (via the real `dcp1 users create` CLI, matching
   the repo's existing `ZZZ_`-prefixed test-fixture convention already
   visible in production, e.g. `ZZZ_UITest_Timestamps`, `ZZZ_NPC_TestStudent`),
   or an ad-hoc `STU-<PURPOSE>` string when the test only needs the
   `?account=`/`&name=` URL params and never touches the main app's real
   `users` table at all (most `mcq_attempts`/`syllabus_completions` test
   rows this session used this second form, since those tables have no
   foreign key to `users`).
2. Run the real test.
3. **Delete the test rows immediately after**, via direct
   `DELETE FROM mcq_attempts WHERE account_id = '...'` through the Supabase
   Management API (safe here specifically because these are the
   independent, non-collections tables from
   `15-keep-prototype-tables-independent-of-main-app-db.md` — this is not a
   blanket exception to the "no direct DB writes" rule for the main app's
   real collections).
4. For a real `users`-table test account (the `ZZTEST` form), deactivate
   rather than delete (`status: "Inactive"`) — matches the existing
   `ZZZ_`-prefixed fixtures already left in production.

Skipping step 3 was caught and corrected multiple times this session — test
rows left in `mcq_attempts` would otherwise permanently pollute the real
leaderboard/history views with fake accounts like "Tier Test" or "Feat Test".
