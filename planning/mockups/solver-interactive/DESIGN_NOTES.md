# DC Question Solver — interactive prototype

Built with the `production-mobile-app-from-reference` skill (Fullunit as the
quality bar, not a template). Supersedes the earlier static restyle captures
(`solver-restyle/`) — those were screenshots-as-HTML with no real state;
this is one working app.

## Product loop
Student picks a real paper → answers real questions one at a time → submits
→ gets a real graded score → progress accumulates across attempts.

- **Target user:** a Cambridge IGCSE/A-Level student practicing past papers.
- **Highest-frequency action:** tapping an answer option.
- **Highest-stakes action:** Submit (locks the attempt, computes the real score).
- **Core entities:** Paper, Question, Attempt.
- **State transitions:** not started → in progress (answers accumulating,
  saved after every tap) → submitted (graded, immutable) → reviewed.

## Navigation architecture
Bottom nav (Library / Progress) for browsing. Revision 2: reverted the quiz
and picker to the real live tool's actual structure at the user's request —
**one long scrolling page listing all 15 questions**, not one-at-a-time
screens, and a **real cascading Board → Subject → Component → Paper picker**
(4 selects, matching the live tool exactly), not a tile-browse reinvention.
The v1 one-question-per-screen flow is gone; a sticky top bar (timer,
progress fill, exit) stays fixed while the question list scrolls beneath
it — this part of the v1 app-shell treatment is kept, since it was
independently approved earlier and doesn't change the real page structure.

## Responsive, not phone-locked
The app frame is `max-width:920px`, not a fixed phone silhouette. On a wide
screen the answer grid goes 4-across instead of 2, and the picker's
Subject/Component fields sit side by side — a real responsive layout, not
a mobile app centered in empty grey space.

## Domain-native components (not in the Fullunit reference)
1. **Question stem + A–D grid** — the real exam question image with a
   2×2 tap-target answer grid, sized for touch (≥44px).
2. **Score reveal** — a full-width navy hero with the real computed score,
   the first thing shown on Results.
3. **Resume banner** — "In progress — Question 6 of 15", shown on Library
   only when a real unfinished attempt exists in storage.
4. **Trend sparkline** — a small real inline-SVG line chart computed from
   stored attempt scores, no canvas (canvas pixels don't survive a static
   capture, a real bug found and fixed in the earlier restyle work).

## Real vs. seeded data
- **Real:** all 15 questions and answers for "Ch1.2 Motion Worksheet 1"
  (real images, real correct answers, real board/subject/component/paper
  library list).
- **Seeded, clearly labelled:** two example prior attempts ("· Example" in
  their row) shown on Progress before you take a real test, so the screen
  isn't empty on first load. They're replaced by real data as you use it —
  never presented as real history.
- **Other library papers** (11 more real titles) are listed but not wired
  to real question content in this prototype — tapping one shows a toast
  saying so, rather than fabricating fake questions for them.

## Assumptions made (reversible)
- No login screen — the real tool receives the account via a URL param
  from the portal already; this prototype assumes that's unchanged.
- No artificial loading spinner — the real tool's fetch delay isn't
  simulated since it adds nothing to a design review.

## Visual system
DivergenCIE brand only: navy `#1a3c5e`, gold `#e8a832`, sky `#4a9fd4`,
coral `#e05a4e`, Satoshi, sharp corners (0 radius) — the version you rated
8/10, not the dark bottom-nav experiment (2/10). One typeface throughout,
no gradients, `backdrop-filter` used only for the two sticky bars' blur.
