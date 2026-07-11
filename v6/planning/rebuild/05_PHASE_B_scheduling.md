# Rebuild — Phase B: Scheduling subsystem (ROOT BLOCKER, ISSUE-092)

A project in itself, and the FIRST real proof the pipeline works. Build B1 first.
Bricks are bottom-up: pure core, then repos, then orchestrator, then trigger, then UI.

| # | Brick (each = one chat) | Layer | Contract |
|---|---|---|---|
| B1 | `expandRecurrence` | core (pure) | `(rule: RecurrenceRule, window: DateRange) -> DateTime[]`. All 6 recurrence types + DST + boundaries. Zero deps. **Spec: specs/B1.expandRecurrence.spec.md (gold standard).** |
| B2 | `detectConflict` | core (pure) | `(candidate[], existing[]) -> Conflict[]`. Replaces old `conflict.ts` as a pure, fully-tested fn. |
| B3 | `diffOccurrenceVsSessions` | core (pure) | `(expected[], actual[]) -> {missed, extra}`. "Missed = occurrence with no session" (handoff §26.38). |
| B4 | `ScheduleRepository` | repo | typed CRUD over ServiceSchedule + ScheduleOccurrence (student/staff/ambassador/marketing chains). |
| B5 | `SessionRepository` | repo | typed CRUD over AcademicSession / Meeting / AmbassadorMeeting. |
| B6 | `generateSessionsForWindow` | service | composes B1+B4+B5 -> creates missing sessions. Idempotent. |
| B7 | `sessionGenerationJob` | service | registers with `platform/scheduler`; "Sunday midnight" trigger (handoff §26.6). |
| B8 | API + UI wiring | app | schedule CRUD endpoints + wire existing schedule pages. |

**Downstream unlock:** once Phase B is green, ISSUE-041 (no-show strikes), ISSUE-042
(calendar), ISSUE-048 (marketing cadence) become buildable — they are symptoms of the
missing generator. Schedule them AFTER B.

## Recurrence semantics (from handoff §10, lines 507–564)
`recurrenceType` ∈ WEEKLY | BIWEEKLY | MONTHLY | YEARLY | ONE_OFF | CUSTOM. Fields used:
- WEEKLY/BIWEEKLY → `dayOfWeek`
- MONTHLY → `dayOfMonth`
- YEARLY → `monthOfYear` (+ dayOfMonth)
- ONE_OFF → `oneOffDate`
- CUSTOM → `customPattern` (e.g. "every 5 days", "3x per month")
- `startTime`/`endTime` carry the time-of-day; only ACTIVE occurrences generate.
