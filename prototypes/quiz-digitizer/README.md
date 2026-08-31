# Quiz Digitizer — prototype

Standalone HTML/JS + minimal Node server, deliberately separate from the
main DivergenCIE app, same convention as `prototypes/exam-grader/`.

## What it does

1. **Upload any Question Paper PDF.** No fixed template, and **no LLM
   call for this step** (explicit direction) — `extract_questions.py`
   reads the PDF's own text/layout via PyMuPDF (font size/weight, line
   position) plus regex heuristics to find where each **top-level
   question** starts and ends. Scope is whole questions only (1, 2, 3,
   ...) — a question's own `(a)`/`(b)`/`(i)`/`(ii)` sub-parts, if any, are
   part of that one question's text, not split into separate answer
   boxes (see "Why sub-parts aren't tracked separately," below).
2. **Take the quiz right there in the browser** — each digitized question
   becomes a card with its own answer box.
3. **Submit → instant grading.** The quiz's own questions + an optional
   Mark Scheme + the student's typed answers all go to the model in one
   call (this step DOES use a vision LLM — judging correctness needs
   understanding, finding question boundaries doesn't); get back marks, a
   verdict, and the correct answer for every question.
4. **Mistakes are shown clearly** with the correct answer right there —
   nothing hidden, no separate "check answers" step.

## Why sub-parts aren't tracked separately (real history, not a guess)

The first version of this tool DID try to split out `(a)`/`(b)`/`(i)`/`(ii)`
sub-parts as their own gradable units, using a vision LLM to find them.
Two real problems surfaced testing it against a real 7-question, 15-page
paper: (1) sending every page to a model in one request blew a real
OpenRouter prompt-token limit ("24571 > 6742"); (2) even after switching
to one page per request to fix that, the account's credit balance made
grading a 15-page paper expensive and slow. Explicit direction ("no LLM in
this one") moved segmentation to pure PyMuPDF/regex — free and instant
regardless of page count. Sub-part-level nesting was then tried with the
rule-based approach too, and while it worked on a simple sample, it
produced real duplicate/mislabeled entries on the actual 3-level-nested,
multi-page paper (sub-sub-parts losing track of which lettered part they
belonged to across page boundaries). Given "only separate qs and not
parts" as the follow-up direction, that whole layer was removed — a
question's sub-parts are just part of its own text and mark total now,
which is both simpler and correctly handles the real paper (7/7 questions
found, matching reality, no duplicates).

## Deliberately NOT built around the sample PDF

`samples/sample-qp-original.pdf` (6 original questions I wrote myself, not
a real exam board's paper) exists only for testing without the code
becoming tuned to one file's layout. **Also tested against a real,
independently-sourced 15-page Cambridge IGCSE trigonometry paper** — see
"What was proven live," below, for the actual result.

## Running it

```
cd prototypes/quiz-digitizer
npm start
```

Defaults to **`openrouter/free`** — not one fixed model, an OpenRouter
alias that auto-routes each call across whichever free models are
available (confirmed live: different real calls landed on
`nvidia/nemotron-3-ultra-550b-a55b:free`, `dots-studio/dots-3-note-preview:free`,
and others, unpredictably). Cost:0 confirmed on every call. Chosen after
a single fixed free model (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`)
measured a real ~30% clean-success rate — see `exam-grader/README.md`'s
matching note for the full breakdown across 20 real test calls total (3
batches of 5, spanning both the fixed model and the auto-router, plus a
real fix made partway through). Reads
`OPENROUTER_API_KEY` (+ optional `OPENROUTER_MODEL`,
`OPENROUTER_MAX_TOKENS`) from its own `.env` (gitignored) or the
environment, same as `exam-grader`. Opens at `http://localhost:5176`
(different port from exam-grader's 5175, so both can run at once).

**Watch `OPENROUTER_MAX_TOKENS`.** The digitize step needs no API key or
credit at all now. Only `/api/submit` (grading) calls OpenRouter, and the
account this was built against had a small, steadily-draining real
balance across this whole build — needed lowering multiple times (1200 →
800 by the end) and still hit a real truncated-response failure
("Unterminated string in JSON") on the full 15-page paper's grading call
near the end of testing. That's the account's credit being genuinely too
thin for a big grading response, not a code bug — raise this if your
account has more credit, and expect to need less of it now that digitize
is free.

## Architecture

- `extract_questions.py` — finds top-level question boundaries via
  PyMuPDF (`fitz`) text/layout extraction + regex, no LLM call. See its
  own header comment for the exact heuristics and their real limits.
- `server.mjs` — Node's built-in `http` module, no framework. Two
  endpoints: `POST /api/digitize` (PDF in, structured question list out,
  no API key needed) and `POST /api/submit` (questions + answers +
  optional MS in, graded results out, the only step that calls
  OpenRouter).
- `index.html` — single file, vanilla JS, three-stage flow (upload →
  answer → results), no build step.

## What was proven live (2026-08-24), not just written

- **Digitize, original sample**: all 6 questions found correctly (marks
  match exactly what's printed, `marksInferred: false` throughout).
- **Digitize, a real 15-page Cambridge IGCSE trigonometry paper**: found
  exactly 7 questions, matching the paper's real question count, with no
  duplicates and no mislabeling — the actual generalization test this
  tool exists to pass. (An earlier sub-part-aware version of this same
  step was tried and failed this exact test with real duplicate/
  mislabeled entries before sub-part tracking was removed — see "Why
  sub-parts aren't tracked separately," above.) Mark totals per question
  weren't independently cross-checked against the paper's real official
  totals digit-by-digit — flagging that honestly as unverified, not
  claiming more precision than was actually confirmed.
- **Submit, original sample**: sent a deliberate mix of correct and wrong
  answers (Q3(b) answered `2x + 5` instead of the correct `2x + 10`). Got
  back an accurate `6/10`, the wrong answer correctly marked `incorrect`
  with the right correction shown. One real grading-strictness quirk
  noticed: an answer missing a `²` superscript was marked fully
  `incorrect` rather than partially credited — a real, minor style
  question worth revisiting later.
- **Submit, the real 15-page paper**: NOT successfully completed — hit a
  real truncated-JSON failure from insufficient remaining account credit
  (see above). The digitize half of the pipeline is proven against this
  paper; the submit half isn't, for a credit reason, not a code reason.

## Known limitations (honest)

- No PDF/DOCX for the *student's* side — answers are typed live, not
  uploaded as a separate document (this tool's whole point is turning the
  QP into a live quiz, not grading a pre-existing script — that's what
  `exam-grader` is for).
- No image/diagram answer support — text answers only. A question that
  needs a drawn diagram as the answer can't really be answered here yet.
- No persistence — refresh the page, lose everything.
- Single mark-scheme input shape (text/image), same as exam-grader — no
  PDF mark scheme upload yet.
- Not tested against a scanned/image-only QP (no real embedded text layer)
  — `extract_questions.py` reads PyMuPDF's text extraction, which needs an
  actual text layer; a pure image scan would need OCR first, not built.
- Not tested against a multi-column layout, or a paper using a numbering
  convention other than "N." / "Question N" (e.g. "Q1:", unnumbered bullet
  questions) — real, disclosed gaps in the heuristic, not silently assumed
  to be covered.
- Sub-parts are no longer separately gradable, by design (see "Why
  sub-parts aren't tracked separately," above) — a whole question with 4
  sub-parts is one answer box now, not 4.
