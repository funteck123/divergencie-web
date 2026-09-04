# mcq-digitizer: question search (exact text first, semantic later) — plan

Status: **plan only, not built.** Ticket: TKT-0237.

## The request, as given

> can you build a way to vector retrieve question search by text semantic
> similarity but first we just do direct question search based on text
> extraction/ocr ... it must be fast

Two phases, explicitly sequenced by the user:
1. **Phase 1 (build first)**: direct/exact text search over question content
   (keyword or substring match), sourced from real extracted text — not OCR
   unless a question genuinely has no text layer to extract from.
2. **Phase 2 (later)**: vector/semantic similarity search over the same
   corpus, so a search finds conceptually similar questions even when the
   wording doesn't match exactly.

## Real finding that changes Phase 1's actual scope

Checked before planning, not assumed: **no question-level text is persisted
anywhere in this tool today**, for either paper type.

- **MCQ papers** (`data/mcq-digitizer/full-library/database.json`, 195
  papers / 5775 questions): each question record is
  `{questionNumber, optionLetters, correctAnswer, source, imagePaths}` --
  the actual stem/option wording is never saved as text. `extract_mcq.py`
  computes each question's crop boundary from the QP's real PDF text layer
  internally (that's how it finds question boundaries and option letters at
  all), then renders that region straight to a PNG and **discards the text
  it just read**. So today's "search" would have literally nothing to
  search MCQ question content by -- not a missing index, a missing field.
- **Structured papers** (Mathematics, `extract_text.py`, added this
  session): only whole-PDF-page text exists, no per-question split (matches
  the existing decision that Math grading is worksheet-level, not
  per-question -- see TKT-0236's structured-grading work).

This means Phase 1 is really two pieces of work, not one:
- **1a. Backfill: persist real text per question**, not just a fresh index
  on top of what already exists.
- **1b. The actual search**: index + query interface over that text.

## Where OCR actually fits (it's the fallback, not the default)

`extract_mcq.py` already documents (see its own comment near the
`has_image_content`/`has_drawing_content` check) that a real, confirmed
subset of MCQ questions have their options rendered as a diagram, table, or
infographic with **no text layer at all** -- no regex or plain text
extraction can read those, by design (this tool has never used OCR/LLM on
the QP side). For those questions specifically, and only those, Phase 1
needs an actual OCR pass (e.g. Tesseract or a vision-model call) on the
cropped question image to get any searchable text at all. Everything else
already has a real PDF text layer sitting right there in the same file this
tool already opens with PyMuPDF -- pulling `page.get_text("text", clip=bbox)`
for each question's already-known crop region is the correct fix for the
vast majority of questions, not a general "run OCR on everything" pass.
Confirming the real split (text-layer vs. image-only) across the whole
5775-question corpus, and how many structured-paper pages have no text
layer either, is real Phase-1a groundwork -- not assumed here, to be
measured before committing to an OCR volume estimate.

## Phase 1 architecture -- "must be fast"

Corpus size is small in absolute terms (order of 6,000 MCQ questions today,
growing slowly; Math adds page-level text, currently a few hundred pages).
That changes what "fast" requires:

- **No database, no network round trip, no heavy dependency.** A
  precomputed JSON index loaded into the standalone server's own memory at
  startup (same pattern as `databaseCache`/`pdfTextCache` already in
  `server.mjs`) is enough -- an in-memory inverted index (token -> list of
  question/page IDs) answers a query in microseconds, not milliseconds,
  for a corpus this size. This matches the project's existing ethos (no
  Express, no framework, no dependency not already justified by a real
  need) rather than reaching for SQLite FTS5 or a search service that this
  scale doesn't need.
- **Index built offline, not per-request.** A new build step (extending
  `answer_resolver/build_full_database.py`'s existing offline-rebuild
  pattern, or a new sibling script) walks every paper, extracts/persists
  question text (1a above), and writes a search index artifact
  (`data/mcq-digitizer/search-index/index.json`) alongside the rebuild --
  same "rebuild is a manual, deliberate step" pattern already established
  for `database.json`.
- **New endpoint**: `GET /api/search?q=...` on the existing standalone
  server, proxied through `app/api/mcq/[...path]/route.js` exactly like
  every other endpoint (no changes needed there -- confirmed, it's a
  generic pass-through already). Returns matched questions with a snippet,
  paper title, and a way to jump straight to that paper (existing
  `qpId`/`msId` the frontend already knows how to open).
- **Frontend**: a search box in `public/mcq-digitizer/index.html`'s stage0,
  alongside the existing board/subject/component picker -- an alternative
  entry point into the same library, not a separate tool.

## Phase 2 (semantic) -- sketched now, not built

- **Embeddings**: compute once offline per question/page (same rebuild
  step as Phase 1's index), cache to a binary/JSON file alongside it. Given
  the corpus size, a free or low-cost embedding model via OpenRouter (or a
  local sentence-transformers model, avoiding any per-query API cost) both
  work -- worth benchmarking both for quality vs. build-time cost once
  Phase 1's real text corpus exists to embed.
- **Retrieval**: brute-force cosine similarity over all cached vectors,
  computed at query time in the same in-memory server process. At a few
  thousand vectors this is genuinely fast (single-digit milliseconds) --
  no vector database needed at this scale. Revisit only if the corpus
  grows an order of magnitude past what brute-force comfortably handles.
- **Ranking**: likely hybrid (keyword hits boosted, semantic similarity as
  fallback/re-ranking) rather than semantic-only, so an exact phrase match
  still wins over a loosely-related one -- a real design decision to make
  once Phase 1's real usage patterns are visible, not assumed now.

## Open questions (not blocking Phase 1a/1b start, but worth a decision before UI work)

1. **Who is this for** -- students searching for practice on a topic
   (surfaced in the main mcq-digitizer UI), Management/content review
   (finding what's already digitized before assigning new topics), or
   both? Shapes where the search box lives and what's shown per result.
2. **Scope of "question" for structured papers** -- until a real
   per-question splitter exists for non-MCQ content (out of scope here,
   separate real project), should structured-paper search results be
   page-level ("this page of this worksheet mentions X") rather than
   question-level? Recommend yes, rather than blocking Math from being
   searchable at all until a splitter exists.
3. **OCR volume** -- needs the real corpus measurement mentioned above
   before committing to a specific OCR tool/cost; flagging as unknown
   rather than guessing a number.

## Recommended sequencing

1. Measure the real text-layer-vs-image-only split across the corpus (no
   guessing).
2. Build 1a (persist real per-question/per-page text, OCR only where no
   text layer exists).
3. Build 1b (index + `/api/search` + search box UI).
4. Ship Phase 1, gather real usage.
5. Only then start Phase 2 (embeddings + semantic ranking), informed by
   what Phase 1's real query patterns actually look like.
