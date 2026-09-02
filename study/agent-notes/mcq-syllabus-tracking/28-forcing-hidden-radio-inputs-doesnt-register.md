# `.check({force:true})` on a hidden radio input doesn't count as "checked" to the app

**Found live**, verifying the new mistake-tracking feature — cost real
debugging time because the symptom (zero mistakes recorded despite a real
0/16 score) looked like a server-side bug, and the server-side logic was
actually correct.

`public/mcq-digitizer/index.html`'s letter-selector UI hides the real
`<input type="radio">` (`.letter-btn input { display: none; }`) and shows a
styled `<label>` instead — clicking the label is what a real user does, and
what fires the app's own `change` listener that toggles the `.selected`
CSS class.

Playwright's `page.locator('input[type=radio]').check({ force: true })`
sets the DOM `checked` property directly, bypassing the label entirely.
This looked like it worked (no error, no timeout) — but the grading code
reads selection via `document.querySelector('input[name="q..."]:checked')`,
and every question came back with `verdict: "unanswered"` regardless of
which option was force-checked. Confirmed by dumping `results.map(r =>
r.verdict)` via `console.log` inside the submit handler: all 16 entries
were `"unanswered"`, not `"correct"`/`"incorrect"` as intended.

**This was a real, reproducible bug in the *test*, not the app** — every
score of "0/16 all unanswered" earlier in this session (going back to the
very first MCQ end-to-end test) was silently hiding this same issue; it
just didn't matter for what was being verified at the time (attempt-saving
plumbing, not grading correctness).

**Fix**: click the visible `.letter-btn` label instead of the hidden
input:

```js
const letterBtns = item.locator('.letter-btn');
await letterBtns.nth(letterIndex).click();
```

**Standing rule for any future Playwright test against this prototype's
quiz UI** (or any UI in this repo using the hidden-input-plus-styled-label
pattern): never `.check({force:true})` a custom-styled form control
directly — click the visible element a real user would click, and verify
the resulting `verdict`/state is what you expect before trusting a test
result built on top of it.
