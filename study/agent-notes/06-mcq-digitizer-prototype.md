# MCQ Digitizer prototype — what it is, how to run it, what it proved

`prototypes/mcq-digitizer/` — the third standalone prototype (see
`04-exam-grader-prototype.md` and `05-quiz-digitizer-prototype.md` for the
first two, and `prototypes/README.md` for the shared convention).

## What it does

Turns a Multiple Choice Question paper + its Mark Scheme (answer key) into
an instant, auto-graded interactive quiz. Both PDFs are required upfront —
unlike `exam-grader`, there's no "generate the mark scheme" mode here, per
explicit direction ("Both qp and ms provided").

1. Upload both PDFs. `extract_mcq.py` (PyMuPDF + regex, same approach as
   `quiz-digitizer`'s segmenter) parses the QP into questions + lettered
   options, and the MS into a `{questionNumber: letter}` answer key, then
   merges them.
2. The quiz renders as radio-button options per question.
3. Submit grades **entirely client-side, in the browser** — no server
   round-trip, no LLM call.

## Why this one has genuinely no LLM, not even for grading

Explicit direction: "No llm." This isn't just moving segmentation off the
model (like `quiz-digitizer`) — MCQ grading itself needs zero judgment. A
selected letter either matches the answer key or it doesn't. That's a real
architectural difference from the other two prototypes, not just a
simplification: `exam-grader` and `quiz-digitizer` still need an LLM
because grading free-response answers requires understanding; this tool
never does. No `.env`, no API key, no OpenRouter dependency, no
reliability/cost tradeoff to manage or document — the whole class of
problems that dominated the other two prototypes' README/testing sections
doesn't apply here.

## What was proven live (2026-08-25)

- `node --check server.mjs`, `python3 -c "import ast; ast.parse(...)"` on
  `extract_mcq.py`, and a `new Function()` parse of `index.html`'s inline
  `<script>` — all clean.
- Self-authored 5-question original sample (general knowledge, not copied
  from any real exam) — `extract_mcq.py` run directly AND via a live
  `POST /api/digitize` against the actually-running server (port 5177):
  identical result both ways, all 5 questions found, all 4 options each,
  all 5 correct answers matched from the mark scheme, `unmatchedAnswerKey`
  correctly empty.
- Missing-field validation: `POST /api/digitize` with only `qpBase64` set
  returned the expected 400 with `"Both a Question Paper and a Mark
  Scheme PDF are required."`
- Static file serving: `GET /` returned 200.
- Client-side grading logic itself was code-reviewed but not exercised via
  a live browser Submit click in this pass — the digitize half is proven
  end-to-end against the real server; the grading half is proven by
  reading the code (a straightforward `selected === correctAnswer`
  comparison) rather than a live UI test. Disclosed honestly: if this
  matters, take it for an actual browser spin before trusting it further.

## Known limitations (honest, real, not hedged away)

- Same parsing heuristic class as `quiz-digitizer`'s segmenter: tuned to
  `"1. <stem>"` / `"Question 1. <stem>"` question headings and
  `"A)"`/`"A."`/`"(A)"` option markers. A paper using numeric options
  (1/2/3/4 instead of letters) or an unusual heading style won't parse.
- Answer-key parsing scans every line for a `<number> <letter>` pattern and
  keeps the first match per question — works for a simple list or loosely
  laid-out grid, but not for a dense unlabeled answer table.
- Not yet tested against a real third-party MCQ paper — the trigonometry
  free-response samples used to stress-test the other two prototypes don't
  apply here (no lettered options). If a real MCQ paper turns up later,
  test against it before trusting this on anything that matters.
- No OCR — needs a real text layer, same constraint as `quiz-digitizer`.
