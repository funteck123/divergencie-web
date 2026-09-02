# The Test-mode "flag for review" checkbox never touches the server

**Commit:** `914d602`.

Asked to "add a flag Q checkbox so student can move ahead and return or
flag doubts" — the natural instinct for "move ahead and return" is a
one-question-at-a-time navigator with prev/next buttons, but that's not
this tool's UI shape.

**Checked the existing render code first**: `renderQuiz()` puts every
question in `#quizItems` as one long scrollable list — there is no
one-at-a-time question navigator anywhere in this prototype, Test mode
included. "Move ahead and return" therefore already works today, by
scrolling. The actual unmet need was just "find a flagged question again
without scrolling the whole paper."

Built accordingly, and deliberately minimal: a checkbox per question
(`.flag-checkbox`, Test mode only, never shown in Practice mode) that adds
a gold border (`.mcq-item.flagged`) and a line above the question list
(`#flaggedSummary`) listing every flagged question number as a
click-to-scroll link. **No server call, no new DB column, doesn't affect
grading or block submission** — purely a client-side, in-memory UX aid that
resets on every fresh `renderQuiz()` call.

**General lesson**: read the actual existing render structure before
assuming a UI feature request implies a specific navigation paradigm — a
"flag to come back to" request assumes one-at-a-time navigation by default
in most apps, but this tool's shape made that assumption wrong, and
building the assumed paradigm would have been unnecessary work.
