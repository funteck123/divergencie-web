# Question Solver: on-brand concepts (supersedes Nomi/Vesna)

Nomi and Vesna (in `planning/mockups/solver-personas/`) invented their own
palettes and fonts. Rejected. These two use the **real DivergenCIE system**
instead of a new one:

- Exact hex values from the brand doc (`01_BDG_Brand_Design_Guidelines_v1.md`,
  BDG-v1.0): navy `#1A3C5E`, gold `#E8A832`, sky `#4A9FD4`, coral `#E05A4E`.
- The same CSS classes as the live homepage and the earlier full Solver mock
  (`planning/mockups/dc-solver-redesign/solver-a.html`) — `.eyebrow`,
  `.btn-gold`, `.tile`, `.qcard`, `.gscore`, `.mk` — not reinvented.
- Satoshi, sharp corners, uppercase headings with a gold accent word,
  translucent sticky nav — the homepage's actual look, not the doc's
  written Inter/Merriweather spec (the live site itself uses Satoshi; see
  note below).

**One note on a doc/reality gap:** the brand doc specifies Inter (UI) and
Merriweather (body). The homepage you actually ship uses Satoshi. I followed
the homepage, since you asked for "the homepage theme" specifically and
that's what students actually see. Flagging this in case the doc needs
updating, not silently picking one.

They differ only in **picker mechanism** — same "minimal clicks" brief as
before, executed two ways:

## Concept F — Search-first
Type a few letters, arrow keys + Enter, no dropdown chain. Recent/unfinished
papers as one-tap chips with your last score already shown.

## Concept G — Guided, one card
Board → subject → paper reveals in the same card each time, a breadcrumb
trail up top (`IGCSE / Physics / Paper`), never a new page.

Both use the exact same grading panel — real question 4 image, real answer,
real 7/8 grade from the live grader, `.gscore`/`.marks`/`.mk` components
straight from the approved full mock.

## Verified
- Both render with no console/page errors.
- No horizontal overflow at 390px (fixed one bug: the nav links needed the
  real homepage `.links` class to collapse correctly on mobile, not ad hoc
  inline styles).
- Grading data is real, not synthesized — same source as every earlier mock.

## Not yet done
Same scope note as before: this covers the picker and grading screen only,
not MCQ mode/timers/autosave/progress/leaderboard/mistakes mode.
