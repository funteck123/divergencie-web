# Why extraction stays on its own machine, not merged into the main app

**Commit:** `ffb74e5` ("Option B" decision).

`extract_mcq.py` shells out to a local `python3` process with PyMuPDF
installed, via `execFileAsync("python3", [...])` in
`prototypes/mcq-digitizer/server.mjs`. That works because this prototype
runs on a persistent machine with Python installed.

**Vercel's Node.js serverless functions cannot shell out to a `python3`
binary** — it isn't present in that runtime. Vercel does support Python
natively, but as its own separate function runtime (a Python file becomes
its own serverless function), not something a Node function can invoke as a
subprocess.

This is why the main-app merge (`app/api/mcq/[...path]/route.js`) is a
**proxy to the extraction service**, not a port of the extraction logic
into a Next.js API route: most papers are pre-extracted PNGs served
straight from disk (no Python needed at request time — see
`data/mcq-digitizer/full-library/database.json`), and only manual uploads
plus the ~10 uncached papers still need live `python3`/PyMuPDF, which has to
keep running on the always-on machine regardless of where the rest of the
app lives.

If a future task is "fully migrate mcq-digitizer onto Vercel, no more
tunnel" — that requires actually solving this constraint first (port
`extract_mcq.py` to a Vercel Python function, or rewrite the extraction
logic in pure Node/JS), not just moving files into `app/`.
