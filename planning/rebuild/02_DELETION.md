# Rebuild — Pre-flight & Deletion (do this FIRST, one PR)

## Pre-flight (before deleting anything)
1. **Rotate every secret in `.env`** — Supabase service-role key, DB password, Stripe
   secret, GitHub PAT are all in the working tree (ISSUE-050 = prior leak). Rotate,
   confirm `.env` is gitignored.
2. **Tag current state:** `git tag pre-rebuild` — old backend recoverable for reference.
3. **Freeze the schema** — the 185-model `prisma/schema.prisma` is THE contract.
   Schema-drift issues (#55–90) are folded into each module's repo brick, not patched ad hoc.

## Delete
- `src/lib/actions/` — all 26 action files.
- `src/app/api/**/route.ts` — all 54 route handlers (rebuilt per module behind contracts).
- `src/lib/auth-client.tsx`, `auth.ts`, `db.ts`, `db-init.ts`, `supabase.ts`,
  `conflict.ts`, `rbac.ts`, `ticketPermissions.ts`, `whatsapp.ts` — rebuilt as
  `platform/*` and module code with single clean implementations.
- `prisma/generated/` — duplicate 18MB client (ISSUE-085).
- Deps: `xlsx`, `@types/ws`, `bcryptjs`, `@types/bcryptjs`; `better-sqlite3` in
  `next.config.ts` (ISSUE-086/087/088/089). Drop `User.passwordHash`.
- `scratch/` one-offs, `cookies.txt`, stale root docs.

## Keep & freeze
- `prisma/schema.prisma` (185 models).
- `src/app/**/page.tsx` + `src/components/**` (UI — rewired later, not deleted).

**After this PR the backend does not build. Intended.** Rebuild upward from a clean slab.
