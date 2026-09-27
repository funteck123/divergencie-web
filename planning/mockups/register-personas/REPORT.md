# Register form: two concepts, two personas

TKT-0283. Two full from-scratch design directions for the register/apply page,
each built by a distinct designer identity with a distinct purpose driving
every decision, not two skins on one layout. Both are plain HTML, one page
(no wizard/steps), both keep the site's real intake fields and option lists
(checked against the live Cognito form), both restore the country-code
picker the current live page dropped, and both use CSS Grid deliberately for
the page split and the field rows, not flex approximations.

Files: `persona-A-atlas.html`, `persona-B-iris.html`.

## Persona A — Atlas, systems-minded product engineer

**Identity.** Thinks in forms as data. Distrusts decoration that isn't
carrying information. Has shipped enough intake forms to know the real
enemy is scroll depth and typing, not colour.

**Purpose.** Get a valid submission in the fewest taps, on the smallest
screen, in the worst network conditions. Every pixel earns its place.

**What makes it different, not just darker:**
- Long option lists (`What are you studying?`, `Subjects`, `How shall we
  help?`) collapse behind a native `<details>` disclosure — closed by
  default, one tap opens a chip grid, one tap per choice, one tap closes.
  Nobody scrolls past 38 subjects to reach the next field.
- `How did you hear about us?` and the A* question are segmented button
  groups (radio styled as one solid block), not checkboxes.
- Country-code picker restored, compact (`+44 ▾` next to the number box).
- No card, no panel — a directional scrim across the photo, labels sit on
  it directly with a monospace micro-label style (`IBM Plex Mono`),
  utility blue accent, not brand gold. Reads as a product tool, not a
  brochure page.
- Grid: `grid-template-columns: 1.1fr 1.4fr` desktop split, single column
  under 960px; field rows are an explicit 2-column grid that collapses to
  1 column under 520px.

## Persona B — Iris, brand storyteller / editorial designer

**Identity.** The form is a page in the brand's story, not a database
entry screen. Trained on the homepage's own visual language and wants the
apply page to feel like it belongs to the same site, not a bolted-on
utility.

**Purpose.** Make filling it out feel considered and on-brand, while still
keeping every choice to one tap — warmth and speed aren't a trade-off here.

**What makes it different, not just gold instead of blue:**
- Every option is visible at once as a toggle pill (homepage button
  language: sharp corners, tracked uppercase, gold when selected) — no
  disclosure, no hidden state, just wrapped pills grouped under a gold
  eyebrow label exactly like the homepage's section labels.
- The page is segmented into four named sections (`Application type`,
  `About the student`, `How to reach you`, `What they're studying`, `A
  little more`), each introduced by an eyebrow, divided by a hairline —
  same device as the homepage's section rhythm, not a boxed card.
- Country-code picker restored, same compact treatment.
- Heavy uppercase display type, Satoshi-style scale, gold CTA with the
  homepage's exact shadow treatment.
- Grid: `1fr 1.3fr` desktop split (brand column narrower, form column
  wider to fit the pill wrapping), same collapse rule as Atlas but its own
  breakpoint tuned to pill wrapping (560px) rather than input pairing.

## Comparison

| | Atlas | Iris |
|---|---|---|
| Multi-select mechanism | Click to open, then chip-tap | Always-visible pill-tap |
| Visual identity | Utility, monospace micro-labels, blue accent | Brand, homepage type/eyebrows, gold accent |
| Chrome | None — scrim + frosted inputs only | None — sectioned by hairlines + eyebrows |
| Best fit if... | You want the fastest possible fill-out, especially on phone, and don't need it to look like the rest of the site | You want the apply page to feel unmistakably DivergenCIE, matching the homepage |

## Verified
- Both render with no console/page errors.
- Both have zero horizontal overflow at 390px wide (Iris needed a fix: the
  "Other" free-text input inside a pill was a fixed 80px, shrunk to 44px).
- Field set and every option list matches the live Cognito form field-for-field
  (same lists used across all mockups this ticket).
- Neither is a single enclosing card, per your last note.

## Not yet done
- Neither is wired to the real page (`app/register/page.js`) or the API.
  Once you pick a direction (or a mix), I'll port it in, keeping the real
  validation, submit logic, and the student/interview field-switching
  already live.
- Colour/contrast has only been checked by eye in these screenshots, not
  measured.
