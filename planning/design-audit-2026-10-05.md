# Design consistency audit, 2026-10-05

Measured in the code with `node scripts/design-audit.mjs` (repeatable, `--json` for detail). Nothing here is a guess.

| Measure | New UI (ui2 + app/v2) | Classic (components, dashboards, login, register, globals) |
|---|---|---|
| Files scanned | 157 | 41 (one file, the Management dashboard, is 8,464 lines) |
| Distinct colours written out as hex or rgb | 24 | 59 |
| Font sizes not taken from a token | 10 | 15 |
| Corner radii not taken from a token | 5 | 3 |
| Spacing values written as px or rem | 25 | 8 (spacing is mostly Tailwind classes) |
| Inline `style={{}}` overrides | 121 in 35 files | 593 in 26 files |
| CSS classes never referenced | 4 | 2 |
| Smallest text | 10 px | 9 px |

The new UI defines 31 colour tokens, 7 text sizes, 5 radii and 8 spacing steps in `tokens.css`. Classic has no such file.

## Reading the numbers honestly
- **Classic:** the worst of it. Colours are spread across 59 literals and 593 inline overrides. Buttons are a mix of `btn` (41 uses) and `btn-ghost` (110 uses) plus Tailwind text sizes (`text-sm` 153, `text-xs` 98, and arbitrary `text-[10px]` and `text-[0.65rem]`). Class-family counts for classic are not meaningful because Tailwind utilities hide them.
- **New UI:** far better, but not clean.
  - 8 of the 24 colours are legitimate data or export colours: the six Syllabus tag colours, and the exported report file that has no theme variables. 6 more are toast text tints and white-on-navy overlays that should be tokens.
  - 121 inline styles are mostly three repeated patterns: `margin: 0` plus the large heading size (18 times), flex wrap (10) and fixed heights (8). They want a shared heading and stack component.
  - 5 raw radii (50%, 999px, 3px, 2px, 0) and 10 raw font sizes, mostly in the exported report and the Syllabus.
  - 4 dead CSS classes, left behind by my recent changes.
- **The earlier count of 82 unused classes was wrong.** It missed dynamically built class names. The corrected figure is 4.

## What to do next (in order of value)
1. **Add the guard.** A check that fails the build on a raw colour, font size or radius in `ui2` outside a short allow-list (tag colours, export file). This stops drift.
2. **Finish tokenising the new UI.** Add tokens for the toast tints and overlays, add a `PageHeading` and `Stack`, then remove the repeated inline styles.
3. **Delete the 4 dead classes.**
4. **Classic.** The new UI is the answer. Moving every role to it, with parity already 595 of 595, retires the 593 overrides instead of patching them.

A visual pass (three directions, pick one, rebuild) is a separate decision. The new UI already has one system and one component set, so the case for redesigning from scratch is weaker here than for classic.
