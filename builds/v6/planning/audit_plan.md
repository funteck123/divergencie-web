# Master System Audit Plan — 50-Phase Checklist

This document maps all database schemas, system logic rules, and User Journey Map (UJM) checkpoints into 50 granular phases.

---

## ── USERS, PROFILES, & SECURITY PIPELINE ──────────────────

### Phase 1: User Registration & Account Activation
- **Source Logic:** User account initialization and status checking (§2).
- **Files Audited:** `src/lib/actions/users.ts`
- **Checklist:**
  - [x] Verify email uniqueness validation.
  - [x] Ensure `active` status blocks login session resolution.

### Phase 2: Student Profile & Currency Defaults
- **Source Logic:** Student base metadata, country, and mainCurrency settings (§2).
- **Files Audited:** `src/lib/actions/profile.ts`
- **Checklist:**
  - [x] Audit initialization of `mainCurrency` on profile creation.
  - [x] Check defaults mapping for timezone and registration dates.

### Phase 3: Teacher Profile Document Verification
- **Source Logic:** HR verification checkboxes: ID Doc, salary account details (§2).
- **Files Audited:** `src/lib/actions/hr.ts`
- **Checklist:**
  - [x] Verify constraints on `idDocProvided` and `salaryAccountProvided` flags.
  - [x] Confirm files uploads status mappings.

### Phase 4: Staff Roles, Departments, and Workloads
- **Source Logic:** Staff contract metadata, supervisors mapping (§2).
- **Files Audited:** `src/lib/actions/users.ts`
- **Checklist:**
  - [x] Verify linking of `staffRoleId` and `deptId`.
  - [x] Check validation of staff supervisor status.

### Phase 5: Parent Profile Student-Linkage
- **Source Logic:** Parent portal multi-student dashboards (§2, §40).
- **Files Audited:** `src/lib/actions/profile.ts`
- **Checklist:**
  - [x] Audit parent-student relations mapping.
  - [x] Identify lack of `linkedStudentId` multi-child support (ISSUE-033).

### Phase 6: Ambassador Profiles Cohorts & Referrals
- **Source Logic:** Ambassador cohort start/end, referral codes (§2).
- **Files Audited:** `src/lib/actions/ambassador.ts`
- **Checklist:**
  - [x] Check uniqueness constraint on ambassador `referralCode`.
  - [x] Audit program duration validations ("3_MONTH" | "6_MONTH").

---

## ── PRE-HIRE & RECRUITMENT PIPELINE ─────────────────────

### Phase 7: Candidate Pipeline Application Intake
- **Source Logic:** Candidate registration and CV document linking (§3).
- **Files Audited:** `src/lib/actions/candidate.ts`
- **Checklist:**
  - [x] Verify CV links format verification.
  - [x] Check outreach source logs (`LINKEDIN`, `REFERRAL`, `FORM`, etc.).

### Phase 8: Candidate Screening & Self-Service Scheduling
- **Source Logic:** HR interview timings and scheduler setup (§3).
- **Files Audited:** `src/lib/actions/hr.ts`
- **Checklist:**
  - [x] Check candidate screening status transition constraints.
  - [x] Validate interview date inputs formatting.

### Phase 9: Hiring Onboarding & Zoom Induction
- **Source Logic:** Candidate-to-User conversion logic (§3).
- **Files Audited:** `src/lib/actions/onboarding.ts`
- **Checklist:**
  - [x] Verify `convertedToUserId` field logging upon transition to HIRED status.
  - [x] Ensure target candidate profile status locks.

---

## ── GROUPS, SERVICES, & RATE SYSTEMS ───────────────────

### Phase 10: Group Management & Group Category Codes
- **Source Logic:** Group registration, category mapping (B-groups, C-groups, T-groups) (§4).
- **Files Audited:** `src/lib/actions/services.ts`
- **Checklist:**
  - [x] Verify uniqueness of group codes.
  - [x] Ensure category code validation rules are strictly enforced.

### Phase 11: Service Structure & Hourly vs. Monthly Gating
- **Source Logic:** Service type configurations, teacher snapshots (§4).
- **Files Audited:** `src/lib/actions/services.ts`
- **Checklist:**
  - [x] Check boolean toggle mapping rules for `isHourly`.
  - [x] Audit teacher ID snapshot updates.

### Phase 12: GcrList & Classroom Link Management
- **Source Logic:** Mapping multiple classroom resources per service (§4).
- **Files Audited:** `src/lib/actions/services.ts`
- **Checklist:**
  - [x] Verify 1-to-1 mapping constraints between Service and GcrList.
  - [x] Validate GcrItem URL uniqueness database checks.

### Phase 13: RateCard Configuration
- **Source Logic:** Client rates and staff rates allocations per service (§4).
- **Files Audited:** `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify creation of default RateList on Service initialization.
  - [x] Confirm rate validation rules for active rates.

### Phase 14: RateCard Resolution and Fallbacks
- **Source Logic:** Country currency resolve and DEFAULT fallback (§4).
- **Files Audited:** `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Audit RateItem country code selector lookup logic.
  - [x] Verify fallback behavior to DEFAULT when no matching country item exists.

