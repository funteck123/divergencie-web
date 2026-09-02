# Three known, unfixed security gaps in the MCQ tracking feature

**Status as of 2026-09-02: explicitly deferred, not fixed.** Found by an
`ai-rigor-audit`/`swe` self-audit, deliberately not fixed on the user's own
instruction ("work fast and deeply extreme quality on completeness first to
score 100 then we discuss the security"). If picked back up, these are the
three concrete items, not a vague "add auth later":

1. **`GET /api/mcq/library` enrollment filtering doesn't cover any other
   endpoint.** `fetch-and-digitize`, `digitize`, `attempts`, `progress`,
   `leaderboard` are all plain pass-throughs in
   `app/api/mcq/[...path]/route.js` — a student who already has a
   `qpId`/`msId`/`accountId` from elsewhere (e.g. shared by a classmate)
   faces zero server-side enrollment check.
2. **`POST /api/mcq/attempts` doesn't verify the caller owns the
   `accountId` it's posting.** Any authenticated session can record a
   fabricated attempt under any other account's ID, corrupting that
   account's leaderboard/progress history. Fix direction: overwrite
   `accountId`/`accountName` in the proxy with the session's own values
   before forwarding, don't trust the client-supplied ones.
3. **`GET /api/mcq/progress?account=X` lets any session read any account's
   full history.** No check that `X` matches the caller's own session
   (or that the caller is Management). Fix direction: force `account` to
   the session's own userId unless the caller is Management.

The Board+SubjectName string-matching used for the one filter that *does*
exist (library listing) is also self-flagged as never verified against real
live enrollment/service data — spot-check that before trusting it in
production either.
