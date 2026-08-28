# Syllabus digitizer

Standalone prototype: turns any Cambridge syllabus booklet PDF collected in
[`../syllabus-library/`](../syllabus-library/) into a browsable topic tree
of real cropped page images — one per chapter and one per leaf topic —
with the original extracted text kept as a collapsed fallback underneath
each image. Not part of the main app's build.

## Run it

```
cd prototypes/syllabus-digitizer
python3 build_database.py   # first time, and after adding new PDFs to syllabus-library
node server.mjs
```

Open `http://localhost:5177`. Every subject responds instantly (~30ms) --
same pattern as `mcq-digitizer`'s own full-library database: extraction
runs once, offline, into `data/syllabus-digitizer/database.json` (gitignored,
like all of `data/` -- never committed, only the code that builds it), and
the server just serves the finished JSON straight off disk. A PDF added to
the library after the last `build_database.py` run still works immediately
via a live parse -- just not instantly, until the database is rebuilt.

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
   points", `-Lt` (light) = body/bullet text — UNLESS a `-Lt` line is also
   noticeably larger than body text (>=13pt), which is a second, real
   heading style some subjects use instead of bold (found live testing
   Islamiyat and Art & Design: their whole "Subject content" chapter is
   the same light weight throughout, headings included, distinguished only
   by size). Either way, this is what tells a heading ("1.2 Motion") apart
   from a numbered learning objective ("1 Define speed...") even though
   both can start with a bare digit — the text alone can't tell them
   apart, only the font can.
3. Groups consecutive same-size bold lines into one heading, but only
   until the group already reads as a complete "code + title" — a heading
   sometimes prints its bare code and title as two separate physical lines
   (keep merging), but some subjects print each heading complete on one
   line immediately followed by the next one at the same size (stop after
   one line, or two complete headings silently fuse into one garbled
   node). Reads the heading's `N` / `N.N` / `N.N.N` numbering (optionally
   letter-prefixed: `B1`, `C2.1`, `P3` — Co-ordinated/Combined Science
   number their Biology/Chemistry/Physics sections this way) to get its
   nesting depth, and collects everything until the next heading as its
   content.
4. Folds "1.5 Forces" + "1.5 Forces continued" (a heading reprinted after a
   page break) back into one node instead of showing a duplicate.

