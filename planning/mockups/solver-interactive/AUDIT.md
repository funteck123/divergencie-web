# Audit

## Gate 1 — Visual integrity
Tested at 390×844 (canonical), 390×1200 (taller mobile), 1280×900 (desktop).
No horizontal overflow, no clipped text, no fixed-nav-covers-content, no
empty layout-bug areas, at any of the three.

**Bug found and fixed:** `.mid`, `.t`, `.m` were all bare `<span>` elements
with no `display` declared, so the title and meta line ran together on one
line instead of stacking, and the ellipsis truncation never applied (a long
title and its meta text overflowed the row together). Fixed by making
`.mid` a flex column and `.t`/`.m` block-level. Verified by screenshot
before and after.

## Gate 2 — Interaction integrity
Full real journey run end-to-end via Playwright, not isolated clicks:
open a real paper → start Test → answer Q1, flag it, go next then back
(confirmed the answer and flag both persisted) → quit mid-attempt (real
confirm sheet) → confirmed the Resume banner appeared on Library → resumed
→ answered the remaining 14 real questions → Submit confirm sheet showed
the real unanswered count → submitted → real score computed and shown →
opened a question from the review list in a sheet → closed it → confirmed
the paper now shows "Completed" on Library and the Resume banner is gone →
Progress screen showed the real new attempt in the trend chart and history
→ reloaded the page and confirmed all of it survived in localStorage →
tapped a paper with no cached data and got the honest "not cached" toast
instead of fake content.

**Bug found and fixed:** the question-review sheet (opened from Results)
is tall enough to cover the entire backdrop, so tapping "outside" to close
it had nowhere to land — `click-outside-to-close` silently failed.
Playwright's own retry loop caught this (it kept finding the sheet's own
image intercepting the click). Fixed by adding an explicit close button to
that sheet; verified the click-to-close now works.

Console/runtime: zero errors or warnings across every screen and action
tested.

## Gate 3 — Anti-slop
- Single typeface (Satoshi) throughout.
- No gradients anywhere.
- `backdrop-filter` used exactly twice, both for real sticky-bar blur on
  scroll, not decorative glassmorphism.
- No fake metrics — Progress's numbers, the sparkline, and every score are
  computed from real stored attempts.
- No dead buttons — every visible control was exercised in the Gate 2 run.
- Component variety matches content variety (library rows, mode cards,
  question stem+grid, score reveal, review rows, KPIs+trend+history are
  five distinct shapes, not one card type reused everywhere).

## Gate 4 — Domain fit
Cambridge-style MCQ questions with A–D grid, mark-based scoring, and a
board/subject/component picker are unmistakably exam prep — the app could
not be relabelled for a different industry without real restructuring.

## Revision 2 (post-feedback)
- **Real bug found and fixed:** four gold surfaces (resume button, gold
  mode card, gold buttons) used a dark near-black text color I invented
  (`#1a1200`), directly contradicting the brand doc's own rule ("Primary
  CTA buttons: Gold background with white text", BDG-v1.0 §2.1) and the
  real homepage's own `.btn-gold{color:#fff}`. Fixed to white on every
  gold surface; verified none remain (`grep` for the old hex, zero matches).
- Reverted the picker and quiz to the real live tool's structure per
  explicit feedback (see DESIGN_NOTES). Re-ran the full Gate 1/2 checks
  after the rewrite: 15 real questions render on one page, board/subject
  cascading selects update correctly (verified switching board changes the
  subject list), answers and flags survive re-render, a real running timer
  updates every second, submit computes the real score from only the
  questions actually answered. No console errors, no overflow at 390px,
  920px desktop, or a wide viewport; the answer grid correctly goes
  4-across at desktop width via the responsive breakpoint.

## Known limitations
- Only one real paper (Ch1.2 Motion, 15 questions) has real content wired
  up; the other 11 real library titles are listed but show an honest "not
  cached" toast rather than fake questions.
- Practice mode and structured/Theory papers (with the real auto-grader)
  aren't in this prototype — this covers the MCQ Test loop only.
- The one-question-per-screen quiz layout is a proposed change from the
  live tool's current one-long-page layout — noted in DESIGN_NOTES, not
  silently assumed.