### Phase 15: RateChangeLog Historic Audits
- **Source Logic:** Tracking client/staff rate modifications with auditor IDs (§4).
- **Files Audited:** `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Check generation of `RateChangeLog` records upon rates updates.
  - [x] Verify auditor ID resolution from session context.

### Phase 16: PortalPermission RBAC Resolution
- **Source Logic:** Portal-wide permission overrides validation (§38).
- **Files Audited:** `src/lib/rbac.ts`
- **Checklist:**
  - [x] Audit department default configurations.
  - [x] Identify bypass logic override checks (ISSUE-034).

### Phase 17: Middleware Route Matchers & Path Gating
- **Source Logic:** Portal routes path access rules (§38).
- **Files Audited:** `src/middleware.ts`
- **Checklist:**
  - [x] Check Next.js middleware matchers scope.
  - [x] Confirm redirect hooks for unauthenticated session attempts.

---

## ── ENROLMENTS LIFECYCLE ────────────────────────────────

### Phase 18: Student Enrolment List Creation
- **Source Logic:** Single StudentEnrolmentList constraints (§6).
- **Files Audited:** `src/app/api/enrolments/student/route.ts`
- **Checklist:**
  - [x] Audit logic limiting student enrolment lists to a maximum of 4 (one per serviceType).
  - [x] Verify logic prevents mixing different serviceTypes (ISSUE-036).

### Phase 19: Student Enrolment Item Lifecycles
- **Source Logic:** Enrolment items status transitions and history logs (§6).
- **Files Audited:** `src/app/api/enrolments/student/item/[itemId]/route.ts`
- **Checklist:**
  - [x] Verify logging of `StudentEnrolmentItemStatusChangeLog` records.
  - [x] Check trial session trigger constraints (`trialRequired = true`).

### Phase 20: Teacher Enrolment List & Service Mapping
- **Source Logic:** Matching teachers to service lists (§7).
- **Files Audited:** `src/lib/actions/teacherEnrolments.ts`
- **Checklist:**
  - [x] Check teacher list active status transitions.
  - [x] Verify logic maps teacher items to valid classroom groups.

### Phase 21: Staff Enrolment List & Custom Tasks
- **Source Logic:** Staff enrolments, expected hours allocations (§8).
- **Files Audited:** `src/lib/actions/staffEnrolments.ts`
- **Checklist:**
  - [x] Check validations for `expectedHoursPerMonth`.
  - [x] Verify mappings of staff service profiles.

### Phase 22: Ambassador Enrolment List & Cohorts
- **Source Logic:** Ambassador enrolment list assignments (§9).
- **Files Audited:** `src/lib/actions/ambassador.ts`
- **Checklist:**
  - [x] Verify duration validation mapping rules.
  - [x] Audit cohort allocation constraints.

### Phase 23: Commission List & Referral Multipliers
- **Source Logic:** Ambassador commission calculations (§9).
- **Files Audited:** `src/lib/actions/ambassador.ts`
- **Checklist:**
  - [x] Check referral link clicks recording validation.
  - [x] Identify static hardcoded commission multiplier bypasses (ISSUE-037).

---

## ── SCHEDULES, CALENDARS, & ATTENDANCE ─────────────────

### Phase 24: Recurrent Schedule Generation
- **Source Logic:** Occurrence pattern parsing and session generation (§10).
- **Files Audited:** `src/lib/actions/schedules.ts`
- **Checklist:**
  - [x] Audit recurrence engine calculations.
  - [x] Check scheduling conflicts validation checks.

### Phase 25: CalendarItem Synchronization
- **Source Logic:** Automated creation of unified calendar events (§14).
- **Files Audited:** `src/app/api/calendar/route.ts`
- **Checklist:**
  - [x] Verify creation of `CalendarItem` records for all participants.
  - [x] Identify lack of calendar creation triggers in active actions (ISSUE-042).

### Phase 26: Academic Session Lifecycle
- **Source Logic:** Transitioning session status from scheduled to completed (§11).
- **Files Audited:** `src/lib/actions/attendance.ts`
- **Checklist:**
  - [x] Check logic enforcing 24h submission deadlines.
  - [x] Confirm behavior when sessions are cancelled.

### Phase 27: Teacher Timesheet Submissions
- **Source Logic:** Class details submission: Zoom recordings, Whiteboard links (§11).
- **Files Audited:** `src/lib/actions/attendance.ts`
- **Checklist:**
  - [x] Verify mandatory whiteboard link validation.
  - [x] Validate recording URL format rules.

### Phase 28: Overdue Timesheet Warnings
- **Source Logic:** Auto-generating support tickets for missing timesheets (§11).
- **Files Audited:** `src/lib/actions/attendance.ts`
- **Checklist:**
  - [x] Verify threshold triggers (3 overdue submissions).
  - [x] Check ticketing routing options.

### Phase 29: Session Attendance Logging
- **Source Logic:** Capturing student vs. teacher logged hours (§11).
- **Files Audited:** `src/lib/actions/attendance.ts`
- **Checklist:**
  - [x] Verify mismatches comparison logic.
  - [x] Check change request state changes.

### Phase 30: Student No-Show Strike System
- **Source Logic:** strike counters and auto-pausing (§11).
- **Files Audited:** `src/lib/actions/attendance.ts`
- **Checklist:**
  - [x] Verify ticket notifications routing for strikes 1-3.
  - [x] Identify lack of strike checks and automated pausing logic (ISSUE-041).

### Phase 31: Staff/Ambassador Meeting Scheduling
- **Source Logic:** Meeting creation and participants invitation (§12, §13).
- **Files Audited:** `src/lib/actions/meetings.ts`
- **Checklist:**
  - [x] Verify mapping of `MeetingParticipant` records.
  - [x] Validate time zone conflict resolution checks.

### Phase 32: Staff/Ambassador Attendance Logging
- **Source Logic:** Logged hours matching and strike tracking (§12, §13).
- **Files Audited:** `src/lib/actions/meetings.ts`
- **Checklist:**
  - [x] Verify matching of staff logged hours.
  - [x] Check strike escalations mappings (3 strikes → pause staff profile).

---

## ── CURRICULUM, PROGRESS, & REPORTS ───────────────────

### Phase 33: Curriculum Syllabus chapters & Mastery
- **Source Logic:** Syllabus structure completion tracking (§15, §36).
- **Files Audited:** `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Check chapter progress calculation accuracy.
  - [x] Ensure completion percentage is derived dynamically.

### Phase 34: Chapter Recording Upload Validation
- **Source Logic:** Storing chapter-specific classroom recordings (§36).
- **Files Audited:** `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Check validation format on URL uploads.
  - [x] Verify access gating rules.

### Phase 35: Task Assignments Release
- **Source Logic:** Automated task release on syllabus completion (§15).
- **Files Audited:** `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Verify creation of `TaskAssignment` records.
  - [x] Check deadline validation rules.

### Phase 36: Mock Exam Result Logs
- **Source Logic:** Recording marks, percentages, and trend lines (§37).
- **Files Audited:** `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Validate inputs check on marks scored.
  - [x] Identify mock score trends using random numbers instead of DB values (ISSUE-028).

### Phase 37: Student Progress Snapshots
- **Source Logic:** PDF report cards and metrics snapshots (§37).
- **Files Audited:** `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Check generation workflows for progress reports.
  - [x] Identify severe BOLA vulnerabilities in student parameter lookups (ISSUE-043).

---

## ── BILLING, INVOICING, CLAIMS, & FINANCES ──────────────

### Phase 38: Student Invoicing Generation
- **Source Logic:** Auto-generating invoices from rate cards (§19).
- **Files Audited:** `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify line-item mappings based on expected course hours.
  - [x] Identify hardcoded values and missing `InvoiceLineItem` schemas (ISSUE-040).

### Phase 39: Manual Payment Receipt Uploading
- **Source Logic:** Bank transfer payment matching and UTR references (§20).
- **Files Audited:** `src/lib/actions/billing.ts`
- **Checklist:**
  - [x] Verify receipt upload configurations.
  - [x] Identify ignored UTR inputs in parent fees page (ISSUE-020).

### Phase 40: Double-Entry Ledger Bookkeeping
- **Source Logic:** Debit/credit bookkeeping balancing rules (§21).
- **Files Audited:** `src/app/api/payments/[recordId]/approve/route.ts`
- **Checklist:**
  - [x] Verify transaction splits requirements.
  - [x] Identify single-entry logic drifts (ISSUE-044).

### Phase 41: Currency Conversions & Payout Processing
- **Source Logic:** Currency rate mappings and payout logs (§21).
- **Files Audited:** `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Check currency conversion lookup using `CurrencyRate`.
  - [x] Identify monoculture GBP enforcement (ISSUE-045).

---

## ── TICKETS, HR, MARKETING, & NOTIFICATIONS ───────────

### Phase 42: Ticket Category Routing
- **Source Logic:** Ticketing routing maps, staff assignments (§22).
- **Files Audited:** `src/lib/actions/tickets.ts`
- **Checklist:**
  - [x] Verify routing rules (internal tickets choose staff; external tickets choose department).
  - [x] Validate department mapping matches configured options.

### Phase 43: Ticket History logs & Reply Locks
- **Source Logic:** History tracking and status transition reply locks (§22).
- **Files Audited:** `src/lib/actions/tickets.ts`
- **Checklist:**
  - [x] Check ticket history logs tracking.
  - [x] Identify ticket query BOLA vulnerabilities (ISSUE-046).

### Phase 44: Marketing Canva/Drive Links Validation
- **Source Logic:** Social media calendar content validations (§25, §32).
- **Files Audited:** `src/lib/actions/marketing.ts`
- **Checklist:**
  - [x] Validate URL check formats.
  - [x] Identify creator ID metadata missing logs (ISSUE-047).

### Phase 45: Marketing Post Schedule Cadence
- **Source Logic:** Autogenerating posts from schedule slots (§32, §52).
- **Files Audited:** `src/lib/actions/marketing.ts`
- **Checklist:**
  - [x] Check post cadence configurations.
  - [x] Identify dead template generation loops (ISSUE-048).

### Phase 46: Ambassador Deliverables Grading
- **Source Logic:** Deliverables upload and star ratings (§16).
- **Files Audited:** `src/lib/actions/ambassador.ts`
- **Checklist:**
  - [x] Validate grading score constraints.
  - [x] Audit BOLA vulnerabilities in ambassador submission queries.

### Phase 47: Checklist Templates & Entries
- **Source Logic:** Task checklist mappings per user type (§31).
- **Files Audited:** `src/lib/actions/announcements.ts`
- **Checklist:**
  - [x] Verify template mapping rules.
  - [x] Identify BOLA vulnerabilities in checklists toggling (ISSUE-049).

### Phase 48: Management Overview Dashboard Stats
- **Source Logic:** Live card numbers, open tickets, pending claims (§14).
- **Files Audited:** `src/lib/actions/stats.ts`
- **Checklist:**
  - [x] Validate statistics count aggregation logic.
  - [x] Check query performance metrics.

### Phase 49: Management Disciplinary Ticket Routing
- **Source Logic:** HR notification flow triggers on management tickets (§14, §23).
- **Files Audited:** `src/lib/actions/hr.ts`
- **Checklist:**
  - [x] Verify HR routing triggers on ticket flags.
  - [x] Check warnings logging constraints.

