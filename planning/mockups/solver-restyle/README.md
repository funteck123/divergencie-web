# Question Solver: real-page restyle (not new mockups)

Every earlier round in this ticket built new markup from scratch. This one
doesn't. It takes the **actual live production DOM and CSS** — captured by
logging into the real portal and running a real paper — and changes only
two things on top of it: sharp corners (0, was 6–10px) and the homepage's
type/weight/tracking/shadow treatment on the same real elements. No new
components, no restructuring, no invented copy.

## How this was built
1. Logged into `www.divergencie.co.uk` as Management, opened the real
   `/mcq-digitizer/index.html?account=...` tool.
2. Fetched a real paper (CAIE IGCSE Physics Ch1.1 Length & Time MCQ
   Worksheet 1), ran a real Test attempt, submitted it.
3. Captured `outerHTML` of the real stage container at four points:
   library picker, mode choice, mid-quiz (answered), results (real score
   8/16, real per-question correct/incorrect).
4. Captured the full real `<style>` block from `public/mcq-digitizer/index.html`
   verbatim (`solver_real.css`, not reproduced from memory).
5. Wrote `restyle.css`, an overlay that touches only: `border-radius`,
   `font-family` (Satoshi, same font files as everywhere else), and the
   weight/letter-spacing/shadow treatment on headings, buttons, the score
   banner and result rows — using classes that already exist in the real
   CSS (`.card`, `.primary-btn`, `.letter-btn`, `.score-banner`,
   `.result-item`, etc.).
6. Assembled four static pages: real DOM + real CSS + the overlay.

## Files
- `solver-restyle-library.html` — the real library picker
- `solver-restyle-mode.html` — the real Practice/Test mode choice
- `solver-restyle-quiz.html` — a real question mid-attempt, options answered
- `solver-restyle-results.html` — the real results screen (8/16, real per-question rows)
- `restyle.css` — every visual change, isolated in one file, diffable
  against `solver_real.css`-equivalent (the live tool's own `<style>` block)

## Two real bugs found and fixed along the way (not invented issues)
- The live library picker's Component+Mistakes-Mode row has no `flex-wrap`
  in its inline style — fixed with a wrap rule.
- The bare `<select>` for Paper has no `width`, so a long option
  ("CAIE IGCSE Physics Ch1.1 Length & Time (MCQ) Worksheet 1") makes the
  browser size the select to fit it, overflowing on a phone. Fixed with
  `select { width: 100% }`. Worth checking whether this also happens on the
  live site at phone width — it's plausible it does today, unrelated to
  this restyle.

## Verified
- No console/page errors on any of the four.
- No horizontal overflow at 390px, after the two fixes above.
- All content (question images, options, score, correct/incorrect per
  question) is the real data from that real attempt — nothing synthesized.

## Not done
- Progress/leaderboard page (the click to reach it didn't land in this
  capture session — can redo if you want it added).
- Two small pre-existing quirks in the live tool, left as-is since they
  aren't part of this restyle's scope: a missing flag-emoji glyph renders
  as a tofu box, and a "Question" tab label appears styled as a plain link
  in Test mode.
