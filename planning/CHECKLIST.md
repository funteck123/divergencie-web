# Backlog checklist

Working list of known follow-ups. Source of truth for anything not yet
worth a full GitHub issue. Move an item to GitHub (issue or project) once
it's actually being worked, so status/discussion lives in one place.

## Security

- [ ] Rotate production Management admin password (`admin`/`12345` —
      trivially guessable, full access to users/invoices/paychecks/API
      keys). See `planning/PORTAL_CREDENTIALS.md`.

## From Tickets (production, as of 2026-08-06 — see
`study/agent-notes/03-tickets-api-access.md` for how this was pulled)

- [ ] TKT-0003 — Invoice in billing should be month-wise, not subject-wise
- [ ] TKT-0004 — Add parent-email attribute to student account
- [ ] TKT-0005 — Add bulk-enroll services option
- [ ] TKT-0006 — Add search-service option
- [ ] TKT-0007 — Standardize dates as ddmmyyyy
- [ ] TKT-0008 — Schedule image wrong: batch missing, should show "course
      and batch" not "class"; Saudi vs IST timing unclear
- [ ] TKT-0009 — Student needs Trigonometry chapter recordings (IGCSE Maths)
- [ ] TKT-0010 — Worksheet missing for a student

## Infra / process (open questions, not yet decided)

- [ ] GitHub org vs. issues-only for tracking backlog — no `gh` CLI
      installed in this environment yet; decide before automating
      issue/project creation.
- [ ] No CI yet (lint/build check on PRs) — see
      `study/user-notes/02-software-release-and-cicd.md`.
- [ ] No staging branch/environment.
- [ ] No automated tests.
