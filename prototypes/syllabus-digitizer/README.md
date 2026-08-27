# Syllabus digitizer

Standalone prototype: turns any Cambridge syllabus booklet PDF collected in
[`../syllabus-library/`](../syllabus-library/) into a browsable topic
outline. Not part of the main app's build.

## Run it

```
cd prototypes/syllabus-digitizer
node server.mjs
```

Open `http://localhost:5177`. Pick a subject from the sidebar; it digitizes
on first click and is cached in memory afterwards.

No API key needed anywhere in this prototype -- unlike `quiz-digitizer` /
`mcq-digitizer`, there's no grading or answer-resolution step here, so no
LLM call at all.

## How it works

`extract_syllabus.py` (PyMuPDF, no LLM call — this is a text/layout
problem, not a judgment problem):

1. Reads the syllabus's own Contents page to find the exact printed-page
   range of the "Subject content" chapter — every Cambridge syllabus in
   this template numbers its chapters and lists them with dot-leader page
   numbers (`3  Subject content .......... 12`), so the boundary is stated
   by the document itself rather than guessed.
2. Within that range, classifies every text line by font weight (all these
   PDFs share one production font family, `HelveticaNeueLTW1G`): `-Bd`
   (bold) = heading, `-Roman` = a sub-label like "Core"/"Supplement"/"Focus
   points", `-Lt` (light) = body/bullet text. This is what tells a heading
   ("1.2 Motion") apart from a numbered learning objective ("1 Define
   speed...") even though both can start with a bare digit — the text
   alone can't tell them apart, only the font can.
3. Groups consecutive same-size bold lines into one heading (a heading
   sometimes prints across two physical lines), reads its `N` / `N.N` /
   `N.N.N` numbering to get its nesting depth, and collects everything
   until the next heading as its content.
4. Folds "1.5 Forces" + "1.5 Forces continued" (a heading reprinted after a
   page break) back into one node instead of showing a duplicate.

`server.mjs` lists the PDFs in `../syllabus-library/pdfs/`, shells out to
the script per subject (cached per filename for the server's lifetime),
and serves a static `index.html` that renders the result as a collapsible
outline with a raw-JSON toggle.

## Known limitations (real, found testing against ~10 of the 44 subjects)

- **One genuine structural outlier**: Global Perspectives' syllabus has no
  chapter literally called "Subject content" (its chapter 3 is "Approaches
  to teaching and learning" — that subject's real content lives inside its
  assessment chapter instead). The tool falls back to whichever chapter is
  numbered 3 and flags the result with `sectionGuessed: true` — checked
  live, only 4 shallow nodes come out for that one subject and the UI
  shows an explicit warning banner rather than silently mislabeling it.
- **Occasional false-positive heading**: a stray bold word or clause
  mid-paragraph (e.g. an emphasised term) can get picked up as its own
  heading node with no numeric code. Harmless (the text isn't lost, it
  just gets its own outline row instead of sitting inside the surrounding
  paragraph) but not fully clean — not chased further, since a handful of
  odd rows per subject didn't seem worth more heuristic complexity for
  what's meant to stay a simple browsing tool.
- **A-Level Mathematics** groups its content by exam component ("Pure
  Mathematics 1", "Mechanics", "Statistics") using a running label at the
  same bold weight as the topic numbers — this can merge into an adjacent
  heading's text rather than showing as its own clean separator. The
  numbered topics themselves (1.1, 1.2, ...) still come out correctly.
- This is a topic **outline**, not a full-text reproduction — intro prose
  before the first numbered heading in the section is intentionally
  dropped, and content lines are reflowed (joined/newlined by a bullet
  heuristic) rather than preserving the PDF's exact line breaks.

## Scope note

Pure structural digitization, no further processing — no cross-referencing
against `mcq-digitizer`'s own topic tags, no export format beyond the raw
JSON toggle in the UI. That's separate future scope if it's ever wanted.
