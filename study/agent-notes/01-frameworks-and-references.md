# Frameworks, tools, and reference material — for future agent sessions

Every framework/tool actually in this repo's `package.json` or workflow, with
its canonical doc/repo and, where one genuinely exists, the paper or RFC it
came from. Don't cite a paper that doesn't exist — several entries below
correctly have "no formal paper, just docs/RFC" rather than a fabricated
citation.

## Core stack

| Framework/tool | Version in this repo | Canonical reference | Paper / RFC (if any) |
|---|---|---|---|
| **Next.js** | 16.2.10 | [nextjs.org/docs](https://nextjs.org/docs) | [App Router "Layouts RFC"](https://nextjs.org/blog/layouts-rfc) — the actual design doc behind the architecture this repo uses. No academic paper; this is the right source. |
| **React** | 19.2.4 | [react.dev](https://react.dev) | No formal paper. The core scheduling model is "Fiber" — best primary source is [acdlite/react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) (written by a React core team member, closest thing to a spec). |
| **PostgreSQL** | via Supabase | [postgresql.org/docs](https://www.postgresql.org/docs/current/) | No single founding paper; the concurrency model this project leans on is MVCC — [official MVCC docs](https://www.postgresql.org/docs/current/mvcc-intro.html) is the correct reference, not a paper. |
| **Supabase** (`@supabase/supabase-js` 2.110.2) | [supabase.com/docs](https://supabase.com/docs) | N/A — commercial product wrapping Postgres + GoTrue + PostgREST, no paper |
| **Vercel** (hosting/deploy) | — | [vercel.com/docs](https://vercel.com/docs) | N/A |
| **Tailwind CSS** | v4 | [tailwindcss.com/docs](https://tailwindcss.com/docs) | N/A |
| **Zod** | ^4.4.3 | [zod.dev](https://zod.dev) | N/A |
| **Sentry** (`@sentry/nextjs`) | ^10.68.0 | [docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/) | N/A |
| **Framer Motion** | ^12.38.0 | [motion.dev](https://motion.dev/) (rebranded from framer.com/motion) | N/A |
| **ESLint** | ^9 | [eslint.org](https://eslint.org/docs/latest/) | N/A |
| **TypeScript** | ^5 (types only — app is written in `.js`/`.jsx`, TS used for tooling/editor types, not compiled app code) | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) | N/A |
| **Model Context Protocol (MCP)** | `@modelcontextprotocol/sdk` ^1.29.0, used in `mcp/server.mjs` | [modelcontextprotocol.io](https://modelcontextprotocol.io) | [Anthropic's MCP announcement/spec](https://www.anthropic.com/news/model-context-protocol) — this is the closest thing to a "founding paper," it's a protocol spec not academic research |
| **canvas** (node-canvas) | ^3.2.3 | [github.com/Automattic/node-canvas](https://github.com/Automattic/node-canvas) | N/A |
| **firebase-admin** | ^13.0.2 | [firebase.google.com/docs/admin/setup](https://firebase.google.com/docs/admin/setup) | N/A — confirm actual usage in `lib/` before assuming what it backs; flagged as unconfirmed in `01-tech-stack-inventory.md` |

## Process/methodology references (not npm packages — practices)

| Concept | Reference | Notes |
|---|---|---|
| **Semantic Versioning** | [semver.org](https://semver.org/) | formal spec, short, this project follows `0.x.y` alpha convention correctly |
| **Conventional Commits** | [conventionalcommits.org](https://www.conventionalcommits.org/) | this repo's commit messages (`feat:`, `fix:`) already follow it |
| **Keep a Changelog** | [keepachangelog.com](https://keepachangelog.com/en/1.1.0/) | format used for `CHANGELOG.md` added this session |
| **AI tutoring / pedagogical alignment research** (used to ground the user's study guide, not this codebase) | [DeepTutor arXiv:2604.26962](https://arxiv.org/abs/2604.26962), [Training LLM tutors arXiv:2503.06424](https://arxiv.org/html/2503.06424v2), [Pedagogical alignment via RL arXiv:2507.20335](https://arxiv.org/abs/2507.20335), [LLM Agents for Education survey arXiv:2503.11733](https://arxiv.org/pdf/2503.11733) | cited in `study/user-notes/02-software-release-and-cicd.md` §7 |

## OpenSpec — checked, not present, not currently recommended

The user asked directly whether we're using [OpenSpec](https://openspec.pro/)
([GitHub: Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)) — a
spec-driven-development toolkit for AI coding agents (`openspec init` sets up
structured change-proposal folders that lock down "what to build" before
code is written, then archives proposals into living specs on completion).

**Confirmed via direct search of this repo: not installed, no `.openspec/`
directory, not in `package.json`, no trace anywhere.**

**Should we adopt it?** Not recommended right now, for a specific reason:
this project already runs the **`swe` skill** (Phase 0 intake → build →
five-lens review → findings handoff), which covers the same core problem
OpenSpec solves — agreeing on scope/behavior *before* code, and producing
a reviewable trail *after*. The overlap:

| Need | OpenSpec's answer | This project's current answer |
|---|---|---|
| Lock scope before building | change-proposal file, human approves | `swe` skill's Phase 0 intake + build plan, user approves implicitly/explicitly |
| Reviewable, auditable output | structured change folders | `swe` skill's Phase 3 findings + scorecard, plus now `CHANGELOG.md` |
| Living spec of the system | OpenSpec's archived specs directory | currently the `dcp1-*-map-v7.md` and `dcp1-uml-v*.md` files at repo root, informally |

Running both would mean two parallel "propose → approve → build" processes
fighting each other, which is worse than either alone. OpenSpec becomes worth
revisiting specifically if/when:
- **Multiple people** (not just one user + one agent) start proposing
  features concurrently and need a shared, tool-enforced source of truth for
  "what's approved to build" — OpenSpec is explicitly built for
  multi-contributor, multi-AI-tool teams (its own pitch: "different
  teammates can use Claude Code, CodeBuddy, Cursor... sharing the same
  specs").
- The informal `dcp1-*-map-v7.md`/`dcp1-uml-v*.md` docs drift out of sync
  with the actual code often enough that a tool-enforced spec-archive would
  pay for itself.

Until either is true, adding OpenSpec on top of the `swe` skill is process
overhead without a problem it solves here.
