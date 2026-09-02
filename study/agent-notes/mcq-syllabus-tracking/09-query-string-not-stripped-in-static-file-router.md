# Both standalone prototypes 404'd on their own tracking links

**Commit:** `1f06eb7` (syllabus-digitizer), same fix mirrored into
mcq-digitizer's `server.mjs` in the same pass.

Both `prototypes/mcq-digitizer/server.mjs` and
`prototypes/syllabus-digitizer/server.mjs` have a bare Node `http.Server`
with their own hand-rolled static-file fallback:

```js
const filePath = req.url === "/" ? "index.html" : req.url.slice(1);
```

`req.url` includes the query string. `/?account=X&name=Y` (the literal
tracking-link shape introduced this session — see
`01-four-tier-leaderboard-architecture.md`) is not `"/"`, so this resolved
to the literal filename `"?account=X&name=Y"` instead of `index.html`,
404ing on the exact root path any student's tracking link points at. Never
hit before because nothing generated a query-string root URL until this
session added `?account=`/`&name=` links.

Fixed by stripping the query string first:

```js
const urlPath = req.url.split("?")[0];
const filePath = urlPath === "/" ? "index.html" : urlPath.slice(1);
```

**Check this specific line in any other hand-rolled `http.Server` static
file handler in this repo before assuming query params will just work** —
it's a one-line bug that only surfaces the moment someone appends a query
string to the root path, which is easy to never test if development always
happens by clicking through the UI from `/` with no params.
