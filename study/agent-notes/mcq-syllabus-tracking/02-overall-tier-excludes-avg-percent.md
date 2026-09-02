# "Overall" leaderboard is volume only, never accuracy

**Commit:** `8cc6121`.

Ranking accuracy (avg% correct) across different subjects isn't a fair
comparison — a student who did 2 hard A-Level Chemistry papers at 40% would
rank below one who did 50 easy IGCSE papers at 90%. That's an artifact of
which papers each one happened to take, not "who's better."

So the Overall tier deliberately shows **volume only** (attempts, unique
papers, unique questions — see `05-by-volume-must-dedupe-by-paper-id.md`),
never avg%. Accuracy comparisons (avg% + total correct) only ever appear once
a Subject/Chapter/Paper scope makes the comparison apples-to-apples by
construction. If a future request asks to "add avg% to the overall
leaderboard," that's very likely a regression of this exact reasoning —
confirm the user actually wants a misleading cross-subject number before
building it.
