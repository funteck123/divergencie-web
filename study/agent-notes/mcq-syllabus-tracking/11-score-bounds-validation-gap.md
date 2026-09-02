# scores.mjs originally accepted negative scores and score > totalQuestions

**Commit:** `c98e1e2`, found by the same `ai-rigor-audit`/`swe`
self-audit pass as `10-proxy-fetch-needs-try-catch-for-tunnel-down.md`.

`recordAttempt()`'s only check on first write was
`Number.isInteger(score) && Number.isInteger(totalQuestions)` — nothing
stopped `score: -1` or `score: 99` against `totalQuestions: 10` from being
inserted and silently corrupting every avg%/leaderboard computation
downstream. Grading is entirely client-side JS (see this prototype's own
"no LLM anywhere" design), so the server-side attempt-recording endpoint was
the only real trust boundary and it validated nothing.

Fixed with an explicit bounds check before insert:

```js
if (!Number.isInteger(score) || score < 0 || score > totalQuestions) {
  throw new InvalidAttemptError(...);
}
```

**General lesson for this repo's prototype tools**: because grading/logic
lives client-side by design (no LLM, no server-side judgment call needed),
it's easy to assume the server-side write endpoint is just a dumb logger and
skip validating it — but it's still the actual trust boundary between
"whatever a browser sends" and "what's permanently stored," and needs real
bounds checks independent of what the client is supposed to send.
