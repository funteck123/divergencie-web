# Rebuild — Platform Layer (built once, before any feature module)

Shared bricks every module depends on. Each = its own chat/PR.

| Brick | Contract | Notes |
|---|---|---|
| `platform/db` | one `PrismaClient` singleton | Single generated-client path. No Supabase query client. |
| `platform/auth` | `getSession() -> Session \| null`; `requireRole(roles) -> Session` | Supabase Auth reads cookies; role/dept resolved from Prisma at request time (ONE source — kills ISSUE-084). No JWT-metadata denorm. |
| `platform/money` | `Money` value object; currency-aware add/mul/convert | Kills GBP monoculture (ISSUE-045) + amount primitive-obsession. |
| `platform/ids` | branded id types (`UserId`, `SessionId`, ...) | Compile-time wrong-id protection. |
| `platform/result` | `Result<T,E>` + typed error taxonomy | Every service returns this. No throwing across boundaries. |
| `platform/scheduler` | `registerJob(name, fn)`; cron entrypoint | The missing scheduler (ISSUE-092 root). One cron route + `vercel.json`. |

**Gate:** an empty feature module can import all six, typecheck, and run a trivial green
test. No feature work starts until this is true.
