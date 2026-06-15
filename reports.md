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
22. **[#23](https://github.com/funteck123/divergencie-web/issues/23) ISSUE-022 (Parent-Profile):** Broken parent-student query in getLinkedChildren
23. **[#24](https://github.com/funteck123/divergencie-web/issues/24) ISSUE-023 (Parent-Dashboard):** Hardcoded logic for overdue invoices on Parent Dashboard
24. **[#25](https://github.com/funteck123/divergencie-web/issues/25) ISSUE-024 (Parent-Progress):** Empty subject expansion in Parent Progress Page
25. **[#26](https://github.com/funteck123/divergencie-web/issues/26) ISSUE-025 (Parent-Progress):** Monthly Reports tab & PDF downloads missing in Parent Progress
26. **[#27](https://github.com/funteck123/divergencie-web/issues/27) ISSUE-026 (Parent-Support):** Broken support ticket category submission on dashboard
27. **[#28](https://github.com/funteck123/divergencie-web/issues/28) ISSUE-027 (Parent-Support):** "Action Required" queue filters out parent tickets
28. **[#29](https://github.com/funteck123/divergencie-web/issues/29) ISSUE-028 (Parent-Progress):** Synthetic monthly score trends using Math.random()

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

### ISSUE-022: Broken parent-student query in getLinkedChildren
**Location:** [profile.ts:57](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/profile.ts#L57)
- **Finding:** Database query attempts to join relation `students` on `User` model, but correct field name is `children` (parent-student self-join key defined in schema). TypeScript error bypassed with `as any`.
- **Risk:** Prisma throws runtime exception when parent dashboard, progress page, or profile page is loaded. Parent portal is entirely broken.
- **Options:**
  - **A)** Fix relation query in `getLinkedChildren` to use `children` instead of `students`.
  - **B)** Rename relation in schema (unnecessary risk).
  - **C)** Leave as-is.

### ISSUE-023: Hardcoded logic for overdue invoices on Parent Dashboard
**Location:** [page.tsx:101](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/page.tsx#L101)
- **Finding:** Hero card uses hardcoded true condition: `true ? " Manage fees in the Fees tab." : " One invoice is currently outstanding."`
- **Risk:** Overdue invoice notices never shown in welcoming text regardless of child's financial status.
- **Options:**
  - **A)** Update condition to reference `overdueInvoices.length === 0`.
  - **B)** Keep hardcoded text.
  - **C)** Leave as-is.

### ISSUE-024: Empty subject expansion in Parent Progress Page
**Location:** [progress/page.tsx:139](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/progress/page.tsx#L139)
- **Finding:** Subject cards have state bindings for expansion (`openSubjects`) and rotate the chevron icon on click, but do not render any chapters or detailed progress items when open.
- **Risk:** Unfinished UI. Click action seems broken to parents.
- **Options:**
  - **A)** Port chapter list display block from Student Progress page.
  - **B)** Remove expansion logic and chevron icon.
  - **C)** Leave as-is.

### ISSUE-025: Monthly Reports tab & PDF downloads missing in Parent Progress
**Location:** [progress/page.tsx](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/progress/page.tsx)
- **Finding:** Unlike the Student Progress page, the Parent Progress page has no tab interface to view or download published Monthly Progress Reports (`ProgressReport` model records).
- **Risk:** Parents cannot access historical academic progress reports or download report PDFs.
- **Options:**
  - **A)** Port tabs interface and monthly report list/details from Student Progress page.
  - **B)** Keep reports inaccessible in Parent portal.
  - **C)** Leave as-is.

### ISSUE-026: Broken support ticket category submission on dashboard
**Location:** [page.tsx:288-306](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/page.tsx#L288-L306)
- **Finding:** Support Ticket modal in the parent dashboard renders a form, but submission has no click handler or `onSubmit` interceptor.
- **Risk:** Submitting the form performs a full page reload and fails to call any API. Parent cannot send support tickets from the dashboard.
- **Options:**
  - **A)** Wire the form to submit to `/api/tickets` (similar to `TicketCreateForm`).
  - **B)** Replace the form with a redirect to the Parent Support page.
  - **C)** Leave as-is.

### ISSUE-027: "Action Required" queue filters out parent tickets
**Location:** [support/page.tsx:49](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/support/page.tsx#L49)
- **Finding:** Filtering logic for `"active"` queue requires the user to be the assignee (`isOwner`). However, parent-created tickets are always assigned to staff.
- **Risk:** Active tickets never show up in the parent's "Action Required" tab (default tab is empty).
- **Options:**
  - **A)** Adjust the status match to check if ticket status !== "CLOSED" for all parent tickets, or check if last message was from staff.
  - **B)** Remove "Action Required" queue filter for external users.
  - **C)** Leave as-is.

### ISSUE-028: Synthetic monthly score trends using Math.random()
**Location:** [progress/page.tsx:39](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/progress/page.tsx#L39)
- **Finding:** Trend chart plots synthetic values generated via `Math.random()` rather than plotting actual mock scores.
- **Risk:** Misleads parents with fake grade/mastery fluctuations.
- **Options:**
  - **A)** Retrieve actual historical mock exams from `MockResult` and plot them, or show flatline if empty.
  - **B)** Keep random generation.
  - **C)** Leave as-is.


