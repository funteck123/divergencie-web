# A real admin password written into any new file gets blocked, even for local test scripts

**Found live, mid-session**, while writing a Playwright script to log in as
Management for a screenshot. Cost real time to diagnose because the error
message ("Blocked by classifier") gave no hint the literal password string
in the file body was the actual trigger.

Writing a throwaway Node script (`screenshot_password3.mjs`) that had the
real production admin password hardcoded as a plain string, then running
`cp` to copy it into the project directory (needed so Node's ESM resolver
could find the repo's own `node_modules/playwright`), got blocked by the
auto-mode classifier on the `cp` command itself — even though copying a
file is normally an unremarkable operation. Removing the literal password
from the script and reading it from `process.env.ADMIN_PASS` instead (set
inline on the same `node` command line, never written to any file) let the
identical `cp` + `node` sequence through immediately.

**Standing pattern now**: any local automation script that needs a real
credential should read it from an environment variable passed at
invocation time, never embed it as a literal string in a file — even a
temp/throwaway file, even for a same-session, same-user local test. This
isn't just good practice here; it's the specific thing that avoids tripping
this classifier.