### Phase 50: Department Knowledge Bank Entries
- **Source Logic:** Internal HOD documents cataloging (§25).
- **Files Audited:** `src/lib/actions/it.ts`
- **Checklist:**
  - [x] Verify domain classification validations.
  - [x] Check access constraints per department supervisor.

---

## ── AMBASSADOR SERVICES, REFERRALS & COMMISSIONS ────────────

### Phase 51: AmbassadorService Entity Implementation
- **Source Logic:** `AmbassadorService` with title, serviceType, currency, rate, isActive (§17).
- **Files Audited:** `src/lib/actions/ambassador.ts`, `src/app/api/enrolments/`
- **Checklist:**
  - [x] Confirm `AmbassadorService` table exists in Prisma schema with all §17 fields. (Failed: ISSUE-055 - rate non-nullable)
  - [x] Verify `serviceType` enum enforces `"MONTHLY" | "ONE_OFF"` only. (Note: serviceType is raw String in database, not enum)
  - [x] Check `rate` nullable path: ambassador allowance optional vs. always set. (Failed: rate is required)
  - [x] Audit API endpoint for creating/updating AmbassadorService records. (Note: getAmbassadorServices/getAmbassadorProgramme exist, no create/update actions implemented)

### Phase 52: Referral & ReferralClick Tracking
- **Source Logic:** `Referral` lifecycle (PENDING→ENROLLED→ACTIVE→CANCELLED) + `ReferralClick` with IP, userAgent, conversion booleans (§17, §19).
- **Files Audited:** `src/app/api/referrals/`, `src/lib/actions/ambassador.ts`
- **Checklist:**
  - [x] Verify `Referral.status` state machine enforces only the four defined statuses.
  - [x] Confirm `ReferralClick.ipAddress` and `userAgent` captured server-side (not client-supplied).
  - [x] Check `convertedToEnquiry` and `convertedToEnrolment` boolean flags are set atomically.
  - [x] Audit v19 additions: `convertedToEnquiryAt` and `convertedToEnrolmentAt` timestamp fields present. (Failed: ISSUE-056 - missing timestamp fields)
  - [x] Verify BOLA: referral lookup scoped to authenticated ambassador's own referrals only. (Note: no BOLA validation in referrer queries)

### Phase 53: AmbassadorCommissionList & AmbassadorCommissionItem Lifecycle
- **Source Logic:** Commission % per referred student, auto-inactive on student cancel, auto-resume on re-enrol (§9, §23–26).
- **Files Audited:** `src/lib/actions/ambassador.ts`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify one `AmbassadorCommissionItem` maps to exactly one `StudentEnrolmentItem`.
  - [x] Confirm commission % set at creation, immutable unless `AmbassadorCommissionRateChangeLog` entry created.
  - [x] Check auto-inactive trigger fires when linked `StudentEnrolmentItem` status → CANCELLED.
  - [x] Check auto-resume trigger fires when same student re-enrols.
  - [x] Audit `AmbassadorCommissionItemStatusChangeLog` records generated on every status change.

---

## ── CLAIMS, PAYCHECKS & AMBASSADOR PAYROLL ──────────────────

### Phase 54: Claim Entity — Teacher & Staff Payroll Claims
- **Source Logic:** One `Claim` per `EnrolmentList` per month; `ClaimLineItem` per session (§18).
- **Files Audited:** `src/lib/actions/claims.ts`, `src/app/api/claims/`
- **Checklist:**
  - [x] Verify v11 fix applied: `Claim` carries `teacherEnrolmentListId FK` AND `staffEnrolmentListId FK` (not single polymorphic `enrolmentListId`). (Failed: ISSUE-057 - Claim still uses polymorphic enrolmentListId)
  - [x] Confirm exactly one FK is non-null per claim row (check constraint or app-layer validation). (Failed: due to missing FK split)
  - [x] Audit `ClaimLineItem` fields: `sessionHours`, `staffRateSnapshot`, `lineTotal`, `groupCodeSnapshot` all populated. (Failed: ClaimLineItem missing relation to Claim - ISSUE-074)
  - [x] Verify `ClaimStatusChangeLog` entry created on every status transition with `changedByUserId` + `reason`.
  - [x] Check BOLA: staff/finance can only access claims for their own dept or explicit permission. (Failed: BOLA in submitClaim/getClaims/getMonthlyStats - ISSUE-030, ISSUE-079)

### Phase 55: Paycheck Generation from Approved Claims
- **Source Logic:** `Paycheck` → `PaycheckLineItem` with `lineType` SESSION/MEETING/CORRECTION (§18).
- **Files Audited:** `src/lib/actions/claims.ts`, `src/app/api/claims/`
- **Checklist:**
  - [x] Verify v11 fix applied: `Paycheck` carries `teacherEnrolmentListId FK` and `staffEnrolmentListId FK` split. (Failed: Paycheck still uses polymorphic enrolmentListId - ISSUE-057)
  - [x] Confirm v12 ERD relationship: `TeacherEnrolmentList ||--o{ Paycheck` and `StaffEnrolmentList ||--o{ Paycheck`. (Failed: due to missing FK split)
  - [x] Check v15 fix: `PaycheckLineItem.enrolmentItemId` split into `teacherEnrolmentItemId FK` and `staffEnrolmentItemId FK`. (Failed: PaycheckLineItem still uses single enrolmentItemId - ISSUE-058)
  - [x] Verify CORRECTION `lineType` flow: `originalPaycheckId`, `originalLineItemId`, `correctionReason` populated correctly.
  - [x] Audit `PaycheckStatusChangeLog` created on every paycheck status change.
  - [x] Confirm v46: `Claim ||--o| Paycheck` cardinality — paycheck optional until claim approved (not mandatory 1:1).

### Phase 56: AmbassadorClaim & AmbassadorPaycheck Flow
- **Source Logic:** AmbassadorClaim auto-populated from referral data; polymorphic `AmbassadorClaimLineItem` with COMMISSION and ALLOWANCE lineTypes (§18, §52, §54).
- **Files Audited:** `src/lib/actions/ambassador.ts`, `src/lib/actions/claims.ts`
- **Checklist:**
  - [x] Verify v54 schema: `AmbassadorClaim` carries `subtotal`, `netAmount`, `dueAmount` (NOT old `totalStudentAmountPaid`/`commissionAmount`). (Failed: AmbassadorClaim uses old fields - ISSUE-059)
  - [x] Confirm `commissionListId FK` nullable on `AmbassadorClaim` (allowance-only claims have no commission list).
  - [x] Check `AmbassadorClaimLineItem.lineType` enforces `"COMMISSION" | "ALLOWANCE"` only. (Failed: missing lineType enum and allowance fields)
  - [x] Verify COMMISSION line: `commissionItemId` + `studentEnrolmentItemId` set; `rateSnapshot` null.
  - [x] Verify ALLOWANCE line: `ambassadorEnrolmentItemId` + `rateSnapshot` set; commission fields null.
  - [x] Audit v19 fix: `AmbassadorPaycheck.netAmount` field present between `subtotal` and `dueAmount`. (Failed: AmbassadorPaycheck missing netAmount field)
  - [x] Confirm `AmbassadorClaimStatusChangeLog` and `AmbassadorPaycheckStatusChangeLog` created on each status change.

---

## ── INVOICING DEEP-DIVE ──────────────────────────────────────

### Phase 57: StudentInvoice Full Field Compliance
- **Source Logic:** `StudentInvoice` with `invoiceMode` AUTO_MONTHLY/ONE_OFF, `reminderStage`, `discountApplied` (§19).
- **Files Audited:** `src/app/api/invoices/`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify `invoiceMode` enum enforces only `"AUTO_MONTHLY" | "ONE_OFF"`.
  - [x] Confirm `reminderStage` integer increments on each payment reminder sent.
  - [x] Check `discountApplied` correctly computed from linked `Discount` records.
  - [x] Audit `StudentInvoiceStatusChangeLog` entry on every status change with `changedByUserId` + `reason`.
  - [x] Verify billing only starts when `StudentEnrolmentItem.status = ACTIVE` (§26 business rule 19).

