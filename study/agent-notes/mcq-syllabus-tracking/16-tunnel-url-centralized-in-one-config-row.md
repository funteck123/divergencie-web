# The Cloudflare tunnel URL has exactly one source of truth now

**Commits:** `ffb74e5`, `c98e1e2`.

A Cloudflare quick tunnel gets a brand new random subdomain every time the
underlying `node server.mjs` process restarts (see
`16-prototype-server-port-and-tunnel-gotchas.md` in the parent
`agent-notes/` directory for why a *named* tunnel wasn't set up instead —
needs an interactive `cloudflared tunnel login` the agent can't do itself).

Rather than hardcoding that URL anywhere in the main app's code, it lives in
exactly one place: the `mcqconfig` Postgres table (one fixed row, id
`"GLOBAL"`, a `{url: "..."}` JSONB blob), read live on every proxied request
by `app/api/mcq/[...path]/route.js` via `lib/mcqConfig.js`. Management
updates it through a plain text field on the dashboard's Guides tab
(`McqExtractionUrlConfig` component in `app/dashboard/management/page.js`).

**Whenever the tunnel is restarted** (server crash, machine reboot, manual
restart to pick up a code change — this happened at least 6 times across
this session), the new URL must be written to this one row before the
proxy will work again. Check `mcqconfig`'s current value first if
`/api/mcq/*` starts returning 503 "Extraction service unreachable" —
that's the single most likely cause, not a code regression.
