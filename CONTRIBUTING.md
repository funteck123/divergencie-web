# Contributing / Release Workflow

This is the actual process to follow from now on — for you and for any
future agent session working on this repo. Background/theory is in
`study/user-notes/02-software-release-and-cicd.md`; this file is the
short, binding version.

## Commit message format (Conventional Commits)

```
<type>(<scope>): <short summary>
```

- **`feat`** — new feature or capability (`feat(tickets): add admin reopen action`)
- **`fix`** — bug fix, no new behavior added (`fix(pdf): show each line item's own currency`)
- **`docs`** — documentation only, no code change (`docs: add REQUIREMENTS.md`)
- **`chore`** — tooling, deps, config — nothing user-facing
- **`refactor`** — restructuring code with no behavior change
- **`perf`** — performance improvement, no behavior change

`<scope>` is the area touched (`tickets`, `admin`, `services`, `pdf`,
`schedule` — match what you're editing). Omit it only for repo-wide changes
(`docs:`, `chore:`) where no single scope fits.

Add a `BREAKING CHANGE:` line in the commit body for anything that changes
an existing API/behavior in a way that could break something depending on
it — this is the signal a MAJOR version bump exists for.

This repo's commit history already mostly follows this — keep it consistent
so it stays possible to automate later (see "Not yet automated" below).

## Versioning (SemVer: `MAJOR.MINOR.PATCH`)

`package.json` is currently `0.1.0` — pre-1.0, alpha, breaking changes
allowed between any release. Bump it by hand, per release, using this rule:

- Only `fix`/`docs`/`chore`/`refactor`/`perf` commits since last release → bump **PATCH**
- Any `feat` commit since last release → bump **MINOR**
- Any `BREAKING CHANGE` → bump **MAJOR** (or, pre-1.0, it's acceptable to
  treat it as a MINOR bump — SemVer explicitly allows looser rules before 1.0)
- Move to **1.0.0** deliberately, not by accident — it's a promise to users
  that breaking changes now require a MAJOR bump. Don't cross it until
  you mean it.

## Changelog

`CHANGELOG.md` has an `[Unreleased]` section — add your change there **in
the same commit/PR that makes the change**, not after the fact. On release,
rename `[Unreleased]` to the new version + date and start a fresh empty
`[Unreleased]` section above it.

## Branch/deploy workflow (current state — no CI yet)

1. Work happens in a git worktree (or a feature branch).
2. Commit there with the format above.
3. Merge into the main checkout: `git fetch <worktree-path> <branch> && git merge --ff-only FETCH_HEAD`.
4. **Never push to `origin` without asking first, and never as a default
   action after every commit.** Vercel auto-deploys `origin/main` straight
   to production the moment it's pushed — there is no staging gate and no
   CI check in front of it right now. Treat every push to `origin/main` as
   a production release, because it is one.
5. Before pushing a batch of commits: skim `git log origin/main..main --oneline`
   and make sure you're not shipping something you haven't verified.

## Not yet automated (see `study/user-notes/02-software-release-and-cicd.md` for the full plan)

- No GitHub Actions CI (lint/build check on PRs)
- No staging branch/environment
- No automated version bump or changelog generation (`semantic-release`
  would do this once Conventional Commits are consistent — not installed yet)
- No automated tests

Until these exist, the discipline above is manual and depends on actually
following it — that's the whole point of writing it down.
