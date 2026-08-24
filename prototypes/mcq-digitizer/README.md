# MCQ Digitizer (prototype)

Turns a Multiple Choice Question paper + its Mark Scheme (answer key) into an instant,
auto-graded interactive quiz. Both the QP and the MS are required upfront — this tool has
no "generate the answer key" mode, unlike `exam-grader`.

Standalone prototype. Own server, own `package.json`, not wired into the main Next.js app.

## Why this tool has no LLM anywhere

`exam-grader` and `quiz-digitizer` both still need an LLM, because grading a free-response
answer requires judgment. Grading a multiple-choice answer does not — a selected letter
either matches the answer key or it doesn't. So this tool is deterministic start to finish:

- **Digitizing** (splitting the QP into questions + lettered options, and reading the MS's
  answer key) is PyMuPDF + regex, same rule-based approach as `quiz-digitizer`'s
  `extract_questions.py`.
- **Grading** happens entirely client-side, in the browser, the instant Submit is clicked.
  No second server round-trip, no network call, no cost, no reliability question to manage.

No API key, no `.env`, no OpenRouter dependency at all.

## How it works

1. Upload a QP PDF and an MS PDF.
2. `POST /api/digitize` shells out to `extract_mcq.py`, which:
   - Parses the QP into `{questionNumber, questionText, options: [{label, text}]}`.
   - Parses the MS into a `{questionNumber: letter}` answer key.
   - Merges them: each question gets a `correctAnswer` looked up from the key.
3. The quiz renders in the browser with each question's options as radio buttons. The
   correct answers are present in the page's JS data but never shown until Submit.
4. Submit compares each selected letter to `correctAnswer` locally and renders results —
   no server call.

## Parsing conventions (real, honest limitations)

Both parsers are heuristics tuned to the most common real MCQ layouts, not a universal
parser:

- **Questions**: `"1. <stem>"` or `"Question 1. <stem>"` (bold/≥11pt heading lines).
- **Options**: `"A)"`, `"A."`, or `"(A)"`, upper or lower case, normalized to uppercase.
- **Answer key**: any line matching `"<number> <letter>"` (with an optional `.`/`)`/`:`/`-`
  between them), scanned across every line of every page — works for a simple list or a
  scattered/table-like layout, but not for a dense unlabeled answer grid or a paper using
  numeric options (1/2/3/4) instead of letters.

If a question's number has no match in the answer key, it's returned with
`correctAnswer: null` and listed in `unmatchedAnswerKey` — the quiz UI shows it as
ungradable rather than silently marking it wrong.

## Verified

- Self-authored 5-question original sample (`samples/sample-qp-original.pdf` +
  `samples/sample-ms-original.pdf`, general knowledge, not copied from any real exam) —
  digitized 5/5 questions correctly, all four options each, all five answers matched to
  the right question via a live `/api/digitize` call against the running server (not just
  the standalone script).
- Missing-field validation (`400` when either PDF is omitted) and static file serving
  (`200` on `GET /`) both confirmed live.
- Not yet tested against a real third-party MCQ paper with a denser or less regular layout
  — the trigonometry/free-response samples used to stress-test the other two prototypes
  don't apply here (they have no lettered options). If a real MCQ paper is provided later,
  test against it before trusting this on anything that matters.

## Running it

```
cd prototypes/mcq-digitizer
npm start        # http://localhost:5177
```

Requires `python3` with `pymupdf` (`fitz`) installed (same requirement as
`quiz-digitizer`), and no other dependency.

## Privacy

`samples/` is gitignored — same convention as `exam-grader/samples/` and
`quiz-digitizer/samples/` — since a real user-provided paper could end up there later.
The sample PDFs currently in it are self-authored, not copied from any real source.
