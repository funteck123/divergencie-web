# The proxy's own fetch() had no try/catch — found by a self-audit, not a user report

**Commit:** `c98e1e2` (found), fixed same commit after running the
`ai-rigor-audit` + `swe` skills on this feature per direct user request
("/ai-rigor-audit wtf why wasn't it fully done. /swe completeness check").

`app/api/mcq/[...path]/route.js` (the main-app proxy to the standalone
extraction service, see `17-keep-prototype-tables-independent-of-main-app-db.md`
for why that split exists) called `fetch(extractionUrl + ...)` with no
try/catch around it. An unreachable tunnel would throw an unhandled
exception, and Next.js would return a raw 500/stack trace instead of a
clean error.

This is a real irony worth flagging explicitly: the entire feature exists
because the Cloudflare tunnel URL is unstable and changes on every restart
(see `18-tunnel-url-centralized-in-one-config-row.md`) — and the exact
failure mode the feature is built to survive (tunnel down/unreachable) was
the one case not handled gracefully.

**General lesson**: when building a proxy/adapter specifically to paper over
an unreliable upstream, the upstream-unreachable case is not an edge case —
it's the primary case the whole layer exists for, and deserves the first
error-handling check, not an afterthought found on a later audit pass.
