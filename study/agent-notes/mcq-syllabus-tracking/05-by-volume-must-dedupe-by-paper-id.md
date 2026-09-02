# "By volume" counts unique papers/questions, not a raw sum

**Commit:** `2934028`. **Reported by the user** ("by volume is unique
questions or all attempts x questions?") after the feature already shipped —
the first version answered "all attempts x questions," which was wrong.

`rankByVolume()` originally summed `total_questions` across every row, so
retaking the same 10-question paper 3 times inflated the Overall leaderboard
to 30 "questions answered" instead of 10 — rewarding repetition over actual
breadth of coverage.

Fixed by tracking a per-account `Set<paper_id>` and only adding that paper's
`total_questions` the first time it's seen for that account:

```js
if (!seenPapers.has(row.paper_id)) {
  seenPapers.add(row.paper_id);
  entry.uniquePapers += 1;
  entry.uniqueQuestions += row.total_questions;
}
```

`attempts` is kept as a **separate, unchanged** field (every attempt,
repeats included) — "how many times has this account practiced" is still a
real, distinct signal from "how much of the library have they covered."
Verified via curl: 3 attempts (one paper retaken twice) produces
`attempts: 3, uniquePapers: 2, uniqueQuestions: 25`, not 35.

**General lesson**: when a metric is named "volume" or "coverage," ask
whether repeats should count multiple times before shipping the first
implementation that comes to mind — a plain sum is the naive default and
was wrong here.
