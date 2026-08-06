# Checking production tickets from the CLI

Management can review reported issues in the app itself (Tickets tab), but
sometimes it's faster to pull them straight from the API — e.g. an agent
session with no browser. This is the procedure used to do that.

Why not just query the DB directly: production runs on Supabase
(`lib/db-supabase.js`), reachable only with `V7_SUPABASE_SERVICE_ROLE_KEY`.
Pulling that key to a local file (`vercel env pull`) is blocked by this
environment's permission classifier as a secrets-exfiltration risk, and
rightly so — going through the app's own auth-gated API instead means every
read is subject to the same `requireManagement()` check a real admin
session would hit, no raw DB credentials ever touch disk.

## 1. Log in, keep the session cookie

```bash
curl -s -c /tmp/cookie.txt -X POST https://www.divergencie.co.uk/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<username>","password":"<password>"}'
```

Credentials: see `planning/PORTAL_CREDENTIALS.md` (gitignored, not in this
file — this repo is public).

`sessionCookieFor()` (`lib/session.js`) sets the cookie on success; `-c`
saves it to a cookie jar for reuse.

## 2. Query the endpoint

```bash
curl -s -b /tmp/cookie.txt https://www.divergencie.co.uk/api/tickets
```

`GET /api/tickets` is Management-only (`requireManagement`) — returns the
full ticket list as JSON. Same pattern works for any other
Management-gated `GET` route.

## 3. Clean up

```bash
rm -f /tmp/cookie.txt
```

Don't leave the session cookie lying around after you're done with it.

## Notes

- Runtime logs (`vercel logs` / the Vercel MCP `get_runtime_logs`) are
  **not** a substitute for this — retention on the Hobby plan is 1 hour,
  so historical ticket/audit data isn't in there. The DB (via the API) is
  the only durable source.
- This same login+cookie approach works for any Management-only GET route
  (`/api/audit`, `/api/applogs`, etc.) — swap the path in step 2.
