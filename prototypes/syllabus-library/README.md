# Syllabus library

Official Cambridge International syllabus booklets, one per **subject actually
offered as a service** on the DC web app (`services` collection, `Type:
"Course"`), not just the subset `prototypes/mcq-digitizer/` currently
digitizes. Downloaded directly from `cambridgeinternational.org` (never a
third-party mirror), each file named `{level}-{subject}-{code}-{cycle}.pdf`.

Subject list derived from the real, live `services` table (queried directly,
not assumed) — 31 `Course`-type service rows, deduplicated down to 23 real
subjects:
- **5 rows excluded** as non-subjects: `AGENT-0001` (Agent Programme),
  `TEST01` (Multi-Batch Test Subject), and three rows with a blank/placeholder
  Course or Code (`Cambridge`, `Cambridge IGCSE` with no subject attached).
- **A-Level Mathematics is 5 separate service rows** (Pure 1, Pure 3,
  Mechanics 1, Statistics 1, Statistics 2) but **one subject code (9709)** —
  Cambridge publishes one syllabus per code covering every component paper,
  so this is one PDF, not five.

| File | Qualification | Code | Exam cycle | Source |
|---|---|---|---|---|
| `igcse-physics-0625-2026-2028.pdf` | Cambridge IGCSE Physics | 0625 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697209-2026-2028-syllabus.pdf) |
| `igcse-chemistry-0620-2026-2028.pdf` | Cambridge IGCSE Chemistry | 0620 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697205-2026-2028-syllabus.pdf) |
| `igcse-biology-0610-2026-2028.pdf` | Cambridge IGCSE Biology | 0610 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697203-2026-2028-syllabus.pdf) |
| `igcse-business-studies-0450-2026.pdf` | Cambridge IGCSE Business Studies | 0450 | 2026 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697146-2026-syllabus.pdf) |
| `igcse-mathematics-0580-2025-2027.pdf` | Cambridge IGCSE Mathematics | 0580 | 2025–2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/662466-2025-2027-syllabus.pdf) |
| `igcse-ict-0417-2026-2028.pdf` | Cambridge IGCSE Information & Communication Technology | 0417 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697139-2026-2028-syllabus.pdf) |
| `igcse-first-language-english-0500-2027-2029.pdf` | Cambridge IGCSE First Language English | 0500 | 2027–2029 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/718783-2027-2029-syllabus.pdf) |
| `igcse-economics-0455-2027-2029.pdf` | Cambridge IGCSE Economics | 0455 | 2027–2029 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/718148-2027-2029-syllabus.pdf) |
| `igcse-computer-science-0478-2026-2028.pdf` | Cambridge IGCSE Computer Science | 0478 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf) |
| `igcse-accounting-0452-2027-2029.pdf` | Cambridge IGCSE Accounting | 0452 | 2027–2029 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/718141-2027-2029-syllabus.pdf) |
| `igcse-esl-0510-2024-2026.pdf` | Cambridge IGCSE English as a Second Language | 0510 | 2024–2026 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/637160-2024-2026-syllabus.pdf) |
| `a-level-physics-9702-2025-2027.pdf` | Cambridge International AS & A Level Physics | 9702 | 2025–2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf) |
| `a-level-chemistry-9701-2025-2027.pdf` | Cambridge International AS & A Level Chemistry | 9701 | 2025–2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf) |
| `a-level-mathematics-9709-2028-2030.pdf` | Cambridge International AS & A Level Mathematics | 9709 | 2028–2030 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/744634-2028-2030-syllabus.pdf) |
| `a-level-further-mathematics-9231-2028-2030.pdf` | Cambridge International AS & A Level Further Mathematics | 9231 | 2028–2030 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/744603-2028-2030-syllabus.pdf) |
| `a-level-biology-9700-2025-2027.pdf` | Cambridge International AS & A Level Biology | 9700 | 2025–2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf) |
| `a-level-information-technology-9626-2025-2027.pdf` | Cambridge International AS & A Level Information Technology | 9626 | 2025–2027 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/662482-2025-2027-syllabus.pdf) |
| `a-level-computer-science-9618-2027-2029.pdf` | Cambridge International AS & A Level Computer Science | 9618 | 2027–2029 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf) |
| `a-level-economics-9708-2026-2028.pdf` | Cambridge International AS & A Level Economics | 9708 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf) |
| `a-level-business-9609-2026-2028.pdf` | Cambridge International AS & A Level Business | 9609 | 2026–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/697371-2026-2028-syllabus.pdf) |
| `a-level-english-general-paper-8021-2028-2030.pdf` | Cambridge International AS Level English General Paper (AS-only qualification) | 8021 | 2028–2030 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/743333-2028-2030-syllabus.pdf) |
| `a-level-literature-in-english-9695-2027-2028.pdf` | Cambridge International AS & A Level Literature in English | 9695 | 2027–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/721410-2027-2028-syllabus.pdf) |
| `a-level-english-language-9093-2027-2028.pdf` | Cambridge International AS & A Level English Language | 9093 | 2027–2028 | [cambridgeinternational.org](https://www.cambridgeinternational.org/Images/721359-2027-2028-syllabus.pdf) |

23 files, ~25MB total. Downloaded 2026-08-27. Verified each individually:
genuine multi-page PDF (not an error/redirect page), and the document's own
`Syllabus / <Qualification> / <Subject> <Code> / Use this syllabus for exams
in <cycle>` title block (not just the boilerplate accessibility disclaimer
line most of these PDFs share verbatim regardless of actual qualification —
that line always mentions "Cambridge IGCSE" even in A-Level documents, a
Cambridge-side template quirk, not a wrong download) matches the intended
subject/code/cycle exactly.

**"Latest" isn't uniform across subjects** — Cambridge publishes syllabus
updates on its own per-subject schedule, so cycles here range from
2024–2026 up to 2028–2030 depending on the subject. Several are already at
Version 2+ (their own cover page states this), meaning Cambridge issued an
update since first publishing that cycle. Re-check
cambridgeinternational.org's own subject pages periodically — a newer cycle
can be published without warning, independently per subject.

## Math: syllabus included here, but NOT in mcq-digitizer

IGCSE and A-Level Mathematics (and Further Mathematics) syllabuses ARE
collected above like every other subject. But neither is, or can currently
be, covered by `prototypes/mcq-digitizer/`: checked directly against the real
Google Drive source (`data/mcq-digitizer/drive-map/README.md`, built
2026-08-25) and confirmed Math's `Worksheets` folder is organized by exam
**paper** (IGCSE: `Paper 2`/`Paper 4`; A-Level: `M1`/`P1`), not the
`Worksheets/MCQ/{QP,MS}` structure every science subject uses — because
Cambridge Math papers are structured/free-response, not multiple-choice, so
there was never an MCQ folder to find in the first place. Filed as **TKT-0151**
on the real ticket system: build a separate theory/free-response digitizer
for this (and any other non-MCQ subject) once it becomes a priority. Not
started, not scheduled.

## Scope note

This is deliberately just a document collection, no parsing or processing of
any kind — that was the explicit ask. If this grows into something that
extracts topic lists, unit numbers, or command-word requirements from these
syllabuses (e.g. to cross-reference against mcq-digitizer's own per-worksheet
"Chapter"/"Topic" tagging), that's separate future scope, not started here.