### Phase 58: InvoiceLineItem Schema Compliance
- **Source Logic:** `InvoiceLineItem` with `lineType` SESSION/ADHOC/CORRECTION, correction self-reference fields (§19).
- **Files Audited:** `src/app/api/invoices/`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify `lineType` enforces only `"SESSION" | "ADHOC" | "CORRECTION"`.
  - [x] Check CORRECTION lines: `originalInvoiceId`, `originalLineItemId`, `correctionReason`, `originalSessionDate`, `correctionAmount` all populated.
  - [x] Confirm `rateSnapshot`, `groupCodeSnapshot`, `teacherNameSnapshot`, `serviceNameSnapshot` captured at invoice generation time (immutable snapshot).
  - [x] Audit currency conversion fields: `originalCurrency`, `conversionRateUsed`, `convertedAmount` set correctly for non-base-currency students.

### Phase 59: BillingMonth Gating (was InvoiceMonth)
- **Source Logic:** `BillingMonth` as period gate — invoices/paychecks cannot be created for unopened months (§43, §44).
- **Files Audited:** `src/app/api/invoices/`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Confirm `InvoiceMonth` renamed to `BillingMonth` in Prisma schema (v14 rename).
  - [x] Verify `invoiceMonthId`/`paycheckMonthId` field names updated to `billingMonthId` on `StudentInvoice`, `Paycheck`, `AmbassadorPaycheck`.
  - [x] Check application guard: invoice/paycheck creation fails if no `BillingMonth` row exists for target month.
  - [x] Audit `BillingMonth.month` unique constraint enforces canonical format (e.g. `"2025-03"`).
  - [x] Confirm `string month` denorm on financial entities exactly matches their `BillingMonth.month` FK value (§43 maintenance rule).

---

## ── PAYMENT METHODS, LEDGER & BUDGETS ───────────────────────

### Phase 60: PaymentMethod & PaymentRecord Schema Compliance
- **Source Logic:** `PaymentRecord` with `entityType` polymorphic (STUDENT_INVOICE/PAYCHECK/AMBASSADOR_PAYCHECK), `receiptLink` mandatory (§20, §26 rule 35).
- **Files Audited:** `src/app/api/payments/`, `src/lib/actions/billing.ts`
- **Checklist:**
  - [x] Verify `PaymentRecord.entityType` enforces only three valid values.
  - [x] Confirm `receiptLink` validated non-null/non-empty on submission (except Stripe flow).
  - [x] Audit v15 fix: `PaymentMethod ||--o{ PaymentRecord : "paid from"` — `payingPaymentMethodId FK` relationship present in schema.
  - [x] Check `receiverConfirmed`, `confirmedByUserId`, `confirmedAt` set atomically when finance approves payment.
  - [x] Verify `disputeReason` and `disputeNotes` required when status transitions to DISPUTED.

### Phase 61: Double-Entry Ledger Compliance
- **Source Logic:** `LedgerEntry` linked to `AccountTransaction`, with `direction` debit/credit and purpose (§21).
- **Files Audited:** `src/app/api/payments/[recordId]/approve/route.ts`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify every `PaymentRecord` approval creates exactly two `LedgerEntry` rows (debit + credit).
  - [x] Confirm `LedgerEntry.bankAccountId` always points to a valid `BankAccount`.
  - [x] Check v41 fix: `Claim ||--o{ LedgerEntry : "references"` — `LedgerEntry.claimId FK` relationship present in schema.
  - [x] Audit `BudgetUtilisation` records created when dept expenditures reduce `BudgetSubCategory.utilised`.
  - [x] Verify `BudgetSubCategory.remaining` computed correctly: `allocated - utilised`.

### Phase 62: DeptBudget Lifecycle & Quarterly Allocation
- **Source Logic:** `DeptBudget` per dept per quarter with `BudgetSubCategory` breakdown (§21).
- **Files Audited:** `src/lib/actions/finance.ts`, `src/app/portal/`
- **Checklist:**
  - [ ] Confirm `DeptBudget.status` enforces valid states and transitions.
  - [ ] Check `quarterStart` and `quarterEnd` validate non-overlapping date ranges per dept.
  - [ ] Verify budget creation form available to Finance dept only (RBAC check).
  - [ ] Audit `subCategoryType` values seeded/validated against allowed types.

---

## ── ROLE RECORDS & DISCIPLINARY SYSTEM ──────────────────────

### Phase 63: Four-Role Record Tables — StudentRecord, TeacherRecord, StaffRecord, AmbassadorRecord
- **Source Logic:** Every role has its own record table with `recordType`, `triggeredByTicketId` (nullable), `issuedByUserId` (§27).
- **Files Audited:** `src/lib/actions/hr.ts`, `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify all four `XRecord` tables exist in Prisma schema.
  - [x] Confirm v21 fix: `recordType` string field replaced with `cuid recordTypeId FK` on all four tables. (Failed: ISSUE-060 - XRecord tables still use string recordType)
  - [x] Check `triggeredByTicketId` nullable — manually-issued records allowed without ticket.
  - [x] Audit `issuedByUserId` FK always resolves to HR or Management role user.
  - [x] Verify `documentLink` nullable — records without attachments permitted.

### Phase 64: RecordType Lookup Table — targetUserTypeId Scoping
- **Source Logic:** `RecordType` with `targetRole` → `targetUserTypeId FK` (v21); role-scoped dropdown in UI (§27, §47, §51).
- **Files Audited:** `src/lib/actions/hr.ts`, `src/app/portal/`
- **Checklist:**
  - [x] Confirm `RecordType.targetUserTypeId FK` references `UserType` table (v21 rename from `targetRole` string).
  - [x] Verify UI record-type dropdown filters: `WHERE targetUserTypeId IN (<role-type-id>, <ALL-type-id>)`.
  - [x] Check seed data: `SUSPENSION` → STUDENT only, `PROTOCOL_VIOLATION` → TEACHER/STAFF, `WARNING`/`COMMENDATION`/`NOTE`/`TERMINATION` → ALL.
  - [x] Audit no cross-role record types surfacing in wrong role forms.

---

## ── LOOKUP TABLE NORMALISATION (§28, §33, §51) ──────────────

### Phase 65: Department Lookup Table — deptId FK Migration
- **Source Logic:** `Department` lookup replaces all `string dept` fields across 13 entities (§51).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/`
- **Checklist:**
  - [x] Verify `Department` model exists in Prisma schema with `id PK`, `name UK`, `isActive`.
  - [x] Confirm all 13 entities use `cuid deptId FK` instead of `string dept`: `StaffProfile`, `StaffService`, `Meeting`, `GeneralMeeting`, `Claim`, `DeptBudget`, `ContentGroup`, `ContentBankItem`, `KnowledgeBankList`, `BacklogItem`, `MeetingBacklogItem`, `JobPosting`, `PortalPermission`.
  - [x] Audit seed data: `PR_OPS`, `HR`, `FINANCE`, `MARKETING`, `IT`, `MANAGEMENT` rows present.
  - [x] Check no residual `string dept` columns on migrated entities (no Frankenstein hybrid).

### Phase 66: StaffRole Lookup Table — staffRoleId FK Migration
- **Source Logic:** `StaffRole` replaces `string role` on `StaffProfile`, `Candidate`, `JobPosting`, `PortalPermission` (§51).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/users.ts`
- **Checklist:**
  - [x] Verify `StaffRole` model exists with `id PK`, `name UK`, `isActive`.
  - [x] Confirm `staffRoleId FK` used on `StaffProfile`, `Candidate`, `JobPosting`, `PortalPermission`.
  - [x] Verify `StaffProfile.roleTitle` free-text field retained alongside `staffRoleId` (distinct fields).
  - [x] Audit seed data: `TEACHER`, `TA`, `SM`, `HR`, `ACCOUNTS`, `IT`, `MANAGER`, `COORDINATOR` rows present.

### Phase 67: UserType Lookup Table — targetUserTypeId FK Migration
- **Source Logic:** `UserType` replaces `string targetRole`/`candidateType` on `RecordType`, `RegistrationForm`, `ChecklistTemplate`, `Candidate` (§51).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/`
- **Checklist:**
  - [x] Verify `UserType` model exists with `id PK`, `name UK`, `isActive`.
  - [x] Confirm `ALL` row exists as hard dependency (RecordType shared types reference it).
  - [x] Verify `RecordType.targetUserTypeId`, `RegistrationForm.targetUserTypeId`, `ChecklistTemplate.targetUserTypeId`, `Candidate.candidateUserTypeId` all use FK.
  - [x] Audit seed data: `STUDENT`, `TEACHER`, `STAFF`, `AMBASSADOR`, `PARENT`, `ALL` rows present.

