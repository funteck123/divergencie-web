# Leaderboard/progress is four tiers, not one

**Commits:** `8cc6121`, `64e83d0`, `74049ba`.

Both `mcq-digitizer` and `syllabus-digitizer` score/completion tracking uses
the same tier hierarchy, broadest to narrowest:

- **Overall** — every account, every subject, combined.
- **Subject** — e.g. "IGCSE Physics".
- **Chapter** — e.g. "1.1" (MCQ) or a top-level topic node (syllabus).
- **Paper** — MCQ only, one specific worksheet. Syllabus has no paper concept.

Each tier scopes the ranking to accounts that actually have activity at that
level — a Subject-tier ranking only ever contains accounts with attempts in
that subject, by construction, not by a separate filter step. See
`02-overall-tier-excludes-avg-percent.md` for why Overall's ranking math is
deliberately different from the other three.
