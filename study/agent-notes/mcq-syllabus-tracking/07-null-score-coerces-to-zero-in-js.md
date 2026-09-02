# `null / totalQuestions` is 0 in JS, not NaN — a real chart bug

**Commit:** `007fa29`.

When practice-mode rows (score: `null`) were added to `mcq_attempts`, the
existing progress-chart code computed percentage as:

```js
function pctOf(a) { return a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0; }
```

`null / 10` evaluates to `0` in JavaScript (`null` coerces to `0` in
arithmetic, it does not produce `NaN` the way `undefined` would). Every
practice session would have silently plotted as a **0% score point** on the
progress chart — visually indistinguishable from a genuinely failed test
attempt. This is exactly the kind of silent-wrong-data bug that's easy to
miss because nothing throws or logs an error.

Fixed by filtering practice rows out of the chart entirely before computing
anything (`renderFilteredProgressChart()`'s `mineGraded` filter) — the chart
is graded-attempts-only; the separate attempt-history table still shows
practice rows, just with `"—"` for score/%.

**General lesson**: any time a nullable numeric field feeds into arithmetic
in JS, check what `null` actually does in that specific operation (`+`,
`/`, `*` all coerce differently) — don't assume it throws or produces
`NaN`. It usually silently becomes `0`.
