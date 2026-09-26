# Question Solver redesign, mock A

`solver-a.html`: one self-contained file (fonts, logo, real question images embedded). Open it in a browser.

Real content only:
- MCQ: Physics Ch1.2 Motion worksheet, 15 questions and answer keys from the live service.
- Theory: 0625 May/June 2026 Paper 42 (question and mark scheme crops).
- Practical: 0625 Feb/March 2026 Paper 62.
- Auto-grader: Q4 of Paper 42 and Q4 of Paper 62 carry real output from the live grader (`/api/grade-structured-question`).
- Library pickers use the real library list. Progress scores and leaderboard names are labelled examples.

Source pieces (`pack.py`, `app.js`, `body.html`, `extra.css`, `build.py`) rebuild the file. `pack.py` needs the local service on :5178.
Feature list this mock is checked against: `study/uiux/dc-question-solver-current-feature-checklist.md`.
