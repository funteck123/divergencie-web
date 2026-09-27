# Question Solver: two persona-driven concepts

Same treatment as the register form (Atlas/Iris): two from-scratch UI/UX
directions, each driven by a distinct identity and purpose, both built for
minimal clicks, using **real content** — a real question image, a real
answer, and a real grading result already produced by the live grader
(question 4 of the real Physics May/June 2026 Paper 42, 7/8 marks, same data
used in the earlier full mock). Nothing here is synthesized.

**Scope note:** the Solver has ~130 real features (library picker, MCQ and
structured papers, timers, autosave, progress, leaderboard, mistakes mode —
see `study/uiux/dc-question-solver-current-feature-checklist.md`). Building
two full pixel mockups of all of it would be its own multi-day project, so
these two concepts focus on the two screens that actually decide a UI
direction: the **library picker** and the **question + grading screen**.
Once you pick a direction, the rest of the feature set gets built into it.

Files: `persona-C-nomi.html`, `persona-D-vesna.html`.

## Persona C — Nomi, speedrun-minded student

**Identity.** Has opened this tool 40 times this term and resents every
screen between "open it" and "see a question." Distrusts nested dropdowns.

**Purpose.** Shortest possible path from opening the tool to a marked
answer. Trusts search over menus.

**Mechanism.** One type-ahead box replaces the whole board → subject →
component → type → year chain — type "physics motion," get matching papers
instantly, arrow keys + Enter to open. Unfinished/recent papers are one-tap
chips right below it, each showing your last score. The question and its
grading sit in one dense split view — no separate "result" page, "Enter"
submits. Dark, monospace micro-labels, teal accent — reads as a tool, not
a brochure.

## Persona D — Vesna, calm-focus academic coach

**Identity.** Has watched exam anxiety wreck more scores than weak
knowledge did. Distrusts dense screens and cold verdicts.

**Purpose.** Minimal clicks through progressive disclosure in one place,
never a page change, and a result that reads as coaching, not a scoreboard.

**Mechanism.** One card holds the whole picker: choosing a board reveals
subject tiles in the same card, choosing a subject reveals paper tiles in
the same card — a breadcrumb trail up top, never a new screen. The question
card is spacious, one big "See how I did" button, and the mark breakdown is
framed per-mark as "Earned" / "Not yet," with a "Next time: ..." coaching
line instead of a bare rejection. Warm paper background, serif display
type, sage/terracotta accent.

## Comparison

| | Nomi | Vesna |
|---|---|---|
| Getting to a paper | Type to search, arrow+Enter | Tap board, tap subject, tap paper — one card |
| Density | High — everything visible at once | Low — one thing in view at a time |
| Tone of the grade | Neutral, scoreboard | Coaching, "Next time..." |
| Visual identity | Dark, monospace, teal | Warm paper, serif, sage/terracotta |
| Best fit if... | Returning students who know exactly what they want | First-time or anxious students who want to be guided |

## Verified
- Both render with no console/page errors, no horizontal overflow at 390px.
- The embedded question image, the student's answer, and the full 8-mark
  breakdown (including the one lost mark with the real "needed" text) are
  the exact real data from the live grader — not fabricated.

## Not yet done
- Neither covers MCQ mode, timers, autosave/resume, progress, leaderboard,
  or mistakes mode — those get designed into whichever direction you pick.
- Not wired to the real Solver backend or the live page.