Two real Contents-page variants are both handled: the chapter is called
"Subject content" in most subjects but "Syllabus content" in some older
ones (Islamiyat, Pakistan Studies), and its TOC line either has a bare
number ("3  Subject content") or a number with a trailing period ("6.
Syllabus content") depending on the syllabus's own production era.

`build_database.py` runs this extraction once for every PDF in
`../syllabus-library/pdfs/` and writes the combined result to
`data/syllabus-digitizer/database.json` -- gitignored, rebuilt on demand,
never hand-edited. It also wipes and regenerates
`data/syllabus-digitizer/images/` from scratch on every run (see "Image
cropping" below) -- rebuilding rather than patching in place avoids
leaving a chapter's old image folder behind under a stale name after a
syllabus cycle renames it.

`server.mjs` lists the PDFs in `../syllabus-library/pdfs/`, serves each
subject from the pre-built database (falling back to a cached live parse
for anything not in it yet), serves the cropped PNGs from
`data/syllabus-digitizer/images/` under `/images/*`, and serves a static
`index.html` that renders the result as a collapsible tree with a
raw-JSON toggle.

### Image cropping (primary content format)

Text extraction alone loses too much: vector line-art (chemical
structures, number lines, flowchart symbols, geometric figures --
confirmed via `page.get_images()` that this template embeds zero raster
images anywhere) disappears entirely, and even plain text has real,
uncorrectable ordering bugs on 2D-typeset notation (see Known
limitations). So instead of extracting text and separately trying to
detect and crop diagrams, `attach_images()` in `extract_syllabus.py` now
crops the syllabus's own actual page content directly, as PNGs, and uses
that as the primary way every topic is shown. Extracted text is still
kept alongside each image, collapsed under a "View extracted text"
toggle, as a searchable fallback.

**Which nodes get an image.** Only two levels of the tree: every
**chapter** (a depth-0 heading, e.g. "2 Thermal physics") and every
**leaf topic** (a node with no children, e.g. "2.1.1 States of matter").
An intermediate sub-heading that has its own children (e.g. "1.5 Forces",
which nests "1.5.1"/"1.5.2"/"1.5.3" under it) does not get its own image
-- its content is already fully covered by its children's images, and
by its own chapter's whole-chapter overview image.

**What each image contains.** A leaf topic's image spans from its own
heading down to the start of the next node in the syllabus (whatever
that next node's level), same window logic the (now-removed) diagram
detector used to use. A chapter's image spans from its own heading all
the way down to the start of the *next chapter* -- i.e. it deliberately
includes everything under it, as one long overview image of the entire
chapter, potentially stitched from many pages. Page crops exclude the
running header/footer margins and are rendered at `IMAGE_ZOOM = 2.0` via
PyMuPDF's `get_pixmap(clip=...)`; when a window spans more than one PDF
page, the per-page crops are stitched into one tall image top-to-bottom
with PIL.

**Where images live.** Real nested folders on disk, mirroring the tree:
`data/syllabus-digitizer/images/{Level}/{Subject}/{Chapter}/{file}.png`
-- e.g. `IGCSE/Physics/2 Thermal physics/2.1.1 States of matter.png`.
Folder and file names are the node's own "code + title", sanitized by
`safe_filename()` (invalid filesystem characters stripped, truncated to
80 chars). Gitignored like the rest of `data/`, regenerated by
`build_database.py`, never hand-edited.

Bonus found live: complex math notation (square roots, fractions) is
also vector-drawn, so a leaf topic with one of these now gets a crisp
image of the actual typeset expression instead of relying on its
(lossy/scrambled, per the limitation below) text extraction.

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
- **Complex 2D math/chemistry notation loses internal order, not just
  formatting.** A fraction, root, exponent, or nuclide symbol (e.g.
  "¹²₆C") is typeset as multiple overlapping text runs positioned in 2D,
  and PyMuPDF's text extraction returns them in an order that doesn't
  always match reading order — so beyond just losing the fraction bar or
  superscript styling (expected), the surrounding numbers can come out
  visibly scrambled (e.g. "estimate 41.3 / (9.79 × 0.765)" extracting as
  "9 79 0 765 41 3", or "¹²₆C" extracting as "6 12C"). Found live
  reviewing Mathematics and Chemistry page-by-page against the source
  PDF. No general fix attempted — this is a real limitation of text-layer
  extraction on 2D-typeset notation, not a heuristic this tool's own
  logic gets wrong.

## Manual page-by-page visual review, 2026-08-28

Full page-by-page comparison of every sampled page (half of each
subject's Subject-content chapter, ~10 pages per composite image) against
the digitized JSON for all 5 IGCSE PCMBE subjects (Physics, Chemistry,
Mathematics, Biology, First Language English), plus a diligence pass on a
further set of previously-unsampled pages per subject to check the fixes
generalize. This is genuine visual inspection of rendered PDF pages next
to the extracted output, not just automated text-completeness checks (see
the Red-teamed section below for why that distinction matters — one bug
found this way was invisible to every automated check that had already
run). Fixed 10 more real bugs beyond the red-team pass, in commits
`85ee6a4` through `d346a7f`:

- **The most serious bug found in this entire project**: Mathematics (and
  separately, A-Level Biology) prints a two-column table's right-hand
  header ("Notes and examples" / "Learning outcomes") in bold — the same
  weight as a real heading. Every single topic in both subjects showed up
  completely empty when expanded, with its ENTIRE real content silently
  misattributed to a generic child node instead. The automated text-
  completeness check couldn't catch this because it flattens the tree
  before comparing — the text was present, just filed under the wrong
  parent. Only found by actually expanding a topic in the rendered UI.
- A third heading font style (`-Md`, medium weight) wasn't recognized at
  all — every depth-2 sub-heading using it was silently flattened into
  its parent's body text.
- Bare chapter-number lines were being discarded by a font-weight-based
  noise filter, giving every top-level chapter `code: null`. Replaced
  with the real signal: a page-number footer sits in the last ~50pt of
  the page; a chapter code doesn't.
- A "Roman" font-family substring check also matched `TimesNewRomanPSMT`
  (used for Greek letters mid-sentence), wrapping real content in fake
  `[...]` labels.
- Chemistry's entire numbered-item convention (bare digits, no
  punctuation, no glyph) produced zero bullets across the whole subject —
  one giant run-on paragraph per topic.
- Chemical ion charges (`CO₃²⁻`) and Mathematics' en-space-separated
  numbered items were each independently misread as bullet breaks or
  silently glued text, using two different real separator/notation
  conventions neither existing check accounted for.
- Three different real running-header boilerplate phrasings leaked
  through as fake labels before all three were found and fixed.

Every fix was re-verified against the same 5-subject page-by-page
completeness check, a title-traceability reverse-check, a stray-glyph
sweep, and a 44-subject full click-through before committing.

## Red-teamed 2026-08-28

Adversarial pass against both the server and the extracted data. Fixed:

- **Two of the largest subjects had a completely flat, broken outline.**
  Co-ordinated Sciences (221 topics) and Combined Science (168 topics)
  number their Biology/Chemistry/Physics sections `B1`/`C2.1`/`P3` instead
  of bare digits — the code regex only matched digit-leading codes, so
  every heading in both subjects got `code: null, depth: 0`, and a
  same-size-merge heuristic additionally fused adjacent complete headings
  ("B2 Cells" + "B2.1 Cell structure") into one garbled node. Together
  these two subjects were ~19% of all topics in the library. Fixed by
  accepting an optional letter prefix in the code pattern and stopping a
  heading group as soon as it already forms a complete code+title match.
- **A corrupt `database.json` used to 500 every subject at once** instead
  of degrading to the live-extraction fallback that already existed for a
  missing key. Now caught and logged; the whole tool keeps working (just
  without the instant response) until the database is rebuilt.
- **Two near-simultaneous requests for an uncached subject could spawn
  duplicate `python3` subprocesses.** The live-extraction cache now stores
  the in-flight promise immediately instead of only the resolved result.
- **The static-file directory check was a string-prefix comparison**
  (`fullPath.startsWith(__dirname)`), not a real path-boundary check —
  not exploitable today, but would silently break against a future
  sibling directory sharing a name prefix. Replaced with a `path.relative`
  check.

Verified clean: path traversal (both API and static-file routes, several
encodings), a real 44-subject click-through in a headless browser with
zero JS errors, and XSS via extracted PDF content (all rendered text is
escaped; the one unescaped field is regex-constrained to digits/dots/letters).

## Image-first pivot, 2026-08-28

Switched the primary content format from extracted text (with cropped
diagrams as a bonus) to real cropped page images as the main way every
chapter and leaf topic is shown, with extracted text demoted to a
collapsed fallback -- see "Image cropping" above for the full mechanics.
Reasoning: text extraction has real, uncorrectable limitations on this
template (all vector line-art is invisible to it, and 2D-typeset math/
chemistry notation can extract in scrambled reading order) that a crop of
the syllabus's own actual page pixels sidesteps entirely.

`/images/*` in `server.mjs` serves the generated PNGs straight off disk
with the same `path.relative`-based traversal-boundary check as the
static-file route, plus a long-lived immutable cache header (justified
since filenames are stable per subject and the whole `images/` directory
is wiped and regenerated on every `build_database.py` run, not patched in
place). Verified the new route serves a real PNG (`curl` + `file`) and
re-ran the full 44-subject Playwright click-through after wiring the UI
up to it: zero JS errors, and the composite screenshots checked below
confirm the images actually render inline as intended, not just that the
route returns 200.

Re-ran the same 5-subject page-by-page completeness check used in the
2026-08-28 manual review pass after this change: all 5 IGCSE PCMBE
subjects (Physics, Chemistry, Mathematics, Biology, First Language
English) still pass cleanly, confirming the underlying text-extraction
pipeline (unchanged by this pivot) has no regression.

## Scope note

Pure structural digitization, no further processing — no cross-referencing
against `mcq-digitizer`'s own topic tags, no export format beyond the raw
JSON toggle in the UI. That's separate future scope if it's ever wanted.