### Phase 68: Remaining Lookup Tables — FK Conversion Compliance
- **Source Logic:** All string classification fields converted to FK lookups (§28, §33).
- **Files Audited:** `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify `Ticket.ticketTypeId FK` references `TicketType` (not string `ticketType`). (Failed: ISSUE-061 - Ticket still uses raw string)
  - [x] Verify `StudentFlag.flagTypeId FK` references `FlagType`. (Failed: ISSUE-061 - StudentFlag still uses raw string)
  - [x] Verify `MockItem.mockTypeId FK` references `MockType`.
  - [x] Verify `AmbassadorTestItem.testTypeId FK` references `AmbassadorTestType`.
  - [x] Verify `Candidate.outreachSourceId FK` references `OutreachSource`. (Failed: ISSUE-061 - Candidate still uses raw string)
  - [x] Verify `Lead.outreachSourceId FK` references `OutreachSource` (v19 fix — was raw string). (Failed: ISSUE-061 - Lead still uses raw string)
  - [x] Confirm `MarketingPost` no longer carries raw `campaignTag` string. (Failed: ISSUE-064 - MarketingPost still uses campaignTag string)

---

## ── NOTIFICATIONS, ANNOUNCEMENTS & MISC ─────────────────────

### Phase 69: Notification System Implementation
- **Source Logic:** Per-user `Notification` with `notificationTypeId FK`, `entityType`, `entityId`, `read`, `readAt` (§29, §48).
- **Files Audited:** `src/app/api/notifications/`, `src/lib/actions/announcements.ts`
- **Checklist:**
  - [x] Verify `Notification` model has `notificationTypeId FK` referencing `NotificationType`.
  - [x] Confirm v48 addition: `readAt datetime` (nullable) exists alongside `bool read`. (Failed: ISSUE-062 - Notification missing readAt)
  - [x] Check `readAt` set atomically when `read` flipped to true (not two separate operations).
  - [x] Audit `entityType` and `entityId` populated for system-triggered notifications (attendance alerts, payment due, etc.).
  - [x] Verify `ProgressReport` → Notification trigger fires when report status → SENT (§39).

### Phase 70: Announcement System — createdByUserId Audit Trail
- **Source Logic:** `Announcement` with `targets`, `targetDept`, `targetUserId`, `expiresAt` (§25, §47).
- **Files Audited:** `src/lib/actions/announcements.ts`
- **Checklist:**
  - [x] Verify v47 addition: `Announcement.createdByUserId FK` present in schema. (Failed: ISSUE-062 - Announcement missing createdByUserId)
  - [x] Confirm `targets` field validated against known user type values.
  - [x] Check `expiresAt` enforced: expired announcements excluded from active queries.
  - [x] Audit `emailSent` boolean toggled correctly after email dispatch.

### Phase 71: SiteLog & AccessLog Security Compliance
- **Source Logic:** `SiteLog` captures action + entity + IP + device + metaBefore/metaAfter; `AccessLog` with grant/revoke audit trail (§25, §50).
- **Files Audited:** `src/lib/`, `src/middleware.ts`
- **Checklist:**
  - [x] Verify `SiteLog` records written for create/update/delete operations on sensitive entities (invoices, claims, user profiles).
  - [x] Confirm v50 additions: `AccessLog.revokedAt` and `revokedByUserId FK` present. (Failed: ISSUE-063 - AccessLog missing revokedAt/revokedByUserId)
  - [x] Audit `AccessLog.credential` field: validate NO raw secrets, passwords, or API keys stored (§50 security note).
  - [x] Check `metaBefore`/`metaAfter` JSON captures meaningful diff, not full object dumps. (Failed: ISSUE-073 - SiteLog metaBefore/metaAfter typed String instead of Json)

---

## ── JOB POSTINGS & REGISTRATION FORMS ───────────────────────

### Phase 72: JobPosting Entity & Candidate Linkage
- **Source Logic:** `JobPosting` with `jobPostingLink`, `jobPostingPosterLink`, status DRAFT/OPEN/CLOSED (§30, §33).
- **Files Audited:** `src/app/api/jobs/`, `src/app/api/careers/`
- **Checklist:**
  - [x] Verify `JobPosting` model exists with all §30 fields.
  - [x] Confirm `Candidate.jobPostingId FK` nullable field present (v33 addition). (Failed: ISSUE-068 - Candidate missing jobPostingId FK)
  - [x] Check `Candidate.offerLetterLink` and `Candidate.rejectionReason` nullable fields present (v33). (Failed: ISSUE-068 - missing fields)
  - [x] Audit `Candidate.createdAt` timestamp exists (v19 addition for pipeline velocity). (Failed: ISSUE-068 - missing createdAt)
  - [x] Verify status transitions: DRAFT → OPEN → CLOSED enforced; no re-opening closed postings without explicit logic.

### Phase 73: RegistrationForm → Candidate Auto-Conversion
- **Source Logic:** `RegistrationForm` + `RegistrationFormEntry`; on submit auto-creates `Candidate`; `convertedToCandidateId` set on conversion (§30).
- **Files Audited:** `src/app/api/public/`, `src/app/api/admissions/`
- **Checklist:**
  - [x] Verify `RegistrationForm.isPublic` gates public-facing visibility.
  - [x] Confirm `RegistrationFormEntry.status` transitions: NEW → REVIEWED → CONVERTED or DISMISSED.
  - [x] Check `convertedToCandidateId FK` set atomically when entry converted to Candidate.
  - [x] Audit `additionalData json` field: sanitised before storage (no raw executable content). (Failed: ISSUE-069 - RegistrationFormEntry.additionalData typed String instead of Json)
  - [x] Verify `targetUserTypeId FK` references `UserType` (v21 FK migration applied).

---

## ── CHECKLIST SYSTEM ────────────────────────────────────────

### Phase 74: ChecklistTemplate & ChecklistTemplateItem Management
- **Source Logic:** Staff-managed templates per entityType + targetRole; four known templates (§31).
- **Files Audited:** `src/lib/actions/announcements.ts`, `src/app/portal/`
- **Checklist:**
  - [x] Verify `ChecklistTemplate.entityType` enforces `"ACADEMIC_SESSION" | "MEETING" | "AMBASSADOR_MEETING"`.
  - [x] Confirm `targetUserTypeId FK` references `UserType` (v21 migration — was `targetRole` string).
  - [x] Audit four required seed templates exist: Teacher Pre-Class, Student In-Class, Staff Meeting, Ambassador Meeting.
  - [x] Check `ChecklistTemplateItem.order` field enforced as unique-per-template or at least non-null.

### Phase 75: ChecklistEntry & ChecklistItemEntry Lifecycle
- **Source Logic:** `ChecklistEntry` per user per session/meeting; `ChecklistItemEntry` per item; `completed` = all items checked (§31).
- **Files Audited:** `src/lib/actions/announcements.ts`, `src/app/api/`
- **Checklist:**
  - [x] Verify v15 addition: `User ||--o{ ChecklistEntry : "assigned to"` relationship present in schema.
  - [x] Confirm `ChecklistEntry.completed` computed correctly: true only when ALL `ChecklistItemEntry.checked = true`.
  - [x] Audit v51 composite unique constraint: `ChecklistItemEntry UNIQUE(checklistEntryId, templateItemId)` present at DB level.
  - [x] Check BOLA: user can only check/view their own ChecklistEntry rows. (Failed: BOLA vulnerability in checklist actions - ISSUE-049)

---

## ── MARKETING, CAMPAIGNS & OUTREACH ────────────────────────

### Phase 76: MarketingPost Schema v32/v39/v52 Compliance
- **Source Logic:** `MarketingPost` updated in v32/v39 — uses `platformTypeId`, `postTypeId`, `contentTypeId`, `createdByUserId`; `campaignTag` string removed (§32, §35, §50).
- **Files Audited:** `src/lib/actions/marketing.ts`
- **Checklist:**
  - [x] Verify `MarketingPost.platformTypeId FK` references `SocialPlatformType`. (Failed: ISSUE-064 - missing relations)
  - [x] Verify `MarketingPost.postTypeId FK` references `SocialPostType`. (Failed: ISSUE-064 - missing relations)
  - [x] Verify `MarketingPost.contentTypeId FK` references `ContentType` (v35 addition). (Failed: ISSUE-064 - missing relations)
  - [x] Confirm v50 addition: `MarketingPost.createdByUserId FK` present. (Failed: ISSUE-064 - missing relations)
  - [x] Confirm no residual `string campaignTag` or `string contentType` fields on entity. (Failed: ISSUE-064 - campaignTag/contentType string still present)
  - [x] Check `status` enforces `"DRAFT" | "SCHEDULED" | "POSTED" | "MISSED"`.

### Phase 77: Campaign & CampaignItem Polymorphic Structure
- **Source Logic:** `Campaign` + `CampaignItem` polymorphic via `itemType` (POST/OUTREACH/EXHIBITION) (§32, §34).
- **Files Audited:** `src/lib/actions/marketing.ts`
- **Checklist:**
  - [x] Verify `Campaign` model with all §32 fields present.
  - [x] Confirm `CampaignItem.itemType` enforces `"MARKETING_POST" | "OUTREACH" | "EXHIBITION"`.
  - [x] Check `CampaignItem.entityId` + `entityType` polymorphic pair set consistently.
  - [x] Audit `Campaign.status` transitions: DRAFT→ACTIVE→COMPLETED|CANCELLED.

### Phase 78: OutreachItem & ExhibitionItem Implementation
- **Source Logic:** `OutreachItem` and `ExhibitionItem` as CampaignItem entity types (§34).
- **Files Audited:** `src/lib/actions/marketing.ts`, `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify `OutreachItem` model exists with `outreachTypeId FK`, `assignedToUserId FK`, `leadCount`, `status`.
  - [x] Verify `ExhibitionItem` model exists with `exhibitionTypeId FK`, `venue`, `location`, `leadCount`, `status`.
  - [x] Confirm `OutreachType` and `ExhibitionType` lookup tables present in schema.
  - [x] Audit `completedAt` nullable on both entities — null means not yet completed.
  - [x] Check `status` state machines enforced for each entity (PLANNED/IN_PROGRESS/COMPLETED/CANCELLED vs. PLANNED/CONFIRMED/COMPLETED/CANCELLED).

### Phase 79: MarketingSchedule → PostSlot → Post Cadence Chain
- **Source Logic:** `MarketingSchedule` → `MarketingScheduleOccurrence` → `MarketingPostSlot` → `MarketingPost`; missed-slot auto-ticket (§52).
- **Files Audited:** `src/lib/actions/marketing.ts`, `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify `MarketingSchedule` model with v54 additions: `deptId FK` + `createdByUserId FK`.
  - [x] Confirm `MarketingScheduleOccurrence` model with `postTypeId FK`, `recurrenceType`, `quotaPerPeriod`.
  - [x] Verify v54 addition: `MarketingScheduleOccurrenceStatusChangeLog` table present.
  - [x] Check `MarketingPostSlot.status` enforces `"PENDING" | "FULFILLED" | "MISSED"`.
  - [x] Confirm `MarketingPostSlot.missedTicketId FK` set when missed-post ticket auto-raised. (Failed: ISSUE-081 - missedTicketId lacks relation definition)
  - [x] Audit v54 removal: `MarketingPostSlot.postTypeId` no longer present (resolved via occurrence).
  - [x] Verify `MarketingPost.slotId FK` nullable (ad-hoc posts not tied to slot). (Failed: slotId relation missing on MarketingPost - ISSUE-064)

---

## ── SYLLABUS CHAPTER STRUCTURE & RECORDINGS ─────────────────

### Phase 80: SyllabusChapter Entity — New Hierarchy Layer
- **Source Logic:** `SyllabusList → SyllabusChapter → SyllabusItem → StudentSyllabusProgress` (§36, §39).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Verify `SyllabusChapter` model exists with `syllabusListId FK`, `chapterNum`, `chapterTitle`, `order`, `isActive`.
  - [x] Confirm `SyllabusItem.syllabusChapterId FK` present (replaces old `chapterNum`/`chapterTitle` on item).
  - [x] Audit no residual `chapterNum`/`chapterTitle` fields remaining on `SyllabusItem`.
  - [x] Check chapter `order` field enforced unique-per-syllabus-list or sequential.

### Phase 81: ChapterRecordingList & ChapterRecordingItem
- **Source Logic:** One curated recording list per `SyllabusChapter`; one recording can appear in multiple chapters (§36, §41).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Verify `ChapterRecordingList` model with `syllabusChapterId FK` (one-to-one).
  - [x] Confirm `ChapterRecordingItem` model with `recordingId FK`, `notes`, `order`.
  - [x] Audit v41 fix: `ChapterRecordingItem` cardinality is `Recording ||--o{ ChapterRecordingItem` (one-to-many, not one-to-one).
  - [x] Verify v51 composite unique: `ChapterRecordingItem UNIQUE(chapterRecordingListId, recordingId)` enforced at DB.
  - [x] Check v15 fix: `ChapterRecordingList.syllabusChapterId` constraint marker is FK (not UK).

### Phase 82: Recording Entity — Full Connection Compliance
- **Source Logic:** `Recording` links to `serviceId` (always set), `sessionId` (nullable), `meetingId` (nullable); at least one of session/meeting required (§36, §39, §41).
- **Files Audited:** `src/lib/actions/progress.ts`, `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify `Recording.sessionId` and `meetingId` both nullable in schema.
  - [x] Confirm app-layer validation: at least one of `sessionId`/`meetingId` must be set on creation.
  - [x] Audit v48 addition: `Recording.uploadedByUserId FK` present. (Failed: ISSUE-065 - uploadedByUserId missing)
  - [x] Check `Meeting ||--o{ Recording : "recorded as"` relationship line present in schema (v41 fix). (Failed: ISSUE-065 - meeting relation missing)

---

## ── PERFORMANCE METRICS & PROGRESS REPORTS ──────────────────

### Phase 83: MetricSnapshot Monthly Computation
- **Source Logic:** `MetricSnapshot` auto-computed 1st of each month per entityType (STUDENT/TEACHER/STAFF/AMBASSADOR/SERVICE/ORG) (§37).
- **Files Audited:** `src/app/api/metrics/`, `src/lib/actions/stats.ts`
- **Checklist:**
  - [x] Verify `MetricSnapshot` model with `entityType`, `entityId`, `month`, `metrics json`, `snapshotAt`.
  - [x] Confirm STUDENT metrics blob contains all 8 required fields: `attendanceRate`, `syllabusCompletion`, `avgMasteryPct`, `taskCompletionRate`, `avgTaskScore`, `avgMockScore`, `noShowCount`, `paymentStatus`.
  - [x] Confirm TEACHER metrics blob: `sessionsDelivered`, `hoursLogged`, `avgFeedbackStars`, `submissionComplianceRate`, `noShowCount`.
  - [x] Confirm AMBASSADOR metrics: `referralClicks`, `referralsConverted`, `commissionEarned`, `meetingsAttended`, `programmeProgress`.
  - [x] Audit ORG metrics rollup: `totalActiveStudents`, `totalRevenue`, `totalClaimsPaid`, `avgStudentAttendance`, `avgTeacherCompliance`, `newEnrolments`, `cancellations`, `netEnrolmentChange`.
  - [x] Verify scheduled job or cron exists to trigger snapshot computation on 1st of month.

### Phase 84: ProgressReport Generation & Review Flow
- **Source Logic:** Auto-generated monthly PDF; GENERATED → REVIEWED → SENT; triggers notification to student + parent (§37, §39).
- **Files Audited:** `src/app/api/metrics/`, `src/lib/actions/progress.ts`
- **Checklist:**
  - [x] Verify `ProgressReport` model with `metricSnapshotId FK`, `pdfLink`, `staffComments`, `status`, `reviewedByUserId FK`, `sentAt`.
  - [x] Confirm `status` enforces `"GENERATED" | "REVIEWED" | "SENT"`.
  - [x] Check notification triggered to student AND parent when status → SENT.
  - [x] Audit `pdfLink` generated and stored (not just path placeholder) — verify actual PDF generation logic.
  - [x] Confirm BOLA: student/parent can only view their own/linked progress reports. (Failed: ISSUE-043 - BOLA in progress actions)

---

## ── RBAC DEEP-DIVE & PORTAL PERMISSION RESOLUTION ───────────

### Phase 85: PortalPermission Override Resolution Order
- **Source Logic:** Resolution order: individual user override → dept-level → role-level → code default (§38).
- **Files Audited:** `src/lib/rbac.ts`, `src/middleware.ts`
- **Checklist:**
  - [x] Verify resolution algorithm checks `userId`-scoped rows first, then `role+dept`, then `role-only`, then falls back to code defaults. (Failed: ISSUE-034 - PortalPermission RBAC bypassed)
  - [x] Confirm all 14 resource types recognised: `INVOICES`, `SCHEDULES`, `CURRICULUM`, `CLAIMS`, `REPORTS`, `CANDIDATES`, `TICKETS`, `CONTENT_BANK`, `KNOWLEDGE_BANK`, `BACKLOG`, `CAMPAIGNS`, `ANALYTICS`, `ADMIN_LOOKUPS`, `PAYROLL`, `BUDGET`.
  - [x] Audit IT dept manages `PortalPermission` rows only via admin panel — no direct DB access from other portals.
  - [x] Check MANAGEMENT role has full access by code default — no `PortalPermission` row needed.

### Phase 86: Role-Default Code Permission Audit
- **Source Logic:** Code-defined defaults per role — STUDENT/PARENT/TEACHER/STAFF/AMBASSADOR/MANAGEMENT (§38).
- **Files Audited:** `src/lib/rbac.ts`, `src/middleware.ts`
- **Checklist:**
  - [x] Verify STUDENT code default: `canView` own schedule, curriculum, invoices, progress reports only.
  - [x] Verify PARENT code default: `canView` linked student's schedule, invoices, progress reports.
  - [x] Verify TEACHER code default: `canView+canEdit` own sessions, curriculum, claims; `canView` students in their services.
  - [x] Verify AMBASSADOR code default: `canView` own programme, referrals, commission, meetings.
  - [x] Audit no staff dept portal accessing finance/payroll without explicit `canView` permission.

---

## ── SCHEMA CHANGESET COMPLIANCE (v14–v23) ───────────────────

### Phase 87: v14 — XStatusHistory → XStatusChangeLog Rename
- **Source Logic:** All `XStatusHistory` tables renamed to `XStatusChangeLog` globally (§44).
- **Files Audited:** `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify no `XStatusHistory` model names remain in Prisma schema. (Renamed globally to XStatusChangeLog)
  - [x] Confirm all 11 renamed tables exist: `StudentEnrolmentItemStatusChangeLog`, `TeacherEnrolmentItemStatusChangeLog`, `StaffEnrolmentItemStatusChangeLog`, `AmbassadorEnrolmentItemStatusChangeLog`, `AmbassadorCommissionItemStatusChangeLog`, `RateItemStatusChangeLog`, `ScheduleOccurrenceStatusChangeLog`, `StaffScheduleOccurrenceStatusChangeLog`, `AmbassadorScheduleOccurrenceStatusChangeLog`, `SyllabusListStatusChangeLog`, `AmbassadorProgrammeContentListStatusChangeLog`.
  - [x] Audit application layer uses `XStatusChangeLog` model names in Prisma client calls.

### Phase 88: v14 — Five Versioned Sub-Lists & Their StatusChangeLogs
- **Source Logic:** `TaskList`, `MockList`, `CourseTimelineList`, `AmbassadorTestList`, `AmbassadorProgrammeTimelineList` promoted to versioned lists with `name`, `version string`, `status`, activation timestamps (§44).
- **Files Audited:** `prisma/schema.prisma`
- **Checklist:**
  - [x] Verify all five sub-list models have `name`, `string version`, `status`, `activatedAt`, `pausedAt`, `deactivatedAt`, `isActive`.
  - [x] Confirm v15 fix: `version` typed as `string` (not `int`) on all five.
  - [x] Verify five corresponding StatusChangeLog tables exist: `TaskListStatusChangeLog`, `MockListStatusChangeLog`, `CourseTimelineListStatusChangeLog`, `AmbassadorTestListStatusChangeLog`, `AmbassadorProgrammeTimelineListStatusChangeLog`.
  - [x] Audit `CurriculumList → TaskList/MockList/CourseTimelineList` relationships are one-to-many (not one-to-one — v10 cardinality fix).

### Phase 89: v14 — Session/Meeting StatusChangeLogs Added
- **Source Logic:** `AcademicSession`, `Meeting`, `AmbassadorMeeting` all get status audit trail tables; `GeneralMeeting` added in v16 (§44, §46).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/meetings.ts`
- **Checklist:**
  - [x] Verify `AcademicSessionStatusChangeLog` model present with `sessionId FK`, `fromStatus`, `toStatus`, `changedAt`, `changedByUserId FK`, `reason`.
  - [x] Verify `MeetingStatusChangeLog` model present.
  - [x] Verify `AmbassadorMeetingStatusChangeLog` model present.
  - [x] Verify v46 addition: `GeneralMeetingStatusChangeLog` model present. (Failed: ISSUE-080 - GeneralMeetingStatusChangeLog defined but never written to in action code)
  - [x] Audit application layer writes StatusChangeLog on every session status transition.

### Phase 90: v14 — CurrencyRate effectiveDate & Historical Rate Lookup
- **Source Logic:** `CurrencyRate.effectiveDate` added; historical rate lookup: `effectiveDate <= billingDate ORDER BY effectiveDate DESC LIMIT 1` (§44).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify `CurrencyRate.effectiveDate datetime` field present in schema.
  - [x] Confirm v46 composite unique constraint: `UNIQUE(fromCurrency, toCurrency, effectiveDate)` enforced at DB level. (Failed: ISSUE-066 - CurrencyRate uses single unique key on fromCurrency instead of composite unique)
  - [x] Audit invoice/paycheck generation uses historical rate lookup (not current rate).
  - [x] Check no code still uses a single static `CurrencyRate` per pair (ISSUE-045 root cause).

### Phase 91: v16 — Claim → Paycheck Cardinality & CurrencyRate Composite Unique
- **Source Logic:** `Claim ||--o| Paycheck` (not mandatory 1:1); `AmbassadorClaim ||--o| AmbassadorPaycheck`; composite unique on `CurrencyRate` (§46).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/claims.ts`
- **Checklist:**
  - [x] Verify Paycheck creation only triggered post-claim APPROVED status (not on SUBMITTED).
  - [x] Confirm no code creates Paycheck automatically on Claim creation.
  - [x] Audit `User.referralCode` (general) distinct from `AmbassadorProfile.referralCode UK` (programme-specific) — both retained.

### Phase 92: v17 — StudentProfile Setup Flag Timestamps
- **Source Logic:** `gcrAssignedAt`, `groupAssignedAt`, `scheduleAssignedAt`, `financeApprovedAt` added alongside existing boolean flags (§47).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/onboarding.ts`
- **Checklist:**
  - [x] Verify all four `At` datetime fields present and nullable in `StudentProfile`.
  - [x] Confirm application layer sets `At` timestamp when boolean flag flipped to true.
  - [x] Audit onboarding SLA reporting: can query time-to-complete each setup step per student.
  - [x] Check v48 addition: `StudentProfile.cancelledAt datetime` present (alongside existing `cancellationReason`).

### Phase 93: v47 — Discount.appliedByUserId & v48 Notification.readAt
- **Source Logic:** `Discount.appliedByUserId FK` + `createdAt` added; `Notification.readAt datetime` added; `TextFormat.dateAdded` → datetime (§47, §48).
- **Files Audited:** `prisma/schema.prisma`, `src/lib/actions/finance.ts`
- **Checklist:**
  - [x] Verify `Discount.appliedByUserId FK` and `Discount.createdAt` present in schema. (Failed: ISSUE-070 - Discount missing appliedByUserId FK and createdAt)
  - [x] Confirm `Notification.readAt datetime` nullable field present (v48 fix). (Failed: ISSUE-062 - Notification missing readAt)
  - [x] Audit `readAt` set atomically with `read = true` flip.
  - [x] Check `TextFormat.dateAdded` typed as `datetime` (not `date` — v48 fix).

---

## ── SEED DATA GATES ──────────────────────────────────────────

### Phase 94: Required Seed Data — Hard Dependency Verification
- **Source Logic:** Seed rows required before system can boot; missing rows cause FK resolution failures (§53).
- **Files Audited:** `prisma/seed.ts` or equivalent, `data/`
- **Checklist:**
  - [x] Verify `UserType` seed includes `STUDENT`, `TEACHER`, `STAFF`, `AMBASSADOR`, `PARENT`, `ALL` rows.
  - [x] Confirm `ALL` row exists as hard dependency (RecordType/RegistrationForm/ChecklistTemplate shared types reference it).
  - [x] Verify `SessionType` seed includes `DEPT_INTERNAL`, `WORKSHOP`, `TOWNHALL`, `TEACHER_TRAINING`, `TRIAL` in addition to class types.
  - [x] Confirm `Department` seed: `PR_OPS`, `HR`, `FINANCE`, `MARKETING`, `IT`, `MANAGEMENT` present.
  - [x] Verify `StaffRole` seed: `TEACHER`, `TA`, `SM`, `HR`, `ACCOUNTS`, `IT`, `MANAGER`, `COORDINATOR` present.
  - [x] Audit `RecordType` seed: every row has valid `targetUserTypeId` FK (including the `ALL` row).
  - [x] Check no FK constraint violation on application boot due to missing seed rows.

---

## ── UJM JOURNEY COVERAGE ──────────────────────────────────

### Phase 95: UJM Journey 1 — Prospective Student / Visitor
- **Source Logic:** Registration form → Candidate creation → PR pipeline (UJM §2, §30).
- **Files Audited:** `src/app/api/public/`, `src/app/api/admissions/`, `src/lib/actions/leads.ts`
- **Checklist:**
  - [x] Verify public registration form visible without authentication (`RegistrationForm.isPublic = true`).
  - [x] Confirm form submission auto-creates `Candidate` record with correct `candidateUserTypeId` for STUDENT.
  - [x] Audit `Lead` record created from initial enquiry before candidate pipeline.
  - [x] Check `Lead.passedToPR = true` triggers auto-ticket assigned to PR dept supervisor. (Failed: ISSUE-077 - no trigger linked back to lead)
  - [x] Verify `Lead.handoffTicketId FK` set when handoff ticket created (v35 addition). (Failed: ISSUE-071, ISSUE-077 - handoffTicketId remains null)

### Phase 96: UJM Journey 3 — Parent / Guardian Portal
- **Source Logic:** Parent views linked student's schedule, invoices, progress reports; multi-child = one ParentProfile per child (UJM §4, §40).
- **Files Audited:** `src/app/portal/parent/`, `src/lib/actions/profile.ts`
- **Checklist:**
  - [x] Verify v40 fix: `ParentProfile.linkedStudentId FK` present pointing to `StudentProfile`. (Failed: ISSUE-072 - ParentProfile missing linkedStudentId)
  - [x] Confirm parent portal scoped strictly to `linkedStudentId` — no cross-student data leakage. (Failed: BOLA in getLinkedChildren - ISSUE-022)
  - [x] Audit multi-child parent: one `ParentProfile` per child, all sharing same `userId FK`.
  - [x] Check parent can view: schedule, invoices, progress reports — nothing else by code default.
  - [x] Verify WhatsApp/support contact links functional (not dead links — ISSUE-021).

### Phase 97: UJM Journey 6 — Staff: PR / Operations
- **Source Logic:** PR manages leads, candidates, tickets, campaigns, job postings (UJM §8).
- **Files Audited:** `src/app/portal/staff/pr/`, `src/lib/actions/leads.ts`, `src/lib/actions/candidate.ts`
- **Checklist:**
  - [x] Verify PR dept can view and manage `Lead` records.
  - [x] Confirm PR can create `JobPosting` and `Campaign` records.
  - [x] Audit PR ticket routing: external tickets from students/parents routed to PR by default.
  - [x] Check `OutreachItem` and `ExhibitionItem` CRUD available to PR dept users.
  - [x] Verify candidate pipeline visible to PR for admissions tracking.

### Phase 98: UJM Journey 8 — Staff: Finance
- **Source Logic:** Finance manages invoices, claims approval, paycheck processing, ledger, budgets (UJM §10).
- **Files Audited:** `src/app/portal/staff/finance/`, `src/lib/actions/finance.ts`, `src/lib/actions/claims.ts`
- **Checklist:**
  - [x] Verify Finance can approve/reject Claims and generate Paychecks.
  - [x] Confirm Finance sees full ledger and BankAccount balances.
  - [x] Audit Finance can open/close BillingMonth periods.
  - [x] Check Finance can create/edit DeptBudget and BudgetSubCategory records.
  - [x] Verify Finance cannot access HR records or candidate pipeline (RBAC gate).

### Phase 99: UJM Journey 9 — Staff: Marketing
- **Source Logic:** Marketing manages posts, campaigns, schedule cadence, content bank (UJM §11, §52).
- **Files Audited:** `src/app/portal/staff/marketing/`, `src/lib/actions/marketing.ts`
- **Checklist:**
  - [x] Verify Marketing can create and manage `MarketingPost`, `Campaign`, `CampaignItem` records.
  - [x] Confirm Marketing can define `MarketingSchedule` and `MarketingScheduleOccurrence` cadences.
  - [x] Audit missed-post detection: `MarketingPostSlot` with past `dueDate` and `status != FULFILLED` auto-raises ticket. (Failed: ISSUE-048 - missed-post check is dead)
  - [x] Check `ContentGroup` and `ContentBankItem` CRUD available to Marketing.
  - [x] Verify Marketing cannot access Finance or HR portals.

---

## ── ORG BACKLOG BANK & MEETING SPRINT SYSTEM ─────────────────

### Phase 100: BacklogItem, OrgBacklogBank & Meeting Sprint/Backlog Lists
- **Source Logic:** `OrgBacklogBank → BacklogItem` (status driven by linked Ticket); `MeetingSprintList`/`MeetingBacklogList` per meeting; auto-push after meeting ends (§35).
- **Files Audited:** `prisma/schema.prisma`, `src/app/portal/staff/`, `src/lib/actions/meetings.ts`
- **Checklist:**
  - [x] Verify `OrgBacklogBank` model present with `name`, `isActive`.
  - [x] Confirm `BacklogItem` model: `ticketId FK UK` (one-to-one mandatory), `orgBacklogBankId FK`, `dept`, `priority`, `isActive` — NO `status` field (status read from linked Ticket). (Failed: ISSUE-067 - BacklogItem still uses legacy flat schema)
  - [x] Verify `BacklogItemChangeLog` model: `event` enforces `"ADDED_TO_BANK" | "PULLED_TO_SPRINT" | "RETURNED_TO_BANK" | "TICKET_CLOSED"`.
  - [x] Confirm `MeetingSprintList` and `MeetingBacklogList` each have `meetingId FK UK` (one per meeting).
  - [x] Audit v51 composite unique: `MeetingSprintItem UNIQUE(sprintListId, backlogItemId)` at DB level.
  - [x] Verify auto-push flow: when meeting completes, all `MeetingBacklogItem` rows pushed to `OrgBacklogBank`; `pushedToBank = true`, `pushedAt` set.
  - [x] Check `BacklogItemChangeLog` entry written: `event = ADDED_TO_BANK`, `meetingId` recorded on auto-push.
  - [x] Audit `GeneralMeeting ||--o{ BacklogItemChangeLog : "triggers"` relationship (v40 fix) present in schema.
  - [x] Verify `v51 junction uniqueness constraints` enforced at DB for all five tables: `TaskAssignment`, `ContentGroupItem`, `ChecklistItemEntry`, `MeetingSprintItem`, `ChapterRecordingItem`.
