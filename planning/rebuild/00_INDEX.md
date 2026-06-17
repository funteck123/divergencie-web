# Backend Rebuild — Master Index

> Read-only index. Each chat loads ONLY the file(s) it needs, never the whole set.
> This prevents context pollution: a spec chat reads its phase file; a build chat
> reads only its brick `.spec.md` (never any plan file).

## Principles (read once, then internalise)
See [01_PRINCIPLES.md](01_PRINCIPLES.md) — the 6 non-negotiables + architecture + DoD.

## Phases (load one at a time)
| Phase | File | Scope |
|---|---|---|
| Deletion | [02_DELETION.md](02_DELETION.md) | What to delete first; what to keep & freeze |
| Platform | [03_PLATFORM.md](03_PLATFORM.md) | db, auth, money, ids, result, scheduler |
| A — Foundation | [04_PHASE_A_foundation.md](04_PHASE_A_foundation.md) | identity, rbac, lookups |
| B — Scheduling | [05_PHASE_B_scheduling.md](05_PHASE_B_scheduling.md) | ROOT BLOCKER (ISSUE-092). Bricks B1–B8 |
| C — Attendance/Curriculum | [06_PHASE_C.md](06_PHASE_C.md) | attendance, curriculum, calendar |
| D — Finance | [07_PHASE_D_finance.md](07_PHASE_D_finance.md) | rates, invoicing, payroll, ambassador-comp, ledger, payments |
| E — Operations | [08_PHASE_E_operations.md](08_PHASE_E_operations.md) | tickets, hr, meetings, marketing, referrals, comms |
| F — Reporting | [09_PHASE_F_reporting.md](09_PHASE_F_reporting.md) | metrics, admin, audit |

## Workflow & artifacts
- Brick spec template + how spec/build chats run: [10_WORKFLOW.md](10_WORKFLOW.md)
- Per-brick specs live in [specs/](specs/) — e.g. [specs/B1.expandRecurrence.spec.md](specs/B1.expandRecurrence.spec.md) (gold standard).

## Build order (strict)
1. Pre-flight (rotate secrets, `git tag pre-rebuild`, freeze schema) — see 02.
2. Deletion PR — 02.
3. Platform layer — 03 (gate: empty module typechecks + green).
4. Phase B brick **B1 `expandRecurrence`** first — the proof. Then replicate outward.
5. Phases A→F by dependency depth. Finish each module top-to-bottom before the next.
