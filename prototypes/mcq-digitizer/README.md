# MCQ Digitizer (prototype)

Turns a Multiple Choice Question paper + its Mark Scheme (answer key) into an instant,
auto-graded interactive quiz. Both the QP and the MS are required upfront — this tool has
no "generate the answer key" mode, unlike `exam-grader`.

Standalone prototype. Own server, own `package.json`, not wired into the main Next.js app.

## Why this tool has no LLM anywhere — and no OCR either

`exam-grader` and `quiz-digitizer` both still need an LLM, because grading a free-response
answer requires judgment. Grading a multiple-choice answer does not — a selected letter
either matches the answer key or it doesn't. So this tool is deterministic start to finish,
and — after real-world testing against an actual paper showed why text-parsing options
doesn't generalize (see below) — it doesn't even try to OCR or re-typeset anything either:

- **Digitizing** finds each question's boundary (PyMuPDF + regex, position-aware) and
  **crops it as an image**, exactly as printed — diagrams, tables, and text all included
  verbatim, at 2x zoom for readability. No attempt to parse individual option text.
- **The answer key** is inferred from the MS the same no-LLM way, but the actual logic
  depends on the MS's own format (direct answer, or elimination-style explanation — see
  below).
- **Grading** happens entirely client-side, in the browser, the instant Submit is clicked:
  compare the selected letter (A/B/C/D...) to `correctAnswer`. No second server round-trip.

No API key, no `.env`, no OpenRouter dependency, no image-recognition dependency at all.

## How it works

1. Upload a QP PDF and an MS PDF.
2. `POST /api/digitize` shells out to `extract_mcq.py`, which:
   - Finds each question's start (a heading line like `"1."` or `"Question 1"`, bold or
     ≥10.5pt) and crops everything from there to where its own content ends — as a PNG,
     never re-typeset text — plus the set of option letters (A/B/C/D, or fewer) it can see
     printed on the page.
   - Parses the MS for each question's correct answer. Tries a direct answer first (`"5.
     C"` on the heading line itself); if that's not there, falls back to elimination
     parsing — scanning the question's own MS block for every letter explicitly marked
     wrong (`"B is incorrect..."`, `"C and D are incorrect..."`) and inferring the
     answer as whichever option letter is never eliminated. **Only when exactly one
     letter remains** — anything else (an MS with no letter references at all, or more
     than one surviving letter) is reported as ambiguous, never guessed.
3. The quiz renders each question as its cropped image, with A/B/C/D (or however many
   options it actually has) as clickable choice buttons underneath.
4. Submit compares the selected letter to `correctAnswer` locally — no server call.
   Questions with no confident answer are shown but excluded from scoring.

## Real-world test: what broke, and what the fix actually is (2026-08-25)

Tested against a real file, not a self-authored one: `CAIE IGCSE Biology Ch5 Enzymes
(MCQ) Worksheet 1` QP+MS, pulled directly from DivergenCIE's own Drive (see
`../../study/agent-notes/08-dc-course-materials-drive-structure.md` for where). The
**first version** of this tool (parsed option text into `{label, text}` pairs, and read
the MS as a flat `"<number> <letter>"` answer list) failed completely against it — 0
questions extracted, because:

- Real options are frequently **diagrams, tables, or images** (a temperature/enzyme-
  activity graph, a labeled-parts table, unlabeled diagram choices), not "A) plain text."
- The real MS **never states an answer directly** — it reprints the question, then gives a
  paragraph explanation and says which letters are wrong ("B is incorrect as..."). A flat
  `"<number> <letter>"` regex scanning 47 pages of that produced *confidently wrong*
  answers (e.g. "question 27: B" — a question number that doesn't exist in this 40-question
  paper) — worse than finding nothing, since it's silently wrong rather than visibly absent.

After being told explicitly not to add OCR, this version's image-crop + elimination-parsing
approach was built and retested against the same real files:

- **40/40 questions found** (this paper is 40 questions long, not the ~10 first assumed
  from a partial read — confirmed correct against its own "Maximum Marks: 40" metadata).
- **26/40 (65%) confidently auto-graded**; the remaining 14 come back `correctAnswer: null`
  and listed in `ambiguousAnswerKey` — their MS explanation describes the *right* answer's
  reasoning narratively rather than naming which letters are wrong, so elimination parsing
  correctly finds nothing to eliminate and correctly declines to guess, rather than
  fabricating an answer.
- Spot-checked two of the 26 confident answers against the actual question content (Q1:
  the enzyme-activity/temperature graph question, correctly resolved to "A", the graph
  showing the real denaturation curve; Q10: "which group of compounds ensures metabolic
  reactions take place effectively", correctly resolved to "B", enzymes) — both correct on
  independent semantic reading, not just internally consistent.
- Two real bugs found and fixed along the way, both from floating-point/layout quirks in
  this specific real file, not the self-authored sample: a `>= 11pt` heading-size threshold
  silently rejected real headings PyMuPDF reported as `10.98`/`10.99` (fixed to `>= 10.5`,
  with a real gap check against this file's actual body-text size of `10.0`); and a
  decorative sub-7pt footer/watermark line that renders anchored to the *top of the
  following page* in this specific PDF was fooling every question into thinking its
  content spilled onto the next page, producing a pointless blank second crop image for
  nearly all of them (fixed by dropping sub-7pt text from extraction entirely).
- Also found and fixed: a false-positive match on the QP's own cover-page metadata
  ("Topic: 5.0 Enzymes" parsed as "question 5") — fixed with a `(?!\d)` guard so a decimal
  topic number is never mistaken for a question heading.

## Known limitations (honest, real, not hedged away)

- **~65% auto-grading coverage is a real, current ceiling** on an MS written in this
  elimination-explanation style, not a bug to be fixed later — the other ~35% genuinely
  don't state which letters are wrong anywhere in their text, only the reasoning for the
  right one, which needs actual reading comprehension (an LLM) to resolve. Explicitly out
  of scope per direction: no LLM, no OCR, in this tool.
- Heading detection (`"1."` bold/≥10.5pt, or `"Question 1"`) is still a heuristic tuned to
  what's been seen so far (two real papers + one self-authored sample) — a paper with a
  meaningfully different heading style could still slip past it.
- A question whose own content spans more than 2 pages only gets 2 crop images (start page
  tail + end page head) — a 3+-page single question isn't handled.
- Not yet tested against a subject/board other than CAIE IGCSE Biology, or a paper using
  numeric (1/2/3/4) rather than lettered options.

## Running it

```
cd prototypes/mcq-digitizer
npm start        # http://localhost:5177
```

Requires `python3` with `pymupdf` (`fitz`) installed (same requirement as
`quiz-digitizer`), and no other dependency.

## Privacy

`samples/` is gitignored — same convention as `exam-grader/samples/` and
`quiz-digitizer/samples/`. Real test files (pulled from DivergenCIE's own Drive, not
third-party) live in `data/mcq-digitizer/samples/` at the repo root instead (also
gitignored, under the repo's existing `data/` rule) — see
`study/agent-notes/08-dc-course-materials-drive-structure.md`.
