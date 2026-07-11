# Rebuild — External Standards We Follow (and honest gaps)

> Devil's-advocate audit result: the plan's *substance* aligns with recognised
> patterns, but it originally used invented vocabulary ("brick") instead of citing
> them. This file binds every plan decision to a named external standard, and flags
> where we deliberately deviate.

## Standards the plan maps onto

| Plan element | Recognised standard | Source |
|---|---|---|
| One app, one DB, hard internal seams (not microservices) | **Modular Monolith** | dev.to "Return of the Modular Monolith"; MS Learn talk |
| Modules own their data; cross-module only via public API | **Domain-Driven Design** bounded contexts | DDD (Evans); Wikipedia: Microservices §DDD |
| `core` (pure) vs `repo`/`app` (I/O) — dependencies point inward | **Hexagonal / Ports & Adapters** (Cockburn); **Clean Architecture Dependency Rule** (Martin) | Wikipedia: Hexagonal architecture |
| Vertical slice per module (own its full stack) | **Vertical Slice Architecture** | MS Learn "Clean Architecture, Vertical Slices & Modular Monoliths" |
| `service/` returns `Result<T,E>`, no throwing across boundaries | Ports & Adapters boundary discipline | (same) |
| Pure-core unit tests, repo integration tests, few E2E | **Test Pyramid** (Cohn/Fowler) | martinfowler.com/articles/practical-test-pyramid.html |
| Module `index.ts` as the only import surface; verified | **Contract Testing** at boundaries | martinfowler.com (integration contract tests) |
| 12-factor env/config/secrets handling | **Twelve-Factor App** | Wikipedia: Twelve-Factor App |
| One stack per concern, delete alternatives | Self-Contained System tech-isolation principle | Wikipedia: Self-contained system |

## Naming correction (adopt standard vocabulary)
- "brick" → **component** / **unit of work**, but tagged by its architectural role:
  **use case** (service), **adapter** (repo), **domain function** (core).
- "module" stays — it IS the DDD bounded-context / vertical slice.
- Keep `core / repo / service / app` but understand them as
  **domain / adapter / use-case / delivery** (Clean Architecture rings).

## Where we DEVIATE on purpose (and why)
1. **No separate domain-entity layer / no full Onion rings.** 185 Prisma models already
   ARE the schema; we do not hand-write mirror domain entities. We keep pure *functions*
   over plain types, not an OO entity model. Reason: avoid the Clean-Architecture
   over-engineering Reddit/DEV threads warn about for CRUD-heavy apps.
2. **Repos return Prisma types, not re-mapped DTOs**, except where a `contracts/` type is
   needed for a pure-core boundary. Reason: mapping every row to a DTO is ceremony with
   low payoff here; we pay that cost only at the core boundary that must stay I/O-free.
3. **Test shape is pyramid-leaning, not honeycomb.** Because the value is in pure logic
   (recurrence, money, lifecycle rules), we weight unit tests heavily. Integration tests
   exist per repo; E2E is thin. (Fowler notes honeycomb suits integration-heavy systems —
   ours is logic-heavy, so pyramid fits.)
4. **No API versioning / no inter-service contracts.** Single deploy; the only contracts
   are in-process function signatures. We are NOT distributed, by deliberate choice.

## What this does NOT claim
This is not certified compliance with any single framework. It is an intentional,
cited *composition*: Modular Monolith + DDD bounded contexts + Hexagonal dependency
rule + Vertical Slices + Test Pyramid + Twelve-Factor config. Each is mainstream and
sourced above; the deviations are explicit so they are reviewable, not accidental.
