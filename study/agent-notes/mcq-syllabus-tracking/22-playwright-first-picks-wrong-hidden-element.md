# `.card`/`.first()` silently grabbed a hidden element from a different stage

**Found live**, mid-session, while trying to screenshot a specific card on
`public/mcq-digitizer/index.html`'s progress view (stage 4).

`public/mcq-digitizer/index.html` uses a single-page-app pattern: every
"stage" (`#stage0` through `#stage4`) exists in the DOM simultaneously, and
a `.stage.active { display: block }` / `.stage { display: none }` CSS rule
shows only one at a time. Several stages each contain their own `.card`
elements.

`page.locator('.card').first().screenshot(...)` picked the **first** `.card`
in DOM order — which was inside `#stage0` (the hidden library picker),
regardless of which stage was actually active/visible. Playwright's
`.first()` selects by DOM order, not by visibility or z-order, and the
resulting `.screenshot()` call hung retrying "element is not visible" for
the full 30s timeout with no clearer error.

**Fix used**: screenshot a specific, uniquely-`id`'d element instead
(`#progressChart`), or scope the locator inside the specific stage
container (`#stage4 .card`) rather than relying on document-order
`.first()`/`.nth()` across a page with multiple simultaneously-mounted,
selectively-hidden sections.

**General lesson for any future Playwright work against this repo's
single-page prototype tools** (both `mcq-digitizer` and `syllabus-digitizer`
use the same `.stage`-toggle pattern): always scope class-based locators to
the specific visible container's `id`, never to a bare class name that
might match hidden siblings.
