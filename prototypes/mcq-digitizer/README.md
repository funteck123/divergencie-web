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

## Library mode: browse instead of upload

The default screen is a picker (Board → Subject → Category → Paper) built from a
pre-built local JSON map of DivergenCIE's own Drive
(`data/mcq-digitizer/drive-map/drive-map.json`, gitignored, built by a one-time crawl --
see `study/agent-notes/08-dc-course-materials-drive-structure.md` and `09-...method.md`).
**This server makes no live Google Drive API/MCP call of any kind** -- the map is a
static file, and picking a paper only triggers a plain HTTPS download of that one paper's
two PDFs by their public Drive link (`GET /api/library` serves the map reshaped into
QP/MS pairs; `POST /api/fetch-and-digitize` downloads + digitizes one pair on demand).
Manual upload (the original flow) is still available as a fallback link.

QP/MS pairing is done by normalizing each filename to a sorted, stopword-filtered token
set (never stripping digits, since a chapter number like "11" vs "11.2" is exactly the
thing that must not collapse together) -- needed because the real Drive data isn't
uniformly named: IGCSE files share a name except for the trailing QP/MS token, but A
Levels Chemistry's QP and MS filenames share no substring at all, just the same words in
a different order/case ("11.2-redox-(ial-cie-chemistry)-qp.pdf" vs
"11.2-Redox-CIE-IAL-Chemistry-MS-MCQ-Unlocked.pdf"). Real result across the whole mapped
library: **186/196 (95%) of QPs paired correctly** with their MS; the other 10 are a
genuine content mismatch in that one folder (some QPs there use a sub-chapter number like
"11.2" their MS counterpart doesn't repeat) and are correctly left unpaired rather than
guessed.

## How it works

1. Either pick a paper from the library, or upload a QP PDF and an MS PDF manually.
2. `extract_mcq.py` (shelled out to by either `/api/fetch-and-digitize` or
   `/api/digitize`):
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

**A second real subject, tested after library mode was added**: `CAIE IGCSE Physics
Ch1.1 Length & Time`. Its MS uses a *different* elimination phrasing than Biology's --
always prefixed with "Answer " (`"Answer B is incorrect..."`, `"Answer A is correct."`),
and sometimes mid-sentence after a connector word (`"Hence, answer B is correct"`),
neither of which the original bare-letter-at-line-start regex caught. Fixed by relaxing
`ELIMINATION_RE`/adding `CORRECT_RE` to match `\b` anywhere in the block text rather than
only `^` at a line start, and by trying a direct "X is correct" statement before falling
back to elimination (more direct when both are present). Result: **16/16 questions found,
4/16 (25%) confidently graded** -- lower than Biology's 65%, and confirmed why by reading
the actual pages: several of this MS's own pages are genuinely near-empty (just the
question-number banner and a page footer, no explanation text at all) -- a real per-
document ceiling, not a parsing gap left on the table.

## Known limitations (honest, real, not hedged away)

- **Auto-grading coverage varies by MS authoring style and is a real ceiling, not a bug
  to keep chasing** -- confirmed on two different real subjects with two different
  elimination phrasings (65% on Biology, 25% on Physics, the latter because several of its
  own pages have no explanation text at all). Whatever isn't resolvable by elimination or a
  direct statement needs actual reading comprehension (an LLM) to close further --
  explicitly out of scope per direction: no LLM, no OCR, in this tool.
- Heading detection (`"1."` bold/≥10.5pt, or `"Question 1"`) is still a heuristic tuned to
  what's been seen so far (three real papers across two subjects + one self-authored
  sample) — a paper with a meaningfully different heading style could still slip past it.
- A question whose own content spans more than 2 pages only gets 2 crop images (start page
  tail + end page head) — a 3+-page single question isn't handled.
- QP/MS filename pairing (library mode) is 95% (186/196) across the whole mapped library --
  the other 5% is a genuine content mismatch in one subject's source files, not a pairing
  bug (see "Library mode" above).
- Not yet tested against a subject/board other than CAIE IGCSE Biology/Physics, or a paper
  using numeric (1/2/3/4) rather than lettered options.
- `/api/fetch-and-digitize` downloads straight from a public Drive link with no size cap
  handling beyond detecting Drive's own HTML interstitial (for files too large for a direct
  link) and failing loudly -- untested against a paper large enough to actually trigger
  that interstitial.

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
