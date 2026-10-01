# Design rules for the new UI

Living file. Every design decision made while building the new UI goes here so the next screen follows it automatically.
Source documents: Brand Design Guidelines v1.0 (BDG), Mockup Guide v2 (MU), `planning/new-ui-migration-plan.md` section 3.

## Foundations (decided)
- **Classic UI is the main UI.** The new UI is an opt-in Beta. One switch for the whole portal, never per page.
- **Light theme only.** Tokens are named by role, not by colour.
- **One shell in every portal:** the two-tier sticky top bar (sketch 1A), bottom navigation on phones (hides on scroll down, shows on scroll up). No sidebar, no icon rail.
- **Colours** come only from `ui2/styles/palette.mjs` (generated into `tokens.css`). No raw hex values in components. Brand colours are the BDG hex codes; derived steps are fixed mixes listed in the palette file.
- **Accessibility fixes to the brand rules (accepted):** gold buttons use navy text (white on gold is 2.08:1); links are navy and underlined (sky is 2.92:1); error text is `#C0392B` (coral is 3.66:1, coral stays a fill); gold and sky are never small text on white.
- **Type:** Inter, tabular numbers for IDs, phones, money and dates. Dense UI scale: 12 px table text, 13 px labels, 14 px body, 16 px reading, 20 to 28 px headings. Sentence case, no ALL CAPS except badges. A*, IGCSE, A Level, Cambridge and DivergenCIE are always written exactly like that.
- **Spacing:** 8 px grid, tokens `space-1` to `space-16`. **Radius:** sm 4, md 8, lg 12, xl 20, full.
- **Breakpoints:** sm 480, md 768, lg 1024, xl 1280. Test widths 375, 390, 768, 1024, 1280, 1440, 1920.
- **Motion:** 150 ms hover and dropdowns, 200 ms sheets, 250 ms page, 300 ms toast in, toasts stay 3 s. Never animate more than two properties. Respect `prefers-reduced-motion`. A loading state shows within 100 ms of any action.
- **Icons:** Lucide, 2 px stroke, 18 to 20 px in buttons, 20 to 24 px in navigation. The same action always has the same icon.
- **Logo:** minimum width 120 px (the full logo is 2.74:1, so at least 44 px tall; the top bar is 56 px), the white version on navy, the near-black version on light, icon only for favicon and tiny spaces, clear space equal to the height of the "D", never stretched, recoloured or shadowed.

## Tables (decided)
- One line per row. All current columns stay (Student table: 21 columns, option A).
- Only long free text may be cut with an ellipsis (Name, Email, Parent Email, School, Location), with the full value on hover and in the record sheet. IDs, phone numbers, status, course and codes are never cut.
- Row height 34 px, cell padding 4 px, header 11 px semibold, Inter tabular numbers for numeric text.
- Two visible row actions plus an overflow menu. Bulk actions only after explicit row selection, capped at 25, names listed, typed confirmation for delete, every one in the audit log.

## Behaviour rules
- Section, filters, sort, view mode, page size and open record live in the URL.
- Destructive actions always ask for a second, deliberate step.
- Optimistic updates for small edits, with a rollback toast on failure.
- Every screen has all of: default, loading (skeleton shaped like the content), empty (label only), error (what happened and what to do), offline, disabled with a reason, no permission.
- Labels only, no helper sentences in the UI.

## Enforcement
- `npm run test` runs the palette contrast test (every text pair at least 4.5:1, controls at least 3:1).
- `npm run guard:classic` fails if the new-UI branch edits a classic file other than the two allowed hooks.
- `npm run parity` compares the new UI with the manifest of the classic UI.

## Decision log
| Date | Decision |
|---|---|
| 2026-10-02 | Shell 1A only; one-line Accounts table option A; light theme only; palette BDG v1 plus derived semantic colours; accessibility fixes accepted; classic stays the main UI; one global toggle. |
