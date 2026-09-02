# "Make the password field visible" needed zero code changes

**No commit** — verified via a live Playwright screenshot instead, no diff.

Asked to "make password field always visible in the admin account page,"
the first step was checking the actual DOM before touching anything:
`app/dashboard/management/page.js`'s `EditAccountForm`'s password `<input>`
has no `type` attribute at all, which defaults to `type="text"` — already
plaintext, never masked. `grep -rn 'type="password"'` across `app/` and
`components/` returned zero matches app-wide (a prior ticket, TKT-0157, had
already fixed the login page the same way).

Rather than reporting "no change needed" as an unverified claim, created a
disposable test account (`ZZTEST Screenshot Proof`, deactivated afterward —
see `20-disposable-test-accounts-and-cleanup-discipline.md`), typed a real
string into the field via Playwright, and screenshotted it rendering as
plaintext, plus read `getAttribute('type')` back as `null` programmatically.

**General lesson**: "is X already true" claims about live UI state should
be verified with a real screenshot/DOM read, not just a code grep — a grep
proves the source doesn't set `type="password"`, but doesn't prove nothing
else (a CSS rule, a JS toggle, browser autofill styling) is masking it in
the actual rendered page.
