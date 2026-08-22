# Handout: wrong assumptions, mistakes, and findings

A running record from the ticket-fixing sessions on this codebase. Each note below
is atomic: one wrong assumption or one finding, what actually happened, and the
lesson. Read any single note on its own; you do not need the rest of the file for
context.

## How to use this

Before investigating a "shows nothing" or "doesn't work" style report, check
whether one of these notes already covers the failure shape. Add a new note any
time an investigation takes a wrong turn that a future session could repeat.

---

### Note 1: Two "scheduleItems" exist, and they answer different questions

`GET /api/me?userId=X` returns a `scheduleItems` field. So does `GET /api/schedule`.
They are not the same list. The `/api/me` version is filtered by the account's own
`enrollments`, so for a TrialAcc or InterviewAcc account (which never has an
enrollment) it is always empty, structurally, not as a bug. The `/api/schedule`
version returns every schedule item unfiltered.

The Trial and Interview dashboard pages already know this and fetch both,
building `scheduleById` from the `/api/schedule` call, not the `/api/me` bundle.

**Lesson:** when a report says "date/time doesn't show," find the exact fetch
call the actual page makes before writing a reproduction script. A script that
calls the wrong endpoint will reproduce a symptom that does not exist in the
real UI, and the false negative looks exactly like a fixed bug.

### Note 2: TKT-0111, the initial "can't reproduce" was wrong because of Note 1

First pass: built a live test that read `me.scheduleItems` for a Trial account
with and without a facilitator set, found both were empty regardless, and (since
this matched neither the "not just facilitator" reading nor a facilitator-only
issue) reported "can't reproduce, closing as false alarm" back to the user.

The user pushed back once: "I meant there is an instructor so. Why no
instructor." That reframing was the useful signal: the report was about the
Management Pipeline table, which had never had a Scheduled/Instructor column at
all, not a rendering bug in a field that has a fallback. No amount of testing
the candidate-side schedule lookup would have found that, because the bug was
never in that code path.

**Lesson:** "I can't reproduce it" is a claim about the paths tested, not proof
the report is wrong. State exactly what was checked when reporting a
non-reproduction, so a correction can be targeted instead of starting over.

### Note 3: an empty-string field and a missing column look the same to a reporter

`s.Facilitator || "no instructor set"` and `s.Facilitator` (bare, no fallback)
both LOOK like "blank" to someone glancing at a table. But a genuinely missing
column, and a present column rendering an empty string, are different bugs with
different fixes. Confirm which one you are looking at before proposing a fix.

### Note 4: `npm install <pkg> --no-save` can silently delete an unrelated,
undeclared dependency

`playwright` was present in `node_modules` but never listed in `package.json`
(installed ad hoc earlier in a session). Running `npm install pg --no-save` to
test a Postgres connection triggered an implicit prune of "extraneous" packages,
deleting `playwright` as a side effect. The failure only surfaced later, in an
unrelated script, as `ERR_MODULE_NOT_FOUND: playwright`.

**Lesson:** any `npm install` can prune packages that were never in the lock
file, not just add the one you asked for. If a package is needed but
intentionally undeclared, expect it to be fragile against any future install in
the same project, not just installs of the same package.

### Note 5: a curl failure against an external API can be transient, not a wall

`api.supabase.com`'s Management API returned connection resets (exit 56 / HTTP
000) on a migration-apply attempt. Direct Postgres connections were also tried
and both failed for real, separate reasons (stale password, no IPv6 route). The
honest report at that point was "hit real walls." Retrying the exact same
Management API call later in the same session, with no changes on this end,
succeeded (HTTP 201).

**Lesson:** a network failure against a third-party API is not evidence of a
permanent block or a wrong credential unless every other explanation has been
ruled out. Report failures with their exact symptom (exit code, HTTP status), not
a conclusion about cause, and be willing to retry once before escalating.

### Note 6: a "verification-only" API call can be the real, mutating endpoint

While checking whether the Convert feature worked, a call intended as a dry
check hit the real `/api/convert` endpoint and permanently converted a real
Trial account into a real new Student account with real credentials. A follow-up
"Add Service" check on the same account created a real enrollment and a real
draft invoice.

**Lesson:** before calling an endpoint "just to check," confirm it is actually
read-only (a GET, or a documented no-op mode), not merely that the call is
being made for a verification purpose. Intent does not change what an endpoint
does. When a mutation happens by accident, disclose it immediately and let the
user decide whether to revert or keep it, rather than trying to undo it
unilaterally.

### Note 7: a bulk cleanup can delete records something else still references

A cleanup pass once deleted 10 ScheduleItems that were still referenced by real
attendance/booking records elsewhere, causing broken references. The fix was a
scoped restore from the pre-cleanup backup, re-inserted with their original IDs.

**Lesson:** before a bulk delete of any collection, check what else in the
schema holds a foreign-key-style reference to it (by ID field name, e.g.
`ScheduleItemID`), not just whether the records themselves look unused.

### Note 8: a report worded as a statement can still be a false alarm, and a
report worded as a question can still point at a real bug

Several tickets phrased as direct bug claims turned out, on live verification, to
already work correctly (false alarms). TKT-0111, phrased as a question ("Why?"),
pointed at a real, previously-invisible gap in the Management UI. Confidence of
phrasing in a bug report carries no information about whether the report is
correct.

**Lesson:** always verify live with disposable data before deciding a report is
a false alarm or a real bug, regardless of how the report is worded.

### Note 9: style-rule violations survive an initial cleanup pass if the sweep is
narrow

An earlier commit shipped with em dashes in the CHANGELOG and code comments,
despite a standing no-em-dash rule. The first fix touched only the immediately
offending entries. A full sweep across the entire `CHANGELOG.md` Unreleased
section, plus every recently touched code file, was needed to actually clear
the violation, and one was still found afterward (in a commit message quoting an
old, already-broken string verbatim as a documentation reference, which is
different from writing new prose with an em dash in it, but still worth naming
explicitly rather than leaving unremarked).

**Lesson:** when a style rule is violated once, check every file touched in the
same working session, not just the one flagged, and grep the CHANGELOG's whole
active section rather than the single new entry.

### Note 10: a test script's own selector bug can look exactly like an
application bug

A Playwright script used an index-based button selector (`saveButtons2[1]`) to
click "Save" on a specific form during a UI verification, and picked the wrong
button as a result, producing a failure that looked like the application was
broken. A direct API call confirmed the actual application logic was correct;
the bug was entirely in the test script's selector. A follow-up test using a
scoped locator (`.card:has(#doc-cover)`) confirmed the real UI form also worked.

**Lesson:** when a UI verification script fails, check the application via a
direct API call before concluding the application itself is broken, especially
when the script uses index-based rather than scoped selectors.
