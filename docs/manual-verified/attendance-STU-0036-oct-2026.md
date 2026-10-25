# Attendance, student STU-0036, October 2026: the owner's verified data

Snapshot of the owner's own edits to the attendance sheet, taken 2026-10-25 (the sheet was last changed 2026-10-25 12:59 UTC). The owner was still editing. An `x` in the Checked column means the owner has marked that row as checked; a row without one is only unmarked, not necessarily wrong.

**This note is deliberately anonymous.** The repository is public. It names no student, gives no sheet link and no reasons. The full copy with names is kept outside git, in the git-ignored `data/ops-work/` folder.

## How to use this as the sample

- The **Status** column is the owner's decision and is the source of truth. Do not recompute it from system records or from chat text.
- Where a system record disagrees with it, the owner's status wins (Oct 8 was Present in the system and is Held here; Oct 18 Physics was Present in the system and is Cancelled by Student here).
- A sample attendance page should use exactly these statuses and these columns: Date, Duration, Subject, Instructor, Status, Rescheduled date, Note.

## Status vocabulary (the owner's words)

| Status | Meaning as used in this sample |
|---|---|
| Held | The class took place. |
| Teacher on leave | The teacher was away; the class did not run. |
| Cancelled by Teacher | The teacher cancelled the class. |
| Cancelled by Student | The student cancelled, or could not attend. |
| Rescheduled by Teacher | The class moved; the new date goes in the Rescheduled date column. |
| Enrolment not started | Before the enrolment began (first payment pending). Not a missed class. |
| Today / Coming up | Not yet happened. |
| (blank) | Undecided: the owner has not set it. |

A make-up class is its own row with a Duration (2 hours on 17 Oct) and a Note that says what it replaces.

## Counts, 1 to 23 October (43 rows, 32 marked Checked)

| Status | Rows |
|---|---|
| Cancelled by Student | 12 |
| Held | 10 |
| Enrolment not started | 6 |
| Cancelled by Teacher | 6 |
| Teacher on leave | 4 |
| Rescheduled by Teacher | 3 |
| (blank: not decided yet) | 2 |

## The verified table

| Date | Dur | Subject | Instructor | Status | Rescheduled to | Checked |
|---|---|---|---|---|---|---|
| Thu 1 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Enrolment not started |  |  |
| Thu 1 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Enrolment not started |  |  |
| Fri 2 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Enrolment not started |  |  |
| Fri 2 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Enrolment not started |  |  |
| Sun 4 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Enrolment not started |  |  |
| Sun 4 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Enrolment not started |  |  |
| Mon 5 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Held |  | Enrolment started |
| Mon 5 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Teacher on leave |  | x |
| Mon 5 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Teacher on leave |  | x |
| Tue 6 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Teacher on leave |  | x |
| Tue 6 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Teacher on leave |  | x |
| Wed 7 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Cancelled by Teacher |  | x |
| Wed 7 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Cancelled by Teacher |  | x |
| Thu 8 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Held |  | x |
| Thu 8 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Held |  | x |
| Fri 9 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Cancelled by Teacher |  |  |
| Fri 9 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Held |  | x |
| Sun 11 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Held |  | x |
| Sun 11 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Held |  | x |
| Mon 12 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Held |  |  |
| Mon 12 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Rescheduled by Teacher | Pending | x |
| Mon 12 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Rescheduled by Teacher | Sat 17 Oct 2026, about 20:30 | x |
| Tue 13 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Cancelled by Student |  | x |
| Tue 13 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Cancelled by Student |  | x |
| Wed 14 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Held |  | x |
| Wed 14 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Rescheduled by Teacher | Sat 17 Oct 2026, about 20:30 | x |
| Thu 15 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Cancelled by Teacher |  | x |
| Thu 15 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Cancelled by Teacher |  | x |
| Fri 16 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Held |  | x |
| Fri 16 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Cancelled by Teacher |  | x |
| Sat 17 Oct 2026, about 20:30 | 2 | 9702 Physics (make-up class) | M S Akhtar | Held |  | x |
| Sun 18 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Cancelled by Student |  | x |
| Sun 18 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Cancelled by Student |  | x |
| Mon 19 Oct 2026, 17:30 |  | 9700 Biology | H Mir | Cancelled by Student |  | x |
| Mon 19 Oct 2026, 18:30 |  | 9709 Mathematics: Pure 1 | M S Akhtar | Cancelled by Student |  | x |
| Mon 19 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Cancelled by Student |  | x |
| Tue 20 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Cancelled by Student |  | x |
| Tue 20 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Cancelled by Student |  | x |
| Wed 21 Oct 2026, 17:30 |  | 9700 Biology | H Mir | (blank: not decided yet) |  |  |
| Wed 21 Oct 2026, 19:30 |  | 9702 Physics | M S Akhtar | Cancelled by Student |  | x |
| Thu 22 Oct 2026, 18:30 |  | 9701 Chemistry | M S Akhtar | Cancelled by Student |  | x |
| Thu 22 Oct 2026, 19:30 |  | 9709 Mathematics: Statistics 1 | M S Akhtar | Cancelled by Student |  | x |
| Fri 23 Oct 2026, 17:30 |  | 9700 Biology | H Mir | (blank: not decided yet) |  |  |

## Open items

Status still blank (the owner has not decided):

- Wed 21 Oct 2026, 17:30 9700 Biology
- Fri 23 Oct 2026, 17:30 9700 Biology

Status set but not marked Checked yet:

- Thu 1 Oct 2026, 18:30 9701 Chemistry: `Enrolment not started`
- Thu 1 Oct 2026, 19:30 9709 Mathematics: Statistics 1: `Enrolment not started`
- Fri 2 Oct 2026, 17:30 9700 Biology: `Enrolment not started`
- Fri 2 Oct 2026, 18:30 9709 Mathematics: Pure 1: `Enrolment not started`
- Sun 4 Oct 2026, 18:30 9701 Chemistry: `Enrolment not started`
- Sun 4 Oct 2026, 19:30 9702 Physics: `Enrolment not started`
- Fri 9 Oct 2026, 17:30 9700 Biology: `Cancelled by Teacher`
- Mon 12 Oct 2026, 17:30 9700 Biology: `Held`

The owner's own note in a Checked cell: Mon 5 Oct 2026, 17:30 9700 Biology: "Enrolment started". So every class before it is `Enrolment not started`.

## Conflicts left for a person (nothing was changed)

The Timesheet tab (the billing basis) lists these classes as billed. Compared with the verified statuses:

- 05/10 Biology: attendance says `Held` (agrees)
- 08/10 Chemistry: attendance says `Held` (agrees)
- 09/10 Mathematics (Pure 1): attendance says `Held` (agrees)
- 11/10 Chemistry: attendance says `Held` (agrees)
- 12/10 Biology: attendance says `Held` (agrees)
- 14/10 Biology: attendance says `Held` (agrees)
- 14/10 Physics: attendance says `Rescheduled by Teacher` (CHECK)
- 16/10 Biology: attendance says `Held` (agrees)
- 18/10 Physics: attendance says `Cancelled by Student` (CHECK)

Held in attendance but not on the Timesheet tab:

- Thu 8 Oct 2026, 19:30 9709 Mathematics: Statistics 1
- Sun 11 Oct 2026, 19:30 9702 Physics
- Sat 17 Oct 2026, about 20:30 9702 Physics (make-up class)

Other: the Note column still holds older automatic wording that contradicts the Status column on several rows (for example a Held row noted as credit). The Analytics tab still shows the earlier counts, not these.
