# Syllabus library

Official Cambridge International syllabus booklets, one per subject currently
covered by `prototypes/mcq-digitizer/`'s question library. Downloaded
directly from `cambridgeinternational.org` (never a third-party mirror), each
file named `{level}-{subject}-{code}-{cycle}.pdf`.

Subject list derived from what's actually in
`data/mcq-digitizer/full-library/database.json` (Board/Level/Subject/Subject
Code metadata already embedded in every real QP's own first page) rather than
assumed — this covers every subject the library currently has, no more, no
less.

| File | Qualification | Code | Exam cycle | Source |
|---|---|---|---|---|
| `igcse-physics-0625-2026-2028.pdf` | Cambridge IGCSE Physics | 0625 | 2026, 2027, 2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697209-2026-2028-syllabus.pdf) |
| `igcse-chemistry-0620-2026-2028.pdf` | Cambridge IGCSE Chemistry | 0620 | 2026, 2027, 2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697205-2026-2028-syllabus.pdf) |
| `igcse-biology-0610-2026-2028.pdf` | Cambridge IGCSE Biology | 0610 | 2026, 2027, 2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697203-2026-2028-syllabus.pdf) |
| `a-level-physics-9702-2025-2027.pdf` | Cambridge International AS & A Level Physics | 9702 | 2025, 2026, 2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf) |
| `a-level-chemistry-9701-2025-2027.pdf` | Cambridge International AS & A Level Chemistry | 9701 | 2025, 2026, 2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf) |

Downloaded 2026-08-27. Verified each is a genuine multi-page PDF (not an
error page/redirect) and that its own first page confirms subject, code, and
exam cycle before saving.

**Note on "latest":** two of the three IGCSE syllabuses (Biology, Physics)
are explicitly "Version 2" per their own cover page, meaning Cambridge has
already issued a syllabus update since first publishing the 2026-2028 cycle
document -- these downloads already reflect that update, not the original
v1. Chemistry 0620 is "Version 1" (no update issued yet for this cycle as of
download time). The A-Level Physics/Chemistry syllabuses (9702/9701) are on
an older cycle (2025-2027, not yet 2026-2028) because Cambridge hasn't
published a newer one for these two subjects yet -- confirmed via direct
search, not assumed; re-check cambridgeinternational.org's own subject pages
periodically, since a newer cycle's syllabus can be published without
warning.

**Scope note:** this is deliberately just a document collection, no parsing
or processing of any kind -- that was the explicit ask. If this grows into
something that extracts topic lists, unit numbers, or command-word
requirements from these syllabuses (e.g. to cross-reference against
mcq-digitizer's own per-worksheet "Chapter"/"Topic" tagging), that's separate
future scope, not started here.
