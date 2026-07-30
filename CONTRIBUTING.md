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

## Versioning + Changelog — automated, push is still manual

`package.json` is currently `0.1.0` — pre-1.0, alpha, breaking changes
allowed between any release. Version bump + `CHANGELOG.md` are **no longer
hand-written** — `commit-and-tag-version` (installed as a devDependency)
reads your Conventional Commits since the last tag and computes it for you:

```
npm run release
```

This reads every commit since the last `v*` tag, then:
- bumps `package.json`/`package-lock.json` to the right next version
  (`fix`/`docs`/`chore`/`refactor`/`perf` → PATCH, any `feat` → MINOR,
  any `BREAKING CHANGE:` → MAJOR, or MINOR pre-1.0 per SemVer's own
  looser pre-1.0 allowance)
- rewrites `CHANGELOG.md`, moving `[Unreleased]` into a new dated version section
- commits both, and creates a local git tag for the new version

**It does not push anything.** It stops with an on-screen reminder
(`git push --follow-tags origin <branch>`) — pushing is a separate,
deliberate step you run yourself, whenever you actually want that version
live. Since `origin/main` auto-deploys to Vercel production, "push" and
"release to production" are the same action here — don't run the push half
until you actually mean it.

Preview what a release would look like without changing anything:
`npx commit-and-tag-version --dry-run`.

Move to **1.0.0** deliberately, not automatically — it's a promise to users
that breaking changes now require a MAJOR bump. `commit-and-tag-version`
will follow SemVer's normal MAJOR-on-breaking-change rule once you're past
0.x, so cross that line on purpose (e.g. `npm run release -- --release-as 1.0.0`)
when you mean it, not because commits happened to compute it that way.

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
- No automated tests
- **Deliberately not using `semantic-release`**: it's built to run in CI and
  push/publish automatically on every merge, with no manual gate — the
  opposite of what's wanted here (auto versioning, but a human decides when
  to push/release). `commit-and-tag-version` does the same versioning/
  changelog computation without forcing that.

Until CI/tests exist, the discipline above is manual and depends on actually
following it — that's the whole point of writing it down.
