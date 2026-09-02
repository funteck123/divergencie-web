# Why syllabus-digitizer's chapter tier needed zero new parsing

**Commit:** `64e83d0`.

`syllabus_completions.node_key` is a dot-path (`"0"`, `"0.1"`, `"0.1.2"`)
built by `index.html`'s `renderTopicNodes()` when it walks the topic tree.
Its first segment (`node_key.split(".")[0]`) IS the top-level chapter node —
no title-parsing, no regex, no migration needed, computed server-side at
read time in `progress.mjs`'s `chapterOf()`.

This is the opposite situation from MCQ (see
`03-mcq-chapter-needs-two-regex-patterns.md`), where the equivalent
identifier (`paper_id`, a Drive file ID) carries zero structural
information and chapter had to be extracted from a title string instead.
Don't assume the two tools' "chapter" columns are computed the same way —
they're not, and a fix that works for one won't transfer to the other.
