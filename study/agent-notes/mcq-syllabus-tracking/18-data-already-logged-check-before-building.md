# The attempt-history table needed zero new backend work

**Commits:** `8febfb1`, `1f06eb7`. **Reported by the user** ("can a student
track every attempt history log? every paper every time taken every score
every time taken").

By the time this was asked, every field needed (paper, chapter, score,
timestamp) was already being written to `mcq_attempts` on every submit — it
just had never been rendered anywhere as a literal list, only consumed by
the chart (aggregated into a trend line) and the leaderboard (aggregated
into a rank). The actual work was a client-side table plus one query the
data already supported, not a new tracking mechanism.

**General lesson for this feature area specifically**: before assuming a
"can students see X" question needs new backend/schema work, check what's
already being captured in `mcq_attempts`/`syllabus_completions` and whether
the gap is really "data doesn't exist" or just "nothing renders it yet."
The second is far more likely at this point in the feature's life, and is a
much smaller change.
