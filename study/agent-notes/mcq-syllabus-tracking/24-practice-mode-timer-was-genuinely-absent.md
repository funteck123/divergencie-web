# Practice mode had literally no stopwatch, not a hidden/disabled one

**Commit:** `914d602`.

Before this session, Practice mode's own button copy said "no timer"
explicitly, and the code matched that claim — `#testHeader` (the card
holding the stopwatch display and pause button) was only ever shown when
`quizMode === "test"`; Practice mode's click handler never called
`startTimer()` at all. Checked this before assuming a one-line CSS fix would
do it.

Fix reused the exact same timer functions (`startTimer`/`pauseTimer`/
`resetTimer`/`formatTimer`) already built for Test mode — no new timer
logic needed, just showing `#testHeader` and calling `startTimer()` in the
Practice-mode click handler too, with the header text swapped to "Practice"
via a new `#quizHeaderTitle` span so the same card reads correctly in both
modes.

**Follow-on correction needed**: the button's own label ("Practice mode —
browse questions & answers freely, no timer") became false the moment this
shipped, and had to be updated to "no grading" (still true) in the same
commit — a UI copy claim can silently go stale the instant the feature it
describes changes; check labels/hints near any code being touched, not just
the code's own logic.
