# CLI & MCP — operate DCP1 as any user from the terminal

Two ways to drive the app outside the browser, both hitting the exact same
`app/api/**` routes the web UI uses (same `lib/authz.js` authorization
rules apply either way — Management sees/does everything, other roles are
scoped exactly like their own dashboard):

- **`cli/dcp1.mjs`** — a terminal command (`dcp1 <group> <action> ...`)
- **`mcp/server.mjs`** — an MCP server, for MCP-aware agents (e.g. Claude)
  to call the same operations as tools instead of shelling out

Both share one auth mechanism: a long-lived **API key** (a Bearer token),
not a browser session cookie.

## Auth model

An API key is a signed, long-lived Bearer token — the same HMAC-SHA256
signing scheme session cookies already use (`lib/session.js`), just
without a browser and with a longer default lifetime (90 days). It's
**self-contained**: verifying a request needs zero database lookups, only
the signature. That has one real trade-off worth knowing:

> **Deleting a key from the "issued keys" list (`dcp1 apikeys delete`)
> removes it from that bookkeeping list, but does NOT cryptographically
> invalidate the token before its own expiry.** If you need to guarantee a
> leaked key stops working immediately, rotate `SESSION_SECRET` in the
> environment — that invalidates every session AND every API key at once,
> app-wide. Mint keys with a shorter `--expires-days` if that trade-off
> matters for a given use case.

## First-time setup

```bash
npm install          # picks up @modelcontextprotocol/sdk + zod (already in package.json)
```

### Get your own API key

Any account can mint a key for **itself** with just its own username/password
(no Management needed) — the CLI's `login` command does this in one step:

```bash
node cli/dcp1.mjs login <username> <password> [--label "my laptop"] [--expires-days 90]
```

This logs in once (like the web login page), immediately mints a key for
that same account, and discards the password/session — from then on every
CLI call uses only the stored key (`~/.dcp1/config.json`, `chmod 600`).

### Management: minting a key for someone else

Management can mint a key on behalf of **any** user (e.g. to run
automation as a specific Teacher, without needing their password):

```bash
node cli/dcp1.mjs apikeys create --user STU-0001 --label "grading bot" --expires-days 30
```

The token is only ever shown once, in that response — copy it out and set
it directly via env vars on whatever machine/script needs it:

```bash
export DCP1_API_URL="https://your-deployed-app.example.com"
export DCP1_API_KEY="<the token>"
```

Env vars always override `~/.dcp1/config.json`, so this works without ever
running `dcp1 login` on that machine.

## Using the CLI

```bash
node cli/dcp1.mjs help          # full command list
node cli/dcp1.mjs whoami        # which account the current key belongs to
node cli/dcp1.mjs users list
node cli/dcp1.mjs invoices generate --year 2026 --month 7
node cli/dcp1.mjs invoices pdf INV-0001 --out invoice.pdf
node cli/dcp1.mjs schedule image STU-0001 --out schedule.png
node cli/dcp1.mjs me                       # your own /api/me bundle
node cli/dcp1.mjs me STU-0001              # (Management/self/parent only)
```

Most create/update actions take a `--json '<raw JSON body>'` flag matching
the target route's expected body shape (documented in `dcp1-backend-map-v7.md`
and in `dcp1 help`) — this is a deliberate escape hatch instead of a
hand-rolled `--flag` per field, since body shapes vary a lot between routes
(Users and Services in particular have many optional, type-conditional
fields).

Optionally add `cli/dcp1.mjs` to your `PATH` (or `npm link`, since
`package.json` already declares a `dcp1` bin entry) to drop the
`node cli/` prefix.

## Using the MCP server

```bash
npm run mcp
```

Registers 5 tools with any MCP client (e.g. Claude Desktop/Code's MCP
config) pointed at this command:

- `dcp1_api_catalog` — the full route catalog (method/path/body shape/who's
  authorized), so an agent can discover what's available
- `dcp1_login` — bootstrap a key from username/password (same flow as the
  CLI's `login`)
- `dcp1_whoami` — which account the current key belongs to
- `dcp1_request` — full-parity passthrough to any `app/api/**` route
  (`{method, path, body?}`) — this is the one tool that does everything;
  the others exist to make it discoverable and to handle auth
- `dcp1_download` — the 3 binary-response routes (invoice/paycheck PDFs,
  schedule PNG), returned base64-encoded

Point it at a deployed instance instead of localhost via the same
`DCP1_API_URL`/`DCP1_API_KEY` env vars, set in whatever config your MCP
client uses to launch the server process.

## Example MCP client config

```json
{
  "mcpServers": {
    "dcp1": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/server.mjs"],
      "env": {
        "DCP1_API_URL": "http://localhost:3000",
        "DCP1_API_KEY": "<a token from dcp1 login or apikeys create>"
      }
    }
  }
}
```

## Known limitation — pending manual step

The `apikeys` bookkeeping list (`dcp1 apikeys list` / `delete`) round-trips
through a Postgres function, `read_full_db()`, that hasn't yet been updated
to include the new `apiKeys` collection (a live production DB function
change, intentionally left for manual review rather than applied
unattended). Until that's run, minted keys work perfectly for
authentication (verification needs no DB lookup at all — see above), but
won't show up in `apikeys list`, and `apikeys delete` will report "not
found" even though the key is still valid until its expiry.

To fix, run this once against the Supabase project (Dashboard → SQL Editor,
or via the Management API):

```sql
CREATE OR REPLACE FUNCTION public.read_full_db()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'users', coalesce((select jsonb_agg(data) from users), '[]'::jsonb),
    'credentials', coalesce((select jsonb_agg(data) from credentials), '[]'::jsonb),
    'regForms', coalesce((select jsonb_agg(data) from regforms), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(data) from services), '[]'::jsonb),
    'scheduleItems', coalesce((select jsonb_agg(data) from scheduleitems), '[]'::jsonb),
    'enrollments', coalesce((select jsonb_agg(data) from enrollments), '[]'::jsonb),
    'trialItems', coalesce((select jsonb_agg(data) from trialitems), '[]'::jsonb),
    'interviewItems', coalesce((select jsonb_agg(data) from interviewitems), '[]'::jsonb),
    'attendanceItems', coalesce((select jsonb_agg(data) from attendanceitems), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(data) from invoices), '[]'::jsonb),
    'paychecks', coalesce((select jsonb_agg(data) from paychecks), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(data) from leads), '[]'::jsonb),
    'apiKeys', coalesce((select jsonb_agg(data) from apikeys), '[]'::jsonb),
    'counters', coalesce((select jsonb_object_agg(prefix, value) from counters), '{}'::jsonb),
    'fxRates', coalesce((select jsonb_object_agg(cache_key, rate) from fxrates), '{}'::jsonb)
  ) into result;
  return result;
end;
$function$
```

(The `apikeys` table itself already exists — this only updates the
aggregation function to include it.)
