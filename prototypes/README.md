# Prototypes

Standalone, functioning HTML/JS prototypes for features that will eventually be
integrated into the main DivergenCIE app (`app/`, `lib/`, `components/`) but
are being built and proven out independently first — each one runs on its
own, with its own minimal server if it needs one, no dependency on the
Next.js app's build, routes, or database.

Convention for each prototype: its own subfolder here, a `README.md`
explaining what it does and how to run it, and (if it calls an LLM or any
paid API) an explicit list of required environment variables — never assume
a key already exists just because the main app has similarly-named ones.

## Prototypes

- [`exam-grader/`](exam-grader/README.md) — auto-grades a student's exam
  script against a question paper + mark scheme using a vision LLM, produces
  line-by-line marks/corrections/feedback, exports as Markdown and a branded
  printable report.
- [`quiz-digitizer/`](quiz-digitizer/README.md) — turns any question paper
  PDF into an interactive online quiz (questions found by a vision LLM
  reading the page, not a fixed template), answered live in the browser,
  graded instantly on submit with mistakes shown against correct answers.
- [`mcq-digitizer/`](mcq-digitizer/README.md) — turns a Multiple Choice
  Question paper + its Mark Scheme into an instant auto-graded quiz. Both
  the QP and MS are required upfront. Fully rule-based, no LLM anywhere
  (not even for grading) — a genuinely simpler category of tool than the
  other two, since matching a selected letter to an answer key needs no
  judgment.
