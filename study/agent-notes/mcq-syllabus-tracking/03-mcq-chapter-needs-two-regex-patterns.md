# MCQ chapter extraction needs two regexes, not one

**Commit:** `8cc6121`.

`mcq_attempts.paper_id` is an opaque Google Drive file ID — no chapter info
in it at all. Chapter lives in the paper's *title*, which the client already
has from the library listing at fetch-and-digitize time.

Checked all 196 real papers in the live library (2026-09-02) before writing
any parsing code: 100% parse via exactly two patterns, tried in order —

```js
const CHAPTER_PATTERNS = [/Ch(\d+(?:\.\d+)?)/i, /^(\d+(?:\.\d+)?)[-\s]/];
```

Every subject titles papers `"...Ch1.1..."` **except A Levels Chemistry**,
which instead leads with a bare `"1.1-topic-name..."` — no "Ch" prefix at
all. Real, confirmed naming inconsistency between subjects in the source
Drive library, not a typo. If a new subject is added to the library later
and its chapter tab shows up empty/null in the leaderboard, check its paper
titles against both patterns before assuming the extraction code is broken —
it may be a third naming convention neither pattern covers yet.

A title matching neither pattern stores `chapter: null` rather than
guessing, and that attempt is simply excluded from chapter-scoped
leaderboard/progress views (not a crash, not a wrong guess).
