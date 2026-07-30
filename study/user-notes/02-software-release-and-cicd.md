# Software Release Versioning & CI/CD — Study Guide

You're in **alpha**: features still changing shape, no external users
depending on stability yet. Here's how companies actually run this, and what
to adopt now vs. later.

## 1. Release stages (the vocabulary)

- **Alpha** — internal only, breaking changes expected daily. *You are here.*
- **Beta** — feature-complete-ish, real users, bugs still expected, no
  stability promise.
- **RC (Release Candidate)** — believed production-ready, final testing pass.
- **GA (General Availability) / v1.0** — the stability promise starts here.
  This is the line that matters most: **before v1.0, anything can break
  between versions. After, breaking changes require a major version bump.**

## 2. Semantic Versioning (SemVer) — `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking change (`v1.2.3` → `v2.0.0`)
- **MINOR** — new feature, backward-compatible (`v1.2.3` → `v1.3.0`)
- **PATCH** — bug fix, no new features (`v1.2.3` → `v1.2.4`)
- **v0.x.y** (where your `package.json` currently sits — `0.1.0`) is the
  explicit "anything can change" escape hatch in the SemVer spec itself.
  That's not sloppiness — it's the correct version number for alpha software.

You bump this by hand today. Companies at scale usually automate it via
**Conventional Commits** (`feat:`, `fix:`, `chore:`, `BREAKING CHANGE:` in
commit messages) feeding a tool like `semantic-release`, which reads commit
history and computes the next version + changelog automatically. Notice your
own recent commits (`feat(tickets): ...`, `fix(pdf): ...`) already follow
this convention — you're one config file away from automating this.

## 3. Changelogs

Convention: [Keep a Changelog](https://keepachangelog.com/) format — an
`[Unreleased]` section at the top, moved into a dated version section on
release. I added `CHANGELOG.md` to the repo root as a start — update it
alongside PRs, not after the fact (it's much harder to reconstruct later).

## 4. What CI/CD actually means (you have zero of this right now)

- **CI (Continuous Integration)**: every push/PR automatically runs
  lint + tests + build, so broken code is caught before merge — not by a
  human eyeballing it.
- **CD (Continuous Delivery/Deployment)**: a passing build on the right
  branch automatically deploys — to staging always, to production either
  automatically (Deployment) or via one manual approval click (Delivery).

**Current state of this project**: Vercel's GitHub integration auto-deploys
`main` to production on push. That's *half* of CD (auto-deploy) with **none**
of CI in front of it — nothing runs tests or lint before that deploy, because
there are no automated tests yet, and lint isn't gated in a pipeline.

### The minimum viable CI/CD setup for where you are

1. **Add a `develop` (or `staging`) branch.** Point Vercel's Preview deploys
   at it. Merge feature branches → `develop` → verify on the preview URL →
   merge `develop` → `main` for production. This alone would have prevented
   today's situation (51 commits sitting unpushed with no staging checkpoint).
2. **Add a GitHub Actions workflow** (`.github/workflows/ci.yml`) that runs
   on every PR: `npm ci`, `npm run lint`, `npm run build`. Costs nothing on a
   public/small private repo, catches broken builds before they can even
   reach Vercel.
3. **Add tests, starting small.** Vitest for pure functions (e.g. the
   invoice/paycheck math, `nextId`, date logic) before anything else — those
   are the highest-value, lowest-effort tests to write. Playwright for a
   handful of critical-path E2E flows (login, create ticket, close ticket)
   once units exist.
4. **Branch protection on `main`** in GitHub settings: require the CI check
   to pass before merge, disallow direct pushes. This is the actual guardrail
   — right now nothing stops a broken commit from reaching `main` and
   auto-deploying.
5. **Only once the above exists**, consider `semantic-release` for automated
   versioning/changelogs — automating a process you don't have yet just
   automates chaos.

### Rollback strategy (you need this before you need it)

Vercel keeps every deployment addressable by URL — a bad prod deploy can be
rolled back by re-promoting the previous deployment in the dashboard/CLI
(`vercel rollback`), no new commit required. Know this exists *before* the
first incident, not during it.

## 5. Honest timeline

- **This week**: add the GitHub Actions lint+build check, add a staging
  branch. Both are a few hours of work, not a project.
- **1 month**: first Vitest tests on the riskiest pure-logic functions
  (money math, scheduling).
- **3 months**: comfortable reading and writing CI configs from scratch,
  understand blue-green/canary deploys conceptually even if you don't need
  them yet at this scale.
- **1 year**: you'll have opinions about testing strategy and CI design
  informed by real incidents you've hit — that's genuinely when this
  clicks, not when you finish reading about it.

## 6. Resources (checked, not recalled from memory)

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — the format spec
- [Semantic Versioning 2.0.0](https://semver.org/) — the spec itself, short, read the whole thing once
- [Conventional Commits](https://www.conventionalcommits.org/) — the commit-message convention that automation reads
- GitHub Actions official docs — [docs.github.com/actions](https://docs.github.com/en/actions) — start with "Building and testing Node.js"
- Vercel's own CI/CD + Git integration docs — you already have the account, read the Git Integration section end to end
- *Continuous Delivery* (Humble & Farley) — the book that defined the field; dense but the definitive reference once basics feel comfortable

## 7. On learning this well *with* an AI partner, not just from it

Searched current research on this specifically, since you asked. Findings:

- **DeepTutor (2026)** and similar "agentic personalized tutoring" work
  converge on one idea: an AI tutor is most effective when it **grounds
  answers in citation/source material and calibrates difficulty to what
  you've already demonstrated**, not when it just explains things fluently.
  Practical translation for you: don't just ask me to explain concepts —
  ask me to point you at the actual doc/spec/source (like I did above with
  SemVer and Conventional Commits) and read the primary source yourself.
  Fluent explanation without a source is the failure mode these papers flag.
- **"Training LLM-based Tutors to Improve Student Learning Outcomes"
  (arXiv 2503.06424)** found that tutors optimized to maximize a student's
  *immediate correct answer* often teach worse than ones that tolerate the
  student struggling a bit first. Practical translation: when you're stuck,
  ask me for a hint or the next question to investigate, not the finished
  fix — you already do this well (you traced the `read_full_db()` bug
  understanding *with* me rather than just accepting a patch).
- **General pattern across this research area**: the highest-value use of
  an AI partner while learning is as a *Socratic reviewer of your own
  attempt* — write code/config first yourself, then have it reviewed —
  rather than as a generator you accept output from wholesale. Use me that
  way for the CI/CD setup above: write the GitHub Actions YAML yourself
  first from the docs, then ask me to review it.

Sources consulted for this section:
- [DeepTutor: Towards Agentic Personalized Tutoring](https://arxiv.org/abs/2604.26962)
- [Training LLM-based Tutors to Improve Student Learning Outcomes in Dialogues](https://arxiv.org/html/2503.06424v2)
- [Cultivating Helpful, Personalized, and Creative AI Tutors](https://arxiv.org/abs/2507.20335)
- [LLM Agents for Education: Advances and Applications](https://arxiv.org/pdf/2503.11733)
