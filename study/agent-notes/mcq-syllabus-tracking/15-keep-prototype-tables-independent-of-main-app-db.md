# Why mcq_attempts/syllabus_completions bypass lib/db-supabase.js entirely

**Commits:** `1378178`, `e34a605`.

`mcq_attempts`, `mcqconfig`, and `syllabus_completions` are real Postgres
tables in the same Supabase project the main app uses, but they are **never**
added to `lib/db-supabase.js`'s `COLLECTIONS` map or its `read_full_db()`
Postgres function. Each is queried directly by its own small dedicated
Supabase client (`scores.mjs`, `lib/mcqConfig.js`, `progress.mjs`) instead.

Two independent reasons, both real constraints, not stylistic preference:

1. **`read_full_db()` aggregates every collection on every single
   request** (see `study/agent-notes/` TKT-0081 context) — adding a new
   collection there means editing a shared Postgres function every other
   route in the app depends on, for a feature that's supposed to stay
   independent of the main app's release cycle.
2. **The whole design goal of this feature is independence from the main
   app** — `prototypes/mcq-digitizer/server.mjs` and
   `prototypes/syllabus-digitizer/server.mjs` are meant to keep working even
   if the main app's DB layer changes shape, per the explicit "stay
   independent for now" decision this session (see
   `18-tunnel-url-centralized-in-one-config-row.md` for the Option B
   sequencing this came from).

Same precedent already existed in the codebase for exactly this reason:
`lib/storage.js`'s `payment-proofs` bucket is queried directly, not through
the collections system either.

**If a future task is "add a new mcq-digitizer/syllabus-digitizer table"**:
follow this same pattern (own client, own table, own migration file under
`data/tmp/`) — don't add it to `COLLECTIONS` unless there's a real reason to
couple it to the main app's request lifecycle.
