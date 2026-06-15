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
19. **[#28](https://github.com/funteck123/divergencie-web/issues/28) ISSUE-019 (Parent-Finance):** Server-side authorization role mismatch on payInvoice
20. **[#29](https://github.com/funteck123/divergencie-web/issues/29) ISSUE-020 (Parent-Finance):** Unbound payment reference input on fees page
21. **[#30](https://github.com/funteck123/divergencie-web/issues/30) ISSUE-021 (Parent-Finance):** Dead links and mocked receipt downloads on parent fees page
22. **[#31](https://github.com/funteck123/divergencie-web/issues/31) ISSUE-022 (Parent-Profile):** Broken parent-student query in getLinkedChildren
23. **[#32](https://github.com/funteck123/divergencie-web/issues/32) ISSUE-023 (Parent-Dashboard):** Hardcoded logic for overdue invoices on Parent Dashboard
24. **[#33](https://github.com/funteck123/divergencie-web/issues/33) ISSUE-024 (Parent-Progress):** Empty subject expansion in Parent Progress Page
25. **[#34](https://github.com/funteck123/divergencie-web/issues/34) ISSUE-025 (Parent-Progress):** Monthly Reports tab & PDF downloads missing in Parent Progress
26. **[#35](https://github.com/funteck123/divergencie-web/issues/35) ISSUE-026 (Parent-Support):** Broken support ticket category submission on dashboard
27. **[#36](https://github.com/funteck123/divergencie-web/issues/36) ISSUE-027 (Parent-Support):** "Action Required" queue filters out parent tickets
28. **[#37](https://github.com/funteck123/divergencie-web/issues/37) ISSUE-028 (Parent-Progress):** Synthetic monthly score trends using Math.random()
29. **[#38](https://github.com/funteck123/divergencie-web/issues/38) ISSUE-029 (Security):** Broken Object Level Authorization (BOLA) in logDoubt action
30. **[#39](https://github.com/funteck123/divergencie-web/issues/39) ISSUE-030 (Security):** Broken Object Level Authorization (BOLA) in submitClaim action
31. **[#40](https://github.com/funteck123/divergencie-web/issues/40) ISSUE-031 (Logic):** Missing duplication checks in submitClaim (One Claim per month per enrolment list)
32. **[#41](https://github.com/funteck123/divergencie-web/issues/41) ISSUE-032 (Schema-Drift):** Schema redundancy and dead index on User status fields (isActive vs active)


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

### ISSUE-029: Broken Object Level Authorization (BOLA) in logDoubt action
**Location:** [doubts.ts:12](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/doubts.ts#L12) and [doubts.ts:17](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/doubts.ts#L17)
- **Finding:** The 'logDoubt' server action parses 'studentId' from raw client-provided form data, creating records directly without verifying if the caller's session ID matches this 'studentId' or holds valid relationship credentials.
- **Risk:** Any authenticated student can manipulate the hidden form inputs to log doubt records on behalf of any other student, causing potential spam or data corruption.
- **Options:**
  - **A)** Enforce session-derived identity verification by resolving the student ID directly from the authenticated session context (session.user.id), and explicitly check that the linked-child relationship is authorized if the caller is a parent user.
  - **B)** Leave as-is.

### ISSUE-030: Broken Object Level Authorization (BOLA) in submitClaim action
**Location:** [claims.ts:16](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L16) and [claims.ts:30](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L30)
- **Finding:** The 'submitClaim' server action reads 'userId' from the client form submission and creates the claim record, but fails to check if the 'userId' matches the authenticated session user's ID.
- **Risk:** Allows malicious or compromised teacher/staff accounts to submit financial claims on behalf of any other user in the system.
- **Options:**
  - **A)** Derive the claimant's identity strictly from the secure server-side session token (session.user.id), preventing client-side parameter tampering, and restrict non-owner claim submissions to authorized supervisors or management roles only.
  - **B)** Leave as-is.

### ISSUE-031: Missing duplication checks in submitClaim (One Claim per month per enrolment list)
**Location:** [claims.ts:30](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L30)
- **Requirement:** Section 18 of the system logic handoff (line 1669) mandates: "One Claim per EnrolmentList per month."
- **Finding:** The server action performs no checks against the database before inserting a claim. A duplicate claim can be created for the same enrolment list and month.
- **Risk:** Double payment / double claiming. Allows users to claim compensation multiple times for the same period.
- **Options:**
  - **A)** Introduce a strict database-level unique composite index on (enrolmentListId, month) in the Claim model, and perform a transactional pre-flight check in the 'submitClaim' server action to throw a structured error on duplicate submissions.
  - **B)** Leave as-is.

### ISSUE-032: Schema redundancy and dead index on User status fields (isActive vs active)
**Location:** [schema.prisma:28-29](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/prisma/schema.prisma#L28-L29) and [users.ts:95](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/users.ts#L95)
- **Finding:** The User model carries redundant boolean fields: 'isActive' and 'active'. The database index is on 'isActive', but the application only reads and writes the 'active' field.
- **Risk:** Database index on user status is never hit by queries, causing performance degradation during user queries, and introducing high risk of logic/data drift where active and isActive diverge.
- **Options:**
  - **A)** Perform a database migration to consolidate the two fields into a single, standardized status attribute with a matching composite index, and refactor all read/write paths across user management portals to query that single indexed field.
  - **B)** Leave as-is.


