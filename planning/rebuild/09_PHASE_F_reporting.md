# Rebuild — Phase F: Reporting & cross-cutting (depends on everything)

| # | Module | Owns | Notes |
|---|---|---|---|
| F1 | `metrics` | MetricSnapshot, ProgressReport | Real monthly computation per entity (kills ISSUE-028 `Math.random`). 6 KPI categories in json blob (§52.5); per-staff grain, dept aggregated on the fly. |
| F2 | `admin` | generic allow-listed DB endpoint | Rebuilt with RBAC + immutable-field guards (id/passwordHash removed/createdAt). |
| F3 | `audit` | SiteLog, AccessLog | Typed Json fields (ISSUE-072/073); AccessLog revoke symmetry (ISSUE-063). |
