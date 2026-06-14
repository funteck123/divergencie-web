# DivergenCIE — Session Bug Reports & Fix Tracker

This file documents issues reported during verification and testing, along with their resolution status.

## Reported Issues

### [CRITICAL] [VULNERABILITY] — Hardcoded Gemini API Key Leaked in Git History
**Location:** [planning/antigravity-sdk-guide.md](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/antigravity-sdk-guide.md#L26) (Lines 26, 99, 135)
- **Finding:** Google Cloud Express / Gemini API key `AQ.YOUR_GEMINI_API_KEY_HERE` is hardcoded in `planning/antigravity-sdk-guide.md` which is tracked by Git. It was introduced in commit `7044739`.
- **Risk:** Anyone with read access to the GitHub repository can clone/access the API key, incurring costs, executing unauthorized API calls, or depleting quotas.
- **Remediation Steps:**
  1. Revoke/delete the key in Google AI Studio or Google Cloud Console.
  2. Replace hardcoded instances in `planning/antigravity-sdk-guide.md` with environment variable lookups.
  3. Purge key from git history using `git-filter-repo` or BFG.

