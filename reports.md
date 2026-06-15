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

The identified system bugs, UI issues, and database tasks are tracked in separate GitHub Issues:

- [x] **[#2](https://github.com/funteck123/divergencie-web/issues/2) ISSUE-001 (UI-Mobile):** ARE YOU? heading size too small & THEY'RE WATCHING cuts off on mobile
- [x] **[#3](https://github.com/funteck123/divergencie-web/issues/3) ISSUE-002 (UI-PC):** OUR CO-CONSPIRATORS heading wraps to 4 lines on desktop
- [x] **[#4](https://github.com/funteck123/divergencie-web/issues/4) ISSUE-003 (UI-Aesthetics):** Dark mode scroll bounce, gold color mismatch, ResultsTicker background
- [x] **[#5](https://github.com/funteck123/divergencie-web/issues/5) ISSUE-004 (UI-Nav):** Increase Nav bar transparency by 25%
- [x] **[#6](https://github.com/funteck123/divergencie-web/issues/6) ISSUE-005 (Branding):** Set DivergenCIE logo as favicon / site logo on Vercel
- [x] **[#7](https://github.com/funteck123/divergencie-web/issues/7) ISSUE-006 (Perf):** Optimize page speeds without losing UI/functionality
- [x] **[#8](https://github.com/funteck123/divergencie-web/issues/8) ISSUE-007 (Management-Budget):** Budget tab loads indefinitely
- [x] **[#9](https://github.com/funteck123/divergencie-web/issues/9) ISSUE-008 (Management-Tickets):** Ticket creator Assign to department gating logic
- [x] **[#10](https://github.com/funteck123/divergencie-web/issues/10) ISSUE-009 (Tickets):** Ticket attachments link opens relative path instead of new tab
- [x] **[#11](https://github.com/funteck123/divergencie-web/issues/11) ISSUE-010 (Tickets):** Increase height of ticket chat history and reply window
- [x] **[#12](https://github.com/funteck123/divergencie-web/issues/12) ISSUE-011 (Staff-IT):** IT Roadmap tab 404 error and logout
- [x] **[#13](https://github.com/funteck123/divergencie-web/issues/13) ISSUE-012 (Staff-IT):** IT ticket assign shows no eligible member found
- [x] **[#14](https://github.com/funteck123/divergencie-web/issues/14) ISSUE-013 (Tickets):** Ticket reply blocks further replies and shows processing flow
- [x] **[#15](https://github.com/funteck123/divergencie-web/issues/15) ISSUE-014 (Database):** Supabase DB cleanup: remove .com users, keep .co.uk users
- [x] **[#16](https://github.com/funteck123/divergencie-web/issues/16) ISSUE-015 (Management-RBAC):** Parent profile missing in left navigation access matrix
- [x] **[#17](https://github.com/funteck123/divergencie-web/issues/17) ISSUE-016 (Management-Finance):** Management make invoice link gating and claims review redirect
- [x] **[#18](https://github.com/funteck123/divergencie-web/issues/18) ISSUE-017 (Finance-CLI):** Payout button logic and CLI test scripts
- [x] **[#19](https://github.com/funteck123/divergencie-web/issues/19) ISSUE-018 (Docs):** Update payment guide info
- [ ] **[#28](https://github.com/funteck123/divergencie-web/issues/28) ISSUE-019 (Parent-Finance):** Server-side authorization role mismatch on payInvoice
- [ ] **[#29](https://github.com/funteck123/divergencie-web/issues/29) ISSUE-020 (Parent-Finance):** Unbound payment reference input on fees page
- [ ] **[#30](https://github.com/funteck123/divergencie-web/issues/30) ISSUE-021 (Parent-Finance):** Dead links and mocked receipt downloads on parent fees page
- [ ] **[#31](https://github.com/funteck123/divergencie-web/issues/31) ISSUE-022 (Parent-Profile):** Broken parent-student query in getLinkedChildren
- [ ] **[#32](https://github.com/funteck123/divergencie-web/issues/32) ISSUE-023 (Parent-Dashboard):** Hardcoded logic for overdue invoices on Parent Dashboard
- [ ] **[#33](https://github.com/funteck123/divergencie-web/issues/33) ISSUE-024 (Parent-Progress):** Empty subject expansion in Parent Progress Page
- [ ] **[#34](https://github.com/funteck123/divergencie-web/issues/34) ISSUE-025 (Parent-Progress):** Monthly Reports tab & PDF downloads missing in Parent Progress
- [ ] **[#35](https://github.com/funteck123/divergencie-web/issues/35) ISSUE-026 (Parent-Support):** Broken support ticket category submission on dashboard
- [ ] **[#36](https://github.com/funteck123/divergencie-web/issues/36) ISSUE-027 (Parent-Support):** "Action Required" queue filters out parent tickets
- [ ] **[#37](https://github.com/funteck123/divergencie-web/issues/37) ISSUE-028 (Parent-Progress):** Synthetic monthly score trends using Math.random()
- [ ] **[#38](https://github.com/funteck123/divergencie-web/issues/38) ISSUE-029 (Security):** Broken Object Level Authorization (BOLA) in logDoubt action
- [ ] **[#39](https://github.com/funteck123/divergencie-web/issues/39) ISSUE-030 (Security):** Broken Object Level Authorization (BOLA) in submitClaim action
- [ ] **[#40](https://github.com/funteck123/divergencie-web/issues/40) ISSUE-031 (Logic):** Missing duplication checks in submitClaim (One Claim per month per enrolment list)
- [ ] **[#41](https://github.com/funteck123/divergencie-web/issues/41) ISSUE-032 (Schema-Drift):** Schema redundancy and dead index on User status fields (isActive vs active)
- [ ] **[#42](https://github.com/funteck123/divergencie-web/issues/42) ISSUE-033 (Schema-Drift):** Obsolete self-referential parent-child relation in User model & missing ParentProfile fields
- [ ] **[#43](https://github.com/funteck123/divergencie-web/issues/43) ISSUE-034 (RBAC-Bypass):** Unenforced/bypassed database-backed PortalPermission RBAC system
- [ ] **[#44](https://github.com/funteck123/divergencie-web/issues/44) ISSUE-035 (Logic-Gap):** Inconsistent isActive mapping logic between Student and Teacher/Staff enrolments
- [ ] **[#45](https://github.com/funteck123/divergencie-web/issues/45) ISSUE-036 (Logic-Gap):** Missing serviceType filtering during StudentEnrolmentList retrieval
- [ ] **[#46](https://github.com/funteck123/divergencie-web/issues/46) ISSUE-037 (Mocked-Code):** Mocked ambassador earnings calculations and dead commission schema
- [ ] **[#47](https://github.com/funteck123/divergencie-web/issues/47) ISSUE-038 (Security-BOLA):** Broken Object Level Authorization (BOLA) in ambassador referral and claim actions
- [ ] **[#48](https://github.com/funteck123/divergencie-web/issues/48) ISSUE-039 (Security):** Bypassed authorization check on checkAndActivateStudent server action
- [ ] **[#49](https://github.com/funteck123/divergencie-web/issues/49) ISSUE-040 (Mocked-Code):** Completely mocked Student Invoicing and dead InvoiceLineItem schema
- [ ] **[#50](https://github.com/funteck123/divergencie-web/issues/50) ISSUE-041 (Logic-Gap):** Unimplemented Student and Staff No-Show Strike & Pause Escalation Automation
- [ ] **[#51](https://github.com/funteck123/divergencie-web/issues/51) ISSUE-042 (Logic-Gap):** Dead CalendarItem database synchronization & empty calendar views
- [ ] **[#52](https://github.com/funteck123/divergencie-web/issues/52) ISSUE-043 (Security-BOLA):** Severe Broken Object Level Authorization (BOLA) in all Student Progress Actions
- [ ] **[#53](https://github.com/funteck123/divergencie-web/issues/53) ISSUE-044 (Logic-Gap):** Non-compliant ledger entries and missing transaction split records
- [ ] **[#54](https://github.com/funteck123/divergencie-web/issues/54) ISSUE-045 (Logic-Gap):** Monoculture GBP currency enforcement across payroll, claims, and invoices
- [ ] **[#55](https://github.com/funteck123/divergencie-web/issues/55) ISSUE-046 (Security-BOLA):** Broken Object Level Authorization (BOLA) in ticket queries
- [ ] **[#56](https://github.com/funteck123/divergencie-web/issues/56) ISSUE-047 (Schema-Drift):** Missing creator metadata tracking in createMarketingPost action
- [ ] **[#57](https://github.com/funteck123/divergencie-web/issues/57) ISSUE-048 (Logic-Gap):** Dead marketing schedule cadence automation & missing slot generation
- [ ] **[#58](https://github.com/funteck123/divergencie-web/issues/58) ISSUE-049 (Security-BOLA):** Severe Broken Object Level Authorization (BOLA) in checklist actions
- [ ] **[#59](https://github.com/funteck123/divergencie-web/issues/59) ISSUE-050 (Security):** [CRITICAL] [VULNERABILITY] — Hardcoded Gemini API Key Leaked in Git History
- [ ] **[#60](https://github.com/funteck123/divergencie-web/issues/60) ISSUE-051 (Tech-Debt):** Outdated and misleading platform integrations roadmap descriptions
- [ ] **[#61](https://github.com/funteck123/divergencie-web/issues/61) ISSUE-052 (Tech-Debt):** Frankenstein NextAuth environment variables
- [ ] **[#62](https://github.com/funteck123/divergencie-web/issues/62) ISSUE-053 (Tech-Debt):** Deprecated db-init.ts and broken sync-passwords.ts script
- [ ] **[#63](https://github.com/funteck123/divergencie-web/issues/63) ISSUE-054 (Tech-Debt):** Leftover better-sqlite3 entry in NextConfig

---


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

### ISSUE-033: Obsolete self-referential parent-child relation in User model & missing ParentProfile fields
**Location:** [schema.prisma:43-45](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/prisma/schema.prisma#L43-L45) and [profile.ts:57](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/profile.ts#L57)
- **Finding:** The ground-truth System Logic (§40) explicitly states that the self-referential parent-child relation `User ||--o{ User` should be removed from the database schema since the relation is managed via `ParentProfile`. However, the `parentId` and parent/children self-join remains in the `User` model. Furthermore, `ParentProfile` lacks the required `linkedStudentId` foreign key field, and its `userId` field is marked unique, making it impossible to support parents with multiple enrolled children.
- **Risk:** Database schema drift and structural breakdown in permission checks where parent access cannot scale to multiple student profiles.
- **Options:**
  - **A)** Perform a database migration to remove the self-referential `parentId` from the `User` model, add `linkedStudentId` pointing to `StudentProfile` in `ParentProfile`, remove the `@unique` constraint on `ParentProfile.userId`, and refactor all API routes and actions that query parent-child relationships.
  - **B)** Leave as-is.

### ISSUE-034: Unenforced/bypassed database-backed PortalPermission RBAC system
**Location:** [rbac.ts:85](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/rbac.ts#L85) and [middleware.ts:42-67](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/middleware.ts#L42-L67)
- **Finding:** The fine-grained RBAC override system powered by the `PortalPermission` database model and resolved by `hasPermission` is completely dead code and is never invoked in any server action or page. Real application actions and pages only use coarse middleware path checks and hardcoded checks like `user.role === 'management'`.
- **Risk:** Total failure of administrative role delegation and security override controls. Management overrides edited in the UI have no runtime effect.
- **Options:**
  - **A)** Refactor all portal server actions and layout check guards to invoke `hasPermission(userId, role, dept, resource, action)` before performing read/write operations to enforce database-configured overrides.
  - **B)** Leave as-is.

### ISSUE-035: Inconsistent isActive mapping logic between Student and Teacher/Staff enrolments
**Location:** [route.ts:32](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/enrolments/student/item/%5BitemId%5D/route.ts#L32), [teacherEnrolments.ts:132](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/teacherEnrolments.ts#L132), and [staffEnrolments.ts:93](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/staffEnrolments.ts#L93)
- **Finding:** The student enrolment status PATCH handler sets `isActive` to true only for `ACTIVE` or `TRIAL`. However, teacher and staff enrolment actions set `isActive` to true for `ACTIVE`, `TRIAL`, and `WAITING_CONFIRMATION`.
- **Risk:** Inconsistent state evaluation across entity roles, where `WAITING_CONFIRMATION` is considered active for payroll calculations but inactive for student billing, leading to financial imbalances.
- **Options:**
  - **A)** Harmonize status mappings by defining a standardized state transition mapping matrix or shared utility helper across all four enrolment models, ensuring consistent definitions for `isActive`.
  - **B)** Leave as-is.

### ISSUE-036: Missing serviceType filtering during StudentEnrolmentList retrieval
**Location:** [route.ts:24](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/enrolments/student/route.ts#L24)
- **Finding:** When a new student enrolment item is created, the system queries the database for `StudentEnrolmentList` matching `studentId` but fails to filter by the target `serviceType`.
- **Risk:** Mixed-type lists. Reuses the list of a different service type (e.g. reusing a REGULAR list for a SHORT_COURSE enrolment), violating §6 ("One per student per serviceType").
- **Options:**
  - **A)** Modify the query to find lists matching both `studentId` and `serviceType`, and enforce the "Max 4 per student" rule via database checks before list creation.
  - **B)** Leave as-is.

### ISSUE-037: Mocked ambassador earnings calculations and dead commission schema
**Location:** [ambassador.ts:30-36](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/ambassador.ts#L30-L36) and [ambassador.ts:82](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/ambassador.ts#L82)
- **Finding:** Ambassador commission and earnings calculations are hardcoded using simplified multiplier formulas (`referrals.length * 25 + 150` or flat multipliers) instead of querying the `AmbassadorCommissionItem` table and linking to referred student enrolment lists. The entire database commission model set (`AmbassadorCommissionItem`, `AmbassadorCommissionList`) is dead schema.
- **Risk:** Financial leakage and auditing discrepancies.
- **Options:**
  - **A)** Refactor calculations to perform database joins over `AmbassadorCommissionItem` and calculate percentages dynamically based on referred students' paid amounts, standardizing the allowance mapping.
  - **B)** Leave as-is.

### ISSUE-038: Broken Object Level Authorization (BOLA) in ambassador referral and claim actions
**Location:** [ambassador.ts:53](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/ambassador.ts#L53), [ambassador.ts:222](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/ambassador.ts#L222), and [ambassador.ts:366](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/ambassador.ts#L366)
- **Finding:** Server actions `logReferral`, `createReferral`, and `createAmbassadorClaim` accept IDs/emails directly from the client form parameters without checking if the calling session user matches these values.
- **Risk:** Malicious users or compromised accounts can submit claims and register referrals on behalf of other ambassadors.
- **Options:**
  - **A)** Force secure identification by resolving the caller's ID and email strictly from the server-side session context (`session.user.id`, `session.user.email`).
  - **B)** Leave as-is.

### ISSUE-039: Bypassed authorization check on checkAndActivateStudent server action
**Location:** [onboarding.ts:6](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/onboarding.ts#L6)
- **Finding:** Server action `checkAndActivateStudent` is exported from a `"use server"` file without any session or role verification checks.
- **Risk:** Unauthorized clients can trigger student deactivation/activation events.
- **Options:**
  - **A)** Enforce session verification and restrict access to management or PR/Ops roles before processing onboarding completion.
  - **B)** Leave as-is.

- **B)** Leave as-is.

### ISSUE-041: Unimplemented Student and Staff No-Show Strike & Pause Escalation Automation
**Location:** [attendance.ts:72](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/attendance.ts#L72) and [system-logic-handoff-v23.md:640-645](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/system-logic-handoff-v23.md#L640-L645)
- **Finding:** The system logic handoff (§11-§13) defines a detailed no-show strike system (1 strike raising a low warning, 3 strikes raising a high warning, 4 strikes automatically pausing the student profile, cancelling all enrolment items, and halting billing). However, `submitAttendance` only inserts the `sessionAttendance` record and sets the status to `ABSENT_NO_SHOW`. It does not increment any count, raise tickets, pause profiles, or cancel enrolments.
- **Risk:** Complete failure of automatic class cancellation and client suspension on repeated absences, resulting in lost revenue and administrative overhead.
- **Options:**
  - **A)** Implement transactional middleware in `submitAttendance` that increments the student's `noShowCount` in the `SessionAttendance` record, automatically creates ticket notifications (LOW/MEDIUM/HIGH) for strikes 1-3, and executes a cascading deactivation (pausing the profile and cancelling linked enrolment items) upon strike 4.
  - **B)** Leave as-is.

### ISSUE-042: Dead CalendarItem database synchronization & empty calendar views
**Location:** [route.ts:32](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/calendar/route.ts#L32) and [system-logic-handoff-v23.md:774-795](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/system-logic-handoff-v23.md#L774-L795)
- **Finding:** Handoff §14 specifies that every academic session, staff meeting, or ambassador meeting must create corresponding `CalendarItem` records for all involved users (allowing unified dashboard calendar viewing and GCal sync). However, search audits show that there are no `prisma.calendarItem.create` calls anywhere in the application code, rendering the table dead and the portal calendar page completely empty.
- **Risk:** Parents, students, and staff have empty calendars and cannot view scheduled classes or meetings.
- **Options:**
  - **A)** Introduce database hooks (Prisma middleware or transactional helpers) inside `createAcademicSession`, `createStaffEnrolment`, and meeting creation pipelines to automatically create and synchronize `CalendarItem` entries for all participants.
  - **B)** Leave as-is.

### ISSUE-043: Severe Broken Object Level Authorization (BOLA) in all Student Progress Actions
**Location:** [progress.ts:7](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L7), [progress.ts:56](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L56), [progress.ts:77](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L77), [progress.ts:172](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L172), [progress.ts:225](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L225), and [progress.ts:274](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/progress.ts#L274)
- **Finding:** Student progress server actions (e.g. `getStudentProgressStats`, `toggleChapterComplete`, `getStudentAssignments`, `getStudentProgress`, `getStudentSessions`, `getStudentProgressReports`) accept a raw `studentEmail` parameter and query database records directly, checking only if the caller is authenticated but failing to verify if the caller is the student, a linked parent, or an authorized staff member.
- **Risk:** Any authenticated student, candidate, or ambassador can read progress history, download reports, view Zoom links, or complete syllabus items for any other student by passing their email.
- **Options:**
  - **A)** Restrict progress actions to only return data if `session.user.email === studentEmail`, or if the user holds a parent profile linking to that student profile, or if the user is staff/management.
  - **B)** Leave as-is.

### ISSUE-044: Non-compliant ledger entries and missing transaction split records
**Location:** [route.ts:107](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/payments/%5BrecordId%5D/approve/route.ts#L107) and [system-logic-handoff-v23.md:1443-1453](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/system-logic-handoff-v23.md#L1443-L1453)
- **Finding:** Upon payment approval, the system credits the bank account and creates a single `LedgerEntry` record. However, double-entry bookkeeping rules require a matching debit entry. Also, the code completely ignores the `AccountTransaction` table, leaving `transactionId` in `LedgerEntry` null.
- **Risk:** Unbalanced ledger, broken bookkeeping audits, unable to group matching debit/credit splits.
- **Options:**
  - **A)** Wrap ledger writes in a database transaction that creates an `AccountTransaction` and inserts exactly two `LedgerEntry` records (a credit to cash/bank and a debit to Accounts Receivable or Revenue) to maintain balance sheet compliance.
  - **B)** Leave as-is.

### ISSUE-045: Monoculture GBP currency enforcement across payroll, claims, and invoices
**Location:** [finance.ts:52](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/finance.ts#L52), [claims.ts:35](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L35), [claims.ts:137](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L137), and [claims.ts:221](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/claims.ts#L221)
- **Finding:** The billing, claims, paycheck, and payment systems hardcode the currency parameter to `"GBP"`, ignoring RateCard lookup currencies (MYR, INR, PKR, GBP, SAR) and `StudentProfile.mainCurrency` rules.
- **Risk:** Financial reconciliation failures, incorrect payouts, and inability to bill clients or pay staff in their local currency as defined in §4.
- **Options:**
  - **A)** Resolve invoicing and payout currencies dynamically from the student/staff profiles and rate cards, and perform currency conversions using `CurrencyRate` records.
  - **B)** Leave as-is.

### ISSUE-046: Broken Object Level Authorization (BOLA) in ticket queries
**Location:** [tickets.ts:69](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/tickets.ts#L69)
- **Finding:** The `getTickets` server action retrieves tickets by checking if the client-provided `userId` matches the creator, assignee, or participant history, but fails to check if the session user matches the `userId` or holds staff/management roles.
- **Risk:** Any authenticated student or ambassador can read support tickets, messages, and staff discussions of any other user in the system.
- **Options:**
  - **A)** Enforce session ownership verification: `if (userId && session.user.id !== userId && session.user.role !== 'staff' && session.user.role !== 'management') throw new Error("Forbidden");`.
  - **B)** Leave as-is.

### ISSUE-047: Missing creator metadata tracking in createMarketingPost action
**Location:** [marketing.ts:119](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/marketing.ts#L119) and [system-logic-handoff-v23.md:2813](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/system-logic-handoff-v23.md#L2813)
- **Finding:** System Logic (§50) added `MarketingPost.createdByUserId` to track which marketing staff member created a post entry. However, the `createMarketingPost` server action creates the post record without populating `createdByUserId`.
- **Risk:** Database schema drift (field remains null), breakdown in audit trail tracking.
- **Options:**
  - **A)** Populate the `createdByUserId` field during post creation using the active session user's ID (`session.user.id`).
  - **B)** Leave as-is.

### ISSUE-048: Dead marketing schedule cadence automation & missing slot generation
**Location:** [marketing.ts:281](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/marketing.ts#L281) and [system-logic-handoff-v23.md:2950-2970](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/system-logic-handoff-v23.md#L2950-L2970)
- **Finding:** Handoff §52 mandates that marketing posts must follow a `schedule -> slot -> post` automated generation pattern (matching class scheduling). However, the codebase has no generation background job or logic to generate marketing posts from schedule occurrences, and only supports manual creation of posts.
- **Risk:** Breakdown of marketing scheduling workflow; templates, schedules, and slots are dead database tables.
- **Options:**
  - **A)** Write a recurring cron task (or button trigger) that processes active `MarketingSchedule` entries, matches active occurrences and slots, and auto-inserts draft `MarketingPost` records for the week.
  - **B)** Leave as-is.

### ISSUE-049: Severe Broken Object Level Authorization (BOLA) in checklist actions
**Location:** [announcements.ts:99](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/announcements.ts#L99) and [announcements.ts:142](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/actions/announcements.ts#L142)
- **Finding:** The server actions `getChecklistEntries` and `toggleChecklistItem` allow clients to retrieve checklist entries and check/uncheck items without checking if the session user is the assigned checklists owner, or if they have department supervisor rights.
- **Risk:** Any student, teacher, or external user can modify or check off administrative checklists of other staff members.
- **Options:**
  - **A)** Restrict toggle checklist actions by checking if the session user is the creator/owner of the checklist entry or holds authorized PR/management roles.
  - **B)** Leave as-is.

### ISSUE-050: [CRITICAL] [VULNERABILITY] — Hardcoded Gemini API Key Leaked in Git History
**Location:** [planning/antigravity-sdk-guide.md](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/antigravity-sdk-guide.md) (Lines 26, 99, 135 in commit `7044739`)
- **Finding:** Google Cloud Express / Gemini API key `AQ.Ab8RN6Lvb-Rz8Vtyxq0tcoE7PB_MIi01Y9V7Fc2ScoSwc7Kp8A` was hardcoded in `planning/antigravity-sdk-guide.md` in commit `7044739` which is tracked by Git.
- **Risk:** Unauthorized usage of the Gemini model under user billing/limits, exposure of sensitive API keys to repository readers/forks.
- **Options:**
  - **A)** Revoke/delete the key in Google AI Studio or Google Cloud Console. Purge key from git history using `git-filter-repo` or BFG.
  - **B)** Leave as-is.

### ISSUE-051: Outdated and misleading platform integrations roadmap descriptions
**Location:** [page.tsx:32-33](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/staff/it/roadmap/page.tsx#L32-L33)
- **Finding:** The IT roadmap integration list still explicitly marks "Portal Auth (NextAuth v5)" and "Prisma + SQLite DB" as "Done" platform integrations. However, the system has migrated to Supabase SSR for authentication and Supabase PostgreSQL for the database.
- **Risk:** High developer and admin confusion, misleading roadmap reporting, and obsolete tech stack references in user-facing portal views.
- **Options:**
  - **A)** Update roadmap integration definitions in page.tsx to accurately state "Portal Auth (Supabase SSR)" and "Prisma + Supabase PostgreSQL DB" as the completed core integrations.
  - **B)** Leave as-is.

### ISSUE-052: Frankenstein residual NextAuth environment variables in configuration and code
**Location:** [.env:31-34](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/.env#L31-L34) and [route.ts:50](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/payments/stripe/checkout/route.ts#L50)
- **Finding:** The configuration environment variables `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are still defined and used in the Stripe checkout routing logic, even though the application has fully migrated authentication to Supabase SSR.
- **Risk:** Unnecessary configuration overhead, credentials confusion, and risk of routing failures if environment configurations change.
- **Options:**
  - **A)** Clean up environment variable definitions by removing `NEXTAUTH_*` configurations and refactor the Stripe checkout route to resolve the base URL from standardized site configurations (e.g. `NEXT_PUBLIC_SITE_URL` or request origin).
  - **B)** Leave as-is.

### ISSUE-053: Deprecated database stub file and broken legacy password sync script
**Location:** [db-init.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/db-init.ts) and [sync-passwords.ts:25-27](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/prisma/sync-passwords.ts#L25-L27)
- **Finding:** 
  1. `src/lib/db-init.ts` is a deprecated SQLite stub file containing only comments and an empty export.
  2. `prisma/sync-passwords.ts` attempts to instantiate a local SQLite PrismaClient but lacks imports for `PrismaClient` or `PrismaBetterSqlite3`, making the script completely broken and non-compiling.
- **Risk:** Build/typecheck confusion, dead code accumulation, and compilation errors if legacy scripts are executed.
- **Options:**
  - **A)** Delete the deprecated `db-init.ts` file, and refactor `sync-passwords.ts` to import the correct PostgreSQL-backed PrismaClient from the shared database module.
  - **B)** Leave as-is.

### ISSUE-054: Leftover SQLite bundler external packages configurations
**Location:** [next.config.ts:21](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/next.config.ts#L21)
- **Finding:** Next.js config contains `better-sqlite3` in the `serverExternalPackages` list, even though the database is Postgres/Supabase and the package has been removed from dependency declarations.
- **Risk:** Bloated bundler config, unexpected dependencies search during compiles, and confusion on the targeted database adapters.
- **Options:**
  - **A)** Remove `better-sqlite3` from NextConfig `serverExternalPackages` list to align build settings with the PostgreSQL driver stack.
  - **B)** Leave as-is.


