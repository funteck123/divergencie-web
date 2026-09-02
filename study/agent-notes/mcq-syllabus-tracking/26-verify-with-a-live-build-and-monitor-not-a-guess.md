# Every commit this session was preceded by a real `next build`, checked via Monitor

**Applies to:** essentially every commit in this feature area.

Standing pattern used throughout: after any change touching `app/` (the
proxy route, the Management dashboard config UI, `lib/mcqConfig.js`), run
`npx next build` in the background and use the `Monitor` tool with a loop
like `while kill -0 $PID; do sleep 3; done; echo DONE; grep -iE "error|fail" build.log`
rather than polling with repeated `sleep`/`cat` calls or, worse, assuming a
change is fine because it "looks right."

One recurring false alarm worth knowing about: the `Monitor` wrapper
reports `status: "failed"` / `"script failed (exit 1)"` whenever the
trailing `grep` finds **no** matches — which is the success case here (no
error lines found), not a failure. Always check the log tail directly
before concluding a build actually broke; don't trust the monitor's own
"failed" label at face value when the command's own logic is
"grep for problems, exit 1 if none found."

Changes to `public/mcq-digitizer/index.html` or
`prototypes/*/index.html`/`server.mjs` don't need a Next.js build at all
(static files, or standalone Node servers) — but do need the relevant
`node server.mjs` process restarted to pick up server-side JS changes
(static HTML changes are picked up on next request, no restart needed).
Conflating these two verification paths wastes time either restarting
something that doesn't need it or skipping a restart something does need.
