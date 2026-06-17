# Rebuild — Workflow & the Brick Spec artifact

## Three tiers (prevents context pollution)
```
00_INDEX.md            <- master index, read-only
  05_PHASE_B...md      <- spec chat reads ONLY its phase file
    specs/B1...spec.md <- spec chat WRITES this; build chat reads ONLY this
```
- **Spec chat** loads: its phase file + the relevant schema cluster + the cited handoff
  section. Writes ONE self-contained `.spec.md`. No implementation.
- **Build chat** loads: ONLY that one `.spec.md` + type defs of declared dependencies.
  NEVER a plan file. The spec is a firewall — everything needed is inside it.

## The brick spec template (every build chat starts from one of these)
Committed under `planning/rebuild/specs/<id>.<name>.spec.md`:

```
BRICK: <name>
MODULE: <module>   LAYER: core | repo | service | app
SIGNATURE: <exact TypeScript signature>
INPUT TYPES: <paste exact types — from prisma schema or contracts>
OUTPUT TYPE: <exact type>
RULES: <numbered business rules, each citing handoff section, e.g. §26.6>
MUST NOT IMPORT: <core: prisma, next, supabase — anything with I/O>
DEPENDS ON: <other bricks, BY SIGNATURE ONLY — never their source>
DONE WHEN: <test file path> covers <enumerated cases>, green;
           tsc --noEmit clean; module-boundary lint clean.
```

## Per-brick workflow (each step a separate chat — hard requirement)
1. **Spec chat**: writes the `.spec.md` + enumerated test cases. Commits it. No code.
2. **Build chat** (fresh): given only the spec + dependency signatures. Writes impl +
   tests. Done when green + lint + typecheck. One PR. NEW CHAT PER BRICK.
3. **Review**: review-council checks the single small PR. Small surface = deep review.
4. **Integration chat** (later, per module): given two finished tested bricks + specs.
   Wires via `service/`. Small, because both sides are proven black boxes.

**Context budget per chat:** ~1 spec + ~1 file + N dependency signatures. Never the system.

## Quality gate
A weak spec yields a weak brick. The spec chat's rigor (exact types, enumerated test
cases, cited rules) IS the quality bar. Use B1 (specs/B1.expandRecurrence.spec.md) as
the gold standard every other spec must match in depth.
