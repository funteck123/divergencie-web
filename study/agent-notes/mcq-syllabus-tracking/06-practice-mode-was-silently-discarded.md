# "Done practicing" used to just throw the session away

**Commit:** `007fa29`. **Reported by the user** ("practice sessions also get
logged btw when you click submit practice") after Test-mode tracking already
shipped and looked complete — it wasn't.

Practice mode has no grading by design (see `server.mjs`'s own header
comment: MCQ grading is deterministic text-matching, and Practice mode's
whole point is browsing without a score). Before this fix, clicking "Done
practicing" called `resetToLibrary()` directly with no POST at all — the
session vanished, nothing recorded.

Fix added a nullable `mode` column (`'test'` default, `'practice'`
explicit) and made `score` nullable (`data/tmp/migration_mcq_practice_mode.sql`).
`totalQuestions` is still captured for a practice session (`quiz.length` —
the paper's real length is known even without grading); `score` is always
`null` for `mode: 'practice'` regardless of what the client sends.

**The trap this avoided finding out the hard way**: null score can't just be
treated as 0 anywhere downstream. See
`07-null-score-coerces-to-zero-in-js.md` for the specific JS bug this would
have caused in the chart, and `01-four-tier-leaderboard-architecture.md`'s
sibling note on why `rank()` excludes practice rows from every
accuracy-based tier entirely rather than counting them as failures.
