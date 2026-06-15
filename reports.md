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

---

## Active Issue Tracking

The 18 identified system bugs, UI issues, and database tasks are tracked in separate GitHub Issues:

1. **[#2](https://github.com/funteck123/divergencie-web/issues/2) ISSUE-001 (UI-Mobile):** ARE YOU? heading size too small & THEY'RE WATCHING cuts off on mobile
2. **[#3](https://github.com/funteck123/divergencie-web/issues/3) ISSUE-002 (UI-PC):** OUR CO-CONSPIRATORS heading wraps to 4 lines on desktop
3. **[#4](https://github.com/funteck123/divergencie-web/issues/4) ISSUE-003 (UI-Aesthetics):** Dark mode scroll bounce, gold color mismatch, ResultsTicker background
4. **[#5](https://github.com/funteck123/divergencie-web/issues/5) ISSUE-004 (UI-Nav):** Increase Nav bar transparency by 25%
5. **[#6](https://github.com/funteck123/divergencie-web/issues/6) ISSUE-005 (Branding):** Set DivergenCIE logo as favicon / site logo on Vercel
6. **[#7](https://github.com/funteck123/divergencie-web/issues/7) ISSUE-006 (Perf):** Optimize page speeds without losing UI/functionality
7. **[#8](https://github.com/funteck123/divergencie-web/issues/8) ISSUE-007 (Management-Budget):** Budget tab loads indefinitely
8. **[#9](https://github.com/funteck123/divergencie-web/issues/9) ISSUE-008 (Management-Tickets):** Ticket creator Assign to department gating logic
9. **[#10](https://github.com/funteck123/divergencie-web/issues/10) ISSUE-009 (Tickets):** Ticket attachments link opens relative path instead of new tab
10. **[#11](https://github.com/funteck123/divergencie-web/issues/11) ISSUE-010 (Tickets):** Increase height of ticket chat history and reply window
11. **[#12](https://github.com/funteck123/divergencie-web/issues/12) ISSUE-011 (Staff-IT):** IT Roadmap tab 404 error and logout
12. **[#13](https://github.com/funteck123/divergencie-web/issues/13) ISSUE-012 (Staff-IT):** IT ticket assign shows no eligible member found
13. **[#14](https://github.com/funteck123/divergencie-web/issues/14) ISSUE-013 (Tickets):** Ticket reply blocks further replies and shows processing flow
14. **[#15](https://github.com/funteck123/divergencie-web/issues/15) ISSUE-014 (Database):** Supabase DB cleanup: remove .com users, keep .co.uk users
15. **[#16](https://github.com/funteck123/divergencie-web/issues/16) ISSUE-015 (Management-RBAC):** Parent profile missing in left navigation access matrix
16. **[#17](https://github.com/funteck123/divergencie-web/issues/17) ISSUE-016 (Management-Finance):** Management make invoice link gating and claims review redirect
17. **[#18](https://github.com/funteck123/divergencie-web/issues/18) ISSUE-017 (Finance-CLI):** Payout button logic and CLI test scripts
18. **[#19](https://github.com/funteck123/divergencie-web/issues/19) ISSUE-018 (Docs):** Update payment guide info
19. **[#20](https://github.com/funteck123/divergencie-web/issues/20) ISSUE-019 (Parent-Finance):** Server-side authorization role mismatch on payInvoice
20. **[#21](https://github.com/funteck123/divergencie-web/issues/21) ISSUE-020 (Parent-Finance):** Unbound payment reference input on fees page
21. **[#22](https://github.com/funteck123/divergencie-web/issues/22) ISSUE-021 (Parent-Finance):** Dead links and mocked receipt downloads on parent fees page

---

## Detailed New Issues

### ISSUE-019: Server-side authorization role mismatch on payInvoice
**Location:** [page.tsx:331](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/fees/page.tsx#L331) and [billing.ts:11](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/billing.ts#L11)
- **Finding:** Page runs under parent session but invokes `payInvoice(id)`. Server action restricts access to `staff` and `management` roles.
- **Risk:** Server throws "Forbidden" error. Parent cannot mark invoice paid. Modal hangs on "Processing..." because `onClick` lacks error handling.
- **Options:**
  - **A)** Route payment confirmation to [submitManualPaymentReceipt](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/billing.ts#L38) instead (allows general authenticated users).
  - **B)** Grant parent role access to [payInvoice](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/billing.ts#L7) (security compromise).
  - **C)** Leave as-is.

### ISSUE-020: Unbound payment reference input
**Location:** [page.tsx:323](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/fees/page.tsx#L323)
- **Finding:** Transaction ID / UTR input has no state binding or change listener.
- **Risk:** Entered UTR reference is discarded. Staff cannot track or reconcile bank transfers.
- **Options:**
  - **A)** Add React state to bind input value. Pass reference parameter to server action.
  - **B)** Remove input field.
  - **C)** Leave as-is.

### ISSUE-021: Dead links and mocked receipt downloads
**Location:** [page.tsx:197](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/fees/page.tsx#L197), [page.tsx:219](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/fees/page.tsx#L219), and [page.tsx:277](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/fees/page.tsx#L277)
- **Finding:** "Receipt" triggers alert modal. WhatsApp support links contain empty click handlers.
- **Risk:** Degraded UX. Parents unable to contact admin or retrieve past payment proofs.
- **Options:**
  - **A)** Generate dynamic receipts. Add WhatsApp API redirect URLs.
  - **B)** Leave mocked.


