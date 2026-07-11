# Rebuild — Principles, Architecture, Definition of Done

## The 6 non-negotiables
1. **Modular monolith, NOT microservices.** One app, one DB, one deploy. A module =
   a directory with ONE public `index.ts`; nothing outside may import past it. The
   seam is a TypeScript signature, not an HTTP boundary.
2. **Unit of work = ONE CONTRACT, not one feature.** A typed signature + spec + tests.
   The job is "make this signature true and these tests green." Shallow fails tests;
   sprawl is blocked by forbidden imports.
3. **ONE BRICK = ONE CHAT = ONE PR.** A fresh chat sees only its spec + dependency
   signatures (never their source). The agent never holds the whole system.
4. **Depth before breadth.** Finish one vertical fully (core -> repo -> service -> API
   -> UI -> green) before the next. One working brick beats thirty half-built steps.
5. **Pure core has zero I/O.** Business rules are pure functions: no prisma, no next,
   no supabase. Millisecond tests, no DB. This is the layer agents kept failing —
   isolating it makes shallow impossible.
6. **One stack per concern. No bridges.** Prisma only for DB. Supabase Auth only.
   One authorization source. No SQLite, no xlsx, no dead deps.

## Target architecture
```
src/
  modules/<module>/
    contracts/   # types + spec docs — written FIRST
    core/        # pure, zero I/O, exhaustively unit-tested
    repo/        # Prisma adapters — typed CRUD, no business logic
    service/     # orchestrators — compose core + repo, own transactions
    index.ts     # the ONLY public surface
    __tests__/
  app/           # Next.js routes + pages. Thin. Calls module index.ts.
  platform/      # db, auth, scheduler, ids, money, result, errors
prisma/schema.prisma   # KEPT. Single generated-client output.
```

**Boundary rule (lint-enforced):** `app/` and `service/` import `@/modules/<x>`
(its `index.ts`) only. No reaching into another module's core/repo/service.

**Layering rule:** core imports nothing internal; repo imports platform/db + contracts;
service imports own core+repo + other modules' index.ts; app imports service via index.ts.
Dependencies point downward only.

## Definition of "a working Lego brick" (DoD)
A brick is DONE only when ALL hold:
- [ ] Typed contract committed BEFORE code.
- [ ] Imports nothing its layer forbids.
- [ ] Tests cover every enumerated rule case — green.
- [ ] `tsc --noEmit` clean; module-boundary lint clean.
- [ ] No mocks standing in for real logic (a mock = not done).
- [ ] Reviewed by the council on its own small PR.

Partial = not merged. One real brick at a time.
