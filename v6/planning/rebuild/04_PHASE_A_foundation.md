# Rebuild — Phase A: Foundation modules

Everything depends on these. Build first. Each module: finish core->repo->service->API->UI green before next.

| # | Module | Owns (schema clusters) | Public contract highlights |
|---|---|---|---|
| A1 | `identity` | User, *Profile, UserType, Department, StaffRole | `getUser`, `resolveRoleDept`, profile reads. Single dept-derivation (kills duplicated `SUBGROUP_PREFIX_TO_DEPT`). |
| A2 | `rbac` | PortalPermission, default-perm table | `can(session, action, resource) -> bool`. ONE authorization mechanism (kills ISSUE-034 bypass + 3 parallel checks). |
| A3 | `lookups` | Cluster-23/3 lookup tables + seed | `seedLookups()` incl. hard-dependency rows (UserType ALL, SessionType meeting types — handoff §53). Fixes ISSUE-025. |

**Suggested brick breakdown (each = one chat):** per module, split into: (core) any
pure derivation/validation rules; (repo) typed CRUD over its owned tables; (service)
the public functions in the table above; (app) endpoints + UI wiring.
