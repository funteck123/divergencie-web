# Split commits by tool/concern even when built in the same turn

**Applies to:** the whole feature's commit history (`git log` shows ~15
separate commits for what could have been one).

Even when a single turn built the same feature (e.g. "add Chapter tier") for
both `mcq-digitizer` and `syllabus-digitizer` back to back, each tool got
its own commit (`8cc6121` for MCQ, `64e83d0` for syllabus), plus a separate
trailing `docs(planning): ...` commit recording the architecture decision in
`planning/mcq-digitizer-integration-plan.md`. Robustness fixes found via
self-audit got their own commit separate from the feature commit that
prompted the audit.

**Why this mattered in practice**: it kept `git log` genuinely useful for
finding when a specific fix landed (e.g. `07-null-score-coerces-to-zero-in-js.md`
traces to exactly one commit, not buried inside an unrelated feature diff),
and made it possible to `git revert` one tool's change without touching the
other if something broke. Matches this repo's existing Conventional Commits
discipline (see `AGENTS.md`/`CONTRIBUTING.md`) — one logical change per
commit, not "everything from this session" as one lump.
