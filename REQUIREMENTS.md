# Requirements

This is a Node.js/Next.js project — dependencies (with pinned versions) are
already fully declared in `package.json` / `package-lock.json`; there's no
Python-style `requirements.txt` equivalent needed. This file covers what
`package.json` doesn't: runtime version and the external services/env vars
you need configured before the app will actually run.

## Runtime

- **Node.js 22.x** (this repo was built/tested on `v22.22.2`)
- **npm 10.x** (tested on `10.9.7`)

Install deps: `npm install`

## External services (accounts/setup required)

- **Supabase** (Postgres backend) — project URL + service role key
- **Sentry** (error monitoring) — DSN, free tier is sufficient
- **Vercel** (hosting/deploy) — project linked for env vars + deploys

## Required environment variables

Set these in `.env.local` for local dev (never commit this file — see
`.gitignore`), and in the Vercel dashboard per-environment (Development /
Preview / Production) for deployed environments.

| Variable | Purpose | Required? |
|---|---|---|
| `V7_SUPABASE_URL` | Supabase project URL | Yes (if `DB_BACKEND` uses Supabase) |
| `V7_SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (bypasses RLS — server-only, never expose to client) | Yes (same condition) |
| `DB_BACKEND` | Selects `lib/db.js` (JSON file, local/dev fallback) vs `lib/db-supabase.js` (real Postgres) | Yes |
| `SESSION_SECRET` | Signs session cookies | Yes |
| `SENTRY_DSN` | Server-side error reporting | Recommended, not required to run |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error reporting (must be `NEXT_PUBLIC_`-prefixed to reach the browser bundle) | Recommended, not required to run |
| `NEXT_PUBLIC_STRIPE_GATEWAY` / `STRIPE_GATEWAY` | Payment gateway config | Only if billing features are exercised |

`NODE_ENV` and `NEXT_RUNTIME` are set automatically by Next.js — don't set
these yourself.

## Verifying setup

```
npm install
npm run lint
npm run build
```

A clean `npm run build` is the fastest signal your environment/env vars are
correctly configured.
