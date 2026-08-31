# Exam Grader — prototype

Standalone HTML/JS + minimal Node server, deliberately separate from the
main DivergenCIE app (own `package.json`, no shared dependencies, doesn't
touch the app's database or routes). Proves out the grading pipeline end to
end before it gets integrated into the real app later.

## What it does

1. You paste/upload a **Question Paper** and a **Student Script** — each can
   be pasted text, an uploaded image (handwriting, diagrams, a photographed
   script), or both. A **Mark Scheme** is optional: if you don't have one,
   leave it blank and **Generate-MS mode** kicks in — the server asks the
   model to write a mark scheme from the Question Paper alone before
   grading against it. The generated scheme is shown in the results (with
   a clear "not the official scheme" warning) and included in both exports,
   never presented as if it were real.
2. It sends all three to a vision-capable model via OpenRouter with instructions to
   grade the script against the mark scheme, question by question, line by
   line.
3. Renders the result: total score, a per-question breakdown, and for each
   line of the student's answer — the exact text, a verdict (correct /
   partial / incorrect / note), specific feedback, and a correction where
   relevant.
4. Two export options:
   - **Download as Markdown** — a plain `.md` file of the full report.
   - **Print / Save as branded PDF** — opens the browser print dialog on a
     DivergenCIE-styled version of the report (navy/gold, matching the
     app's own brand tokens). Choose "Save as PDF" in the print dialog.
     This is the simplest dependency-free way to get a branded PDF out of
     a static HTML prototype — no PDF library needed. When this gets
     integrated into the real app, swap this for real server-side PDF
     generation (matching whatever the app's existing PDF/canvas pipeline
     looks like by then) so it's a one-click download instead of a print
     dialog.

## Scope of this first prototype (deliberate, see the actual planning
conversation for the full reasoning)

- **One subject, manual paste/upload only.** No PDF parsing, no DOCX
  parsing, no Google Drive link fetching yet — those are real, separate
  pieces of work (extracting text/images from an uploaded PDF/DOCX, or
  fetching + rendering a Drive-hosted file) deliberately deferred until the
  core grading pipeline itself is proven.
- **Vision LLM grading**, not rule-based exact-match — handles free-text
  reasoning, partial credit, and handwritten/diagram answers, not just
  keyword matching.

## Running it

```
cd prototypes/exam-grader
OPENROUTER_API_KEY=sk-or-... npm start
```

Then open `http://localhost:5175`. The server reads `OPENROUTER_API_KEY`
directly from the environment you launch it with — it does **not** read the
main app's `.env`/`.env.local` (deliberately kept separate, since this
prototype isn't part of the app yet). If the key is missing, the server
starts fine but every `/api/grade` request returns a clear error saying so
instead of failing silently or crashing.

Calls go through [OpenRouter](https://openrouter.ai) (one API key, many
providers/models) rather than a direct Anthropic key. The model slug
defaults to **`openrouter/free`**, OpenRouter's own auto-router across
free models (not one fixed model — confirmed live, back-to-back calls
landed on different real models, e.g. `nvidia/nemotron-3-ultra-550b-a55b:free`
and `dots-studio/dots-3-note-preview:free`). Cost:0 confirmed on every
call via each response's own `usage` field.

**Full real reliability history, three test batches, 15 total calls
against the actual trigonometry paper:**
- **Batch 1** (fixed model, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`):
  1 clean success, 2 internally self-contradictory (own `totalMarks`
  disagreeing with its own per-question numbers), 1 slow JSON failure
  (276s), 1 network failure.
- **Batch 2** (same fixed model, after adding server-side recomputation
  of totals from per-question data — see below): 2 clean, 2 network
  failures, 1 malformed/empty response. The self-contradiction bug didn't
  recur; the fix holds.
- **Batch 3** (switched to `openrouter/free`, plus a JSON-extraction
  fallback added after finding some auto-routed models dump raw
  reasoning text into `content` instead of clean JSON): 3 clean, 1
  network failure, 1 response from what looks like a content-safety
  classifier model (`"User Safety: safe"`, not a grading response at
  all) — the auto-router can apparently pick an inappropriate model type
  for this task, a real, new failure mode of its own.

**Two real server-side fixes landed from this testing, not just found and
left:**
1. Recompute `totalMarks`/`maxMarks` from the actual per-question
   results instead of trusting the model's own top-level summary fields
   — a self-contradictory response can no longer produce a wrong score.
2. Extract the embedded `{...}` JSON object from noisy/reasoning-prefixed
   responses instead of only stripping markdown fences.

Override with `OPENROUTER_MODEL=...` for a paid model if you have credit
and want real reliability — free-tier success across all this testing
sits around 40%, a real limitation to plan around, not a minor caveat.
It's also noticeably slower (20-60s+ per grading call, sometimes much
longer, since these are reasoning models that think before answering).

## Sample files

`samples/` holds real uploaded files for manual testing — **gitignored**,
never committed (this repo is public; one of the two sample files is a real
student's actual handwritten work, real PII, same reasoning as `/backups/`
at the repo root).

- `sample-qp-trigonometry.pdf` — a Cambridge IGCSE Maths (0580) Ch.6
  Trigonometry question paper, 15 pages / 7 questions.
- `sample-student-script-hameed.pdf` — a real student's handwritten
  trigonometry answers, 8 pages.

**These two files do NOT match each other.** Read through both directly
(not just assumed): the QP's seven questions are about a pyramid, a
ship/lighthouse bearing problem, a hexagon, a tent, a tower, and a cuboid.
The student script's visible working is a completely different set of
problems — bearings between points P/Q/R/S, an "acute angle PQR"
calculation, and a forest-area calculation — none of which correspond to
any question in the sample QP. Grading the script against this QP (generated
or otherwise) would produce meaningless results. Left both files here as
requested since they're useful for testing the pipeline mechanically (does
grading run at all, does the UI render correctly), but they are not a valid
matched QP+script pair — don't treat a grading result from this exact
combination as meaningful, and swap in a real matching QP (or use
Generate-MS mode with a QP that actually corresponds to the script) for an
actually meaningful test.

## Architecture

- `server.mjs` — Node's built-in `http` module only, no framework. Serves
  `index.html` statically, and one endpoint, `POST /api/grade`, which
  builds a vision-model request (text + image content blocks per input)
  and asks for a structured JSON response (marks, per-question line-by-line
  feedback) via a system prompt that pins the exact response shape.
- `index.html` — single file, vanilla JS, no build step, no framework.
  Three input cards, a Grade button, a results view, and the two export
  buttons.

## Known limitations, honestly (this is a prototype, not the final feature)

- No retry/backoff if the OpenRouter API call fails or times out — a failed
  grade just shows the raw error, you click Grade again.
- No persistence — refreshing the page loses the current result. Nothing is
  saved anywhere.
- No file-size guard on images beyond a blunt 30MB total request-body cap
  in the server.
- The PDF export is a print dialog, not a real one-click PDF file, as
  noted above — a real integration should generate the PDF server-side.
- Not tested against a real Cambridge IGCSE paper end-to-end yet (no
  `OPENROUTER_API_KEY` was available in this environment to run a real
  grading request) — the server starts and serves the page correctly, and
  the request/response shape has been read through carefully, but the
  actual grading quality/JSON-parsing robustness against a real vision
  response hasn't been live-verified. Flagging this honestly rather than
  claiming full end-to-end proof.
