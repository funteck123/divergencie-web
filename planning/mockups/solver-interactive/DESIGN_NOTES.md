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
Bottom nav (Library / Progress) for browsing. The quiz itself is a
**full-screen focused task** — nav and chrome disappear, replaced by a
sticky progress bar up top and a sticky Back/Next/Submit bar at the bottom,
one question per screen. This is a deliberate departure from the live
tool's current one-long-page layout, chosen because "one screen, one
purpose" is the skill's explicit standard and better fits a timed test.
**Flagging this clearly: it is a proposed interaction model, not a claim
about what the live tool currently does.**

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
