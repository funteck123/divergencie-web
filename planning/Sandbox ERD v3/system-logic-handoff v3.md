# System Logic & Schema Design — Full Handoff Document

> Complete business logic, all design decisions, and final entity definitions for the enrollment and billing system. Written for a builder agent (database, backend, or frontend). Read every section before making any implementation decisions.

---

## 1. Core Entities Overview

```
User
  └── StudentProfile
  └── TeacherProfile
  └── StaffProfile
  └── ParentProfile
  └── AmbassadorProfile

Group → Service → EnrollmentGroup → Enrollment → StudentInvoice → InvoiceLineItem
                                                                 └── (session-level lines)

Service → AcademicSession → Attendance (one per student per session)

Teacher → Claim → ClaimLineItem (one claim per month, lines per service)
```

---

## 2. Users & Profiles

Every person in the system is a `User`. Role-specific data lives in separate profile tables. A user can have multiple profiles (e.g. a teacher who is also a parent).

- `StudentProfile` — mainCurrency, timezone, schedule URLs, status, flags
- `TeacherProfile` — teaching profile URL, ID doc, salary account
- `StaffProfile` — role, dept, salary type/rate, supervisor flag
- `ParentProfile` — phone, address
- `AmbassadorProfile` — cohort, referral code

`StudentProfile` has a `mainCurrency` field. All invoices for that student are denominated in this currency. Services priced in other currencies are converted at invoice time using `CurrencyRate`.

### StudentProfile.status
```
ACTIVE      → default from creation; student is operational
PAUSED      → noShowCount hit 4 on any enrollment; all enrollments auto-cancelled; billing stopped
CANCELLED   → left permanently
COMPLETED   → finished programme naturally
```

Student is `ACTIVE` from the moment their profile is created. Trial and confirmation logic lives at the Enrollment level.

### User fields
`passwordHash` lives on `User` for auth. `bio` lives on `User` as a general profile field shared across roles.

---

## 3. Groups & Services

### Group
An organisational container (e.g. a class cohort or batch). Groups host services and run academic sessions.

### Service
A specific subject or offering within a group, taught by a teacher. One teacher per service.

Every service has:
- `clientRate` — what the student pays (per hour or flat)
- `staffRate` — what the teacher earns (per hour or flat); `null` for ONE_OFF services
- `serviceType` — see below
- `currency` — native currency; converted to student's `mainCurrency` at invoice time

### Service Types

| serviceType | Hours | Billing | Rate applies to |
|---|---|---|---|
| `HOURLY_FIXED` | Fixed schedule, known in advance | Advance (start of month) | clientRate × expected hours |
| `HOURLY_FLEXIBLE` | No fixed schedule, erratic | End of month (1st of next) | clientRate × actual logged hours |
| `MONTHLY` | Fixed hours, fixed fee | Advance | Flat monthly fee; hours informational |
| `ONE_OFF` | No hours | Immediate on enrollment going ACTIVE | Flat rate, once |

---

## 4. EnrollmentGroup

Each student has at most **one EnrollmentGroup per serviceType**. Maximum 4 groups per student.

```
Student X:
  EnrollmentGroup A → serviceType: HOURLY_FIXED
  EnrollmentGroup B → serviceType: HOURLY_FLEXIBLE
  EnrollmentGroup C → serviceType: MONTHLY
  EnrollmentGroup D → serviceType: ONE_OFF
```

- Invoices generated per EnrollmentGroup
- All services of the same type for a student appear on the same invoice
- Different types always on separate invoices
- Currency conversion to student's mainCurrency happens at invoice time

```
EnrollmentGroup {
  cuid id PK
  cuid studentId FK
  string serviceType    // "HOURLY_FIXED" | "HOURLY_FLEXIBLE" | "MONTHLY" | "ONE_OFF"
  bool isActive
}
```

---

## 5. Enrollment

One `Enrollment` per student per service. Multiple enrollments can exist for the same service over time (re-enrollment) — distinguished by date ranges, never delinked from their group.

### Enrollment.status — full lifecycle
```
TRIAL                → trial session scheduled, not yet completed
WAITING_CONFIRMATION → trial session completed, awaiting student/parent commitment
ACTIVE               → confirmed, billing starts from this point
CANCELLED            → terminated
ENDED                → natural completion
```

### trialRequired flag
Set by staff at enrollment creation time.
```
trialRequired = true
  → status starts at TRIAL
  → trial AcademicSession created (isTrial: true, zero charge)
  → trial session completed → WAITING_CONFIRMATION
  → student/parent confirms → ACTIVE → billing starts

trialRequired = false
  → status starts at ACTIVE immediately
  → billing starts immediately
```

Student can have multiple simultaneous trial enrollments across different services. Each independent.

### Cancellation mid-month
- Session-based, not day-based
- Sessions completed before cancellation date are billed
- If advance payment was made → CORRECTION line on next invoice as deduction

### Re-enrollment
- New Enrollment ID, new startDate, same EnrollmentGroup
- History preserved entirely by date ranges — no snapshot table needed
- Only value snapshotted at invoice time is `rateSnapshot` on InvoiceLineItem

```
Enrollment {
  cuid id PK
  cuid enrollmentGroupId FK
  cuid studentId FK
  cuid serviceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "CANCELLED" | "ENDED"
  bool trialRequired
  datetime startDate
  datetime endDate            // nullable
  float expectedHoursPerMonth
  bool isActive
}
```

---

## 6. Academic Sessions

One `AcademicSession` per class/session event. One teacher per service. Many students attend via Attendance records.

### Two session modes

**Scheduled (HOURLY_FIXED, MONTHLY)**
- Session exists in advance with date, time, duration
- Teacher responds to each with a confirmation log
- Teacher options: confirm / amend datetime (reschedule) / amend duration / mark teacher absent / mark student no-show / mark student cancelled

**Manual / Freeform (HOURLY_FLEXIBLE)**
- No pre-existing schedule
- Teacher manually adds: date, time, duration after session happens

### Trial sessions
- `isTrial = true`
- Zero charge — shows on invoice with lineTotal = 0
- rateSnapshot still recorded for reference
- Attendance tracked normally

### Student portal
- Scheduled sessions: student sees upcoming sessions and marks attendance
- Freeform sessions: student sees teacher-logged sessions and marks attendance

```
AcademicSession {
  cuid id PK
  cuid groupId FK
  cuid teacherId FK
  cuid serviceId FK
  string topic
  datetime startTime
  datetime endTime
  datetime originalStartTime    // nullable; populated if rescheduled
  datetime originalEndTime      // nullable
  float durationHours
  bool isTrial
  string status                 // "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED"
  string sessionMode            // "SCHEDULED" | "MANUAL"
  string zoomLink               // meeting link for the session
  string wbLink                 // whiteboard link
  string wbName
  string timesheetSubmissionStatus
}
```

---

## 7. Attendance

One `Attendance` record per student per session. Linked to the service (not just the session) so attendance is queryable by service directly.

### Attendance states

| Status | Billed? | Notes |
|---|---|---|
| `PRESENT` | Yes | Normal billing |
| `CANCELLED` | No | Student cancelled; if advance-paid → correction on next invoice |
| `RESCHEDULED` | Yes | Session happened at different time; zero-fee correction line on invoice for log |
| `ABSENT_NOTIFIED` | No | Student gave notice; treated same as cancelled |
| `ABSENT_NO_SHOW` | Yes (occurrences 1–3) | No update from student |

### No-show escalation
```
noShowCount = 1 → Ticket auto-created (NO_SHOW_WARNING, PR dept, priority: low); student billed
noShowCount = 2 → Ticket auto-created (priority: medium); student billed
noShowCount = 3 → Ticket auto-created (priority: high); student billed; last staff intervention window
noShowCount = 4 → StudentProfile.status → PAUSED
                  ALL enrollments → CANCELLED (auto)
                  Billing stops
                  Staff must manually reactivate enrollments + StudentProfile
```

- noShowCount resets when student interacts again (marks any attendance state)
- Staff can cancel specific enrollment + reset count at any point during 1–3

### Change requests
- Cancel, reschedule, absent_notified all submitted as change requests
- Staff approves or rejects
- If rejected → student charged; ticket updated: "change request rejected — charged"

### Reschedule flow
```
Initiator (student or teacher) suggests alternate time → ticket created → routed to staff
Staff directs to other party → other party confirms or rejects
Confirmed → rescheduled, attendance updated
Rejected  → original session stands, student charged
```

```
Attendance {
  cuid id PK
  cuid sessionId FK
  cuid serviceId FK             // direct service link for queryability
  cuid studentId FK
  cuid enrollmentId FK
  string status                 // "PRESENT" | "CANCELLED" | "RESCHEDULED" |
                                //  "ABSENT_NO_SHOW" | "ABSENT_NOTIFIED"
  float durationHours
  int noShowCount
  bool changeRequestPending
  string changeRequestStatus    // "PENDING" | "APPROVED" | "REJECTED"
  string notes                  // teacher/student comments on the session
  datetime markedAt             // when attendance was marked
}
```

---

## 8. Invoicing

### Invoice generation rules by serviceType

| serviceType | When generated | Based on |
|---|---|---|
| `HOURLY_FIXED` | At enrollment (first month) then 1st of each month | Expected hours from session schedule |
| `HOURLY_FLEXIBLE` | 1st of each month for previous month | Actual teacher-logged hours |
| `MONTHLY` | At enrollment (first month) then 1st of each month | Fixed monthly fee |
| `ONE_OFF` | Immediately on enrollment going ACTIVE | Flat rate |

- Billing only starts when Enrollment.status = `ACTIVE`
- No invoices during TRIAL, WAITING_CONFIRMATION, or while StudentProfile.status = PAUSED
- HOURLY_FIXED: actual vs expected difference → CORRECTION line on next invoice
- HOURLY_FLEXIBLE: auto-generated from teacher records; student raises ticket if disputed
- Trial sessions appear on invoice with lineTotal = 0

### Invoice filtering logic
```
Invoice for Student X, EnrollmentGroup G, Month = August 2024
→ find all Enrollments in group G where:
    status = ACTIVE AND startDate <= Aug 31
    AND (endDate IS NULL OR endDate >= Aug 01)
→ for each enrollment, find AcademicSessions in August for that service
→ for each session, find Attendance for this student
→ build one InvoiceLineItem per session
```

### Invoice status
```
PENDING    → generated, payment due, visible to student
PAID       → confirmed via Stripe
UNPAID     → past due, not paid
REFUNDED   → manual bank transfer; staff marks this
VOID       → cancelled, no payment expected
```

### Payment & refunds
- Students pay via Stripe (incoming only)
- `stripePaymentIntentId` stored on invoice
- `reminderStage` tracks how many payment reminders have been sent (0–N)
- Refunds are manual bank transfers — staff marks REFUNDED; no Stripe refund API
- Teacher no-show correction: deduction on next invoice OR manual bank refund; staff decides per case

### Currency conversion
- Each service has its own currency
- Student has `mainCurrency` on StudentProfile
- Each line item converted to student's mainCurrency at invoice time using `CurrencyRate`
- Line item stores: `originalAmount`, `originalCurrency`, `conversionRateUsed`, `convertedAmount`

```
StudentInvoice {
  cuid id PK
  cuid studentId FK
  cuid enrollmentGroupId FK
  cuid invoiceMonthId FK        // nullable for ONE_OFF
  string month                  // "Aug_2024"
  string invoiceMode            // "AUTO_MONTHLY" | "ONE_OFF"
  float subtotal
  float discountApplied
  float netAmount
  float dueAmount
  string currency               // always student's mainCurrency
  string status                 // "PENDING" | "PAID" | "UNPAID" | "REFUNDED" | "VOID"
  int reminderStage             // 0 = no reminders sent; increments each reminder
  string stripePaymentIntentId
  string stripeStatus
  bool isActive
  string notes
}
```

---

## 9. Invoice Line Items

### lineType values

| lineType | When used |
|---|---|
| `SESSION` | One session (including trial sessions at zero charge) |
| `ADHOC` | Manual one-off charge not tied to an enrollment |
| `CORRECTION` | Adjustment referencing a previous invoice line |

```
InvoiceLineItem {
  cuid id PK
  cuid invoiceId FK
  string lineType               // "SESSION" | "ADHOC" | "CORRECTION"

  // SESSION fields
  cuid enrollmentId FK
  cuid academicSessionId FK
  datetime sessionDate
  datetime sessionStart
  datetime sessionEnd
  datetime originalSessionStart // nullable; rescheduled log only
  datetime originalSessionEnd
  string attendanceStatusSnapshot
  bool isTrialSession           // true = zero charge
  float sessionHours
  float rateSnapshot
  string groupCodeSnapshot
  string teacherNameSnapshot
  string serviceNameSnapshot

  // CORRECTION fields
  cuid originalInvoiceId FK
  cuid originalLineItemId FK
  string correctionReason       // "TEACHER_NO_SHOW" | "HOUR_SURPLUS" | "HOUR_DEFICIT" |
                                //  "RESCHEDULE_LOG" | "STUDENT_CANCEL_DEDUCTION"
  datetime originalSessionDate
  float correctionAmount        // negative = deduction, positive = addition

  // ADHOC fields
  string description

  // All lines
  float originalAmount
  string originalCurrency
  float conversionRateUsed
  float convertedAmount         // in student's mainCurrency
}
```

---

## 10. Teacher Payroll (Mirror of Student Billing)

Every service has `staffRate`. Teacher earnings = `staffRate × hoursLogged`, independent of client invoices.

### Claim — one per teacher per month
Auto-generated from session logs on 1st of each month. Teacher reviews and submits. Staff approves and processes payment.

```
Claim {
  cuid id PK
  cuid userId FK                // teacher
  string month                  // "Aug_2024"
  string dept
  int sessions                  // total session count that month
  float hours                   // total hours logged that month
  float amount                  // auto-calculated: sum of ClaimLineItem totals
  string currency
  string status                 // "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED"
  string notes
  bool isActive
}
```

### ClaimLineItem — one per service per claim
```
ClaimLineItem {
  cuid id PK
  cuid claimId FK
  cuid serviceId FK
  cuid academicSessionId FK     // each session logged individually
  datetime sessionDate
  datetime sessionStart
  datetime sessionEnd
  float sessionHours
  float staffRateSnapshot       // staffRate at time of session
  float lineTotal               // staffRateSnapshot × sessionHours
  string currency
  string serviceNameSnapshot
  string groupCodeSnapshot
}
```

---

## 11. Announcements

Broadcasts shown in the notification bar and sent by email.

### Targeting
```
Targets (one announcement can have multiple):
  ALL_STUDENTS
  ALL_PARENTS
  ALL_TEACHERS
  ALL_AMBASSADORS
  ALL_STAFF
  DEPT_STAFF (specific department)
  INDIVIDUAL (specific userId)
```

```
Announcement {
  cuid id PK
  string title
  string body
  string[] targets              // array of target types
  string targetDept             // nullable; used when targets includes DEPT_STAFF
  cuid targetUserId FK          // nullable; used when targets includes INDIVIDUAL
  string priority               // "LOW" | "MEDIUM" | "HIGH"
  bool emailSent
  datetime createdAt
  datetime expiresAt            // nullable
  bool isActive
}
```

---

## 12. Content Bank

Items can belong to multiple groups. Groups can be department-level (e.g. "Finance Templates") or purpose-level (e.g. "Cold Call Scripts", "Canva Assets").

```
ContentGroup {
  cuid id PK
  string name
  string dept                   // nullable; if dept-specific
  bool isActive
}

ContentGroupItem {              // many-to-many join
  cuid id PK
  cuid contentGroupId FK
  cuid contentBankItemId FK
}

ContentBankItem {
  cuid id PK
  string dept                   // nullable; item can exist without a group
  string name
  string url
  cuid addedByUserId FK
  bool isActive
}
```

---

## 13. Recordings

Class recordings linked to a service and optionally a session.

```
Recording {
  cuid id PK
  cuid serviceId FK             // nullable; general recording if not service-specific
  cuid sessionId FK             // nullable; links to the specific session
  string title
  string subject
  string videoUrl
  datetime date
  float durationHours
  string category
  bool isActive
}
```

---

## 14. Logging & Analytics

### Strategy: Option C — dual approach
- **PostHog** for product analytics (behaviour, funnels, heatmaps, session replays, device/page tracking)
- **SiteLog** (own DB table) for security audit trail: logins, DB mutations, auth events

### SiteLog
```
SiteLog {
  cuid id PK
  cuid userId FK                // nullable; pre-auth events have no userId
  string action                 // "LOGIN" | "LOGOUT" | "DB_CREATE" | "DB_UPDATE" |
                                //  "DB_DELETE" | "PAGE_VIEW" | "AUTH_FAIL"
  string entityType             // nullable; "Invoice" | "Enrollment" | "User" etc
  string entityId               // nullable; which record was affected
  string ipAddress
  string userAgent
  string device                 // parsed from userAgent: "mobile" | "desktop" | "tablet"
  string country                // resolved from IP
  json metaBefore               // nullable; DB state before mutation
  json metaAfter                // nullable; DB state after mutation
  datetime createdAt
}
```

PostHog handles: page time, click events, funnels, session replay, device/OS/browser breakdown.
SiteLog handles: who changed what in the DB, auth events, IP-level audit trail.

---

## 15. Support Tickets

### Auto-created tickets
```
noShowCount = 1 → Ticket (NO_SHOW_WARNING, PR dept, priority: LOW)
noShowCount = 2 → Ticket (NO_SHOW_WARNING, PR dept, priority: MEDIUM)
noShowCount = 3 → Ticket (NO_SHOW_WARNING, PR dept, priority: HIGH)
meta: { studentId, enrollmentId, serviceId, noShowCount }
```

```
Ticket {
  cuid id PK
  string displayId UK
  string title
  string description            // body of the ticket
  string status
  string priority               // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  cuid creatorId FK
  cuid assigneeId FK
  string department
  string originalDept           // dept before any rerouting
  string ticketType             // "NO_SHOW_WARNING" | "BILLING_DISPUTE" |
                                //  "CHANGE_REQUEST" | "GENERAL"
  string attachmentLink         // nullable
  bool isConfidential
  bool isActive
  string routingStack
  string meta                   // JSON: { studentId, enrollmentId, noShowCount, ... }
}

TicketPermission {
  cuid id PK
  string department UK
  bool canTargetStudent
  bool canTargetParent
  bool canTargetTeacher
  bool canTargetAmbassador
  bool canTargetCandidate
  bool canTargetPR
  bool canTargetIT
  bool canTargetHR
  bool canTargetFinance
  bool canTargetMarketing
  bool canTargetManagement
  bool isInternalOnly
}
```

---

## 16. Full Entity List (Final)

### User
```
User {
  cuid id PK
  string email UK
  string passwordHash
  string photo
  string bio
  bool isActive
  string referralCode
  string whatsappNumber
  string country
}
```

### StudentProfile
```
StudentProfile {
  cuid id PK
  cuid userId FK
  string status               // "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED"
  string mainCurrency
  string timeZone
  string notes
  string referredBy
  string timesheetURL
  string scheduleURL
  string progressTrackerURL
  bool gcrAssigned
  bool groupAssigned
  bool scheduleAssigned
  bool financeApprovedFlag
}
```

### TeacherProfile
```
TeacherProfile {
  cuid id PK
  cuid userId FK
  string teachingProfileUrl
  bool idDocProvided
  bool salaryAccountProvided
}
```

### StaffProfile
```
StaffProfile {
  cuid id PK
  cuid userId FK
  string roleTitle
  string salaryType
  float salaryRate
  string role
  string dept
  bool isSupervisor
}
```

### ParentProfile
```
ParentProfile {
  cuid id PK
  cuid userId FK
  string phone
  string address
}
```

### AmbassadorProfile
```
AmbassadorProfile {
  cuid id PK
  cuid userId FK
  string cohort
  string referralCode UK
}
```

### Group
```
Group {
  cuid id PK
  string code UK
  string groupCategory
  string status
  bool isActive
}
```

### Service
```
Service {
  cuid id PK
  cuid groupId FK
  cuid teacherId FK
  string board
  string courseLevel
  string subjectCode
  string subjectName
  string serviceType          // "HOURLY_FIXED" | "HOURLY_FLEXIBLE" | "MONTHLY" | "ONE_OFF"
  string currency
  float clientRate
  float staffRate             // null for ONE_OFF
  bool isHourly
  string teacherIdSnapshot
  bool isActive
}
```

### EnrollmentGroup
```
EnrollmentGroup {
  cuid id PK
  cuid studentId FK
  string serviceType
  bool isActive
}
```

### Enrollment
```
Enrollment {
  cuid id PK
  cuid enrollmentGroupId FK
  cuid studentId FK
  cuid serviceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "CANCELLED" | "ENDED"
  bool trialRequired
  datetime startDate
  datetime endDate
  float expectedHoursPerMonth
  bool isActive
}
```

### Discount
```
Discount {
  cuid id PK
  cuid studentId FK
  cuid enrollmentId FK
  string discountType
  float value
  bool isPct
  string code
  bool isActive
}
```

### AcademicSession
```
AcademicSession {
  cuid id PK
  cuid groupId FK
  cuid teacherId FK
  cuid serviceId FK
  string topic
  datetime startTime
  datetime endTime
  datetime originalStartTime
  datetime originalEndTime
  float durationHours
  bool isTrial
  string status               // "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED"
  string sessionMode          // "SCHEDULED" | "MANUAL"
  string zoomLink
  string wbLink
  string wbName
  string timesheetSubmissionStatus
}
```

### Attendance
```
Attendance {
  cuid id PK
  cuid sessionId FK
  cuid serviceId FK
  cuid studentId FK
  cuid enrollmentId FK
  string status               // "PRESENT" | "CANCELLED" | "RESCHEDULED" |
                              //  "ABSENT_NO_SHOW" | "ABSENT_NOTIFIED"
  float durationHours
  int noShowCount
  bool changeRequestPending
  string changeRequestStatus  // "PENDING" | "APPROVED" | "REJECTED"
  string notes
  datetime markedAt
}
```

### InvoiceMonth
```
InvoiceMonth {
  cuid id PK
  string month UK
}
```

### StudentInvoice
```
StudentInvoice {
  cuid id PK
  cuid studentId FK
  cuid enrollmentGroupId FK
  cuid invoiceMonthId FK
  string month
  string invoiceMode          // "AUTO_MONTHLY" | "ONE_OFF"
  float subtotal
  float discountApplied
  float netAmount
  float dueAmount
  string currency
  string status               // "PENDING" | "PAID" | "UNPAID" | "REFUNDED" | "VOID"
  int reminderStage
  string stripePaymentIntentId
  string stripeStatus
  bool isActive
  string notes
}
```

### InvoiceLineItem
```
InvoiceLineItem {
  cuid id PK
  cuid invoiceId FK
  string lineType             // "SESSION" | "ADHOC" | "CORRECTION"
  cuid enrollmentId FK
  cuid academicSessionId FK
  datetime sessionDate
  datetime sessionStart
  datetime sessionEnd
  datetime originalSessionStart
  datetime originalSessionEnd
  string attendanceStatusSnapshot
  bool isTrialSession
  float sessionHours
  float rateSnapshot
  string groupCodeSnapshot
  string teacherNameSnapshot
  string serviceNameSnapshot
  cuid originalInvoiceId FK
  cuid originalLineItemId FK
  string correctionReason
  datetime originalSessionDate
  float correctionAmount
  string description
  float originalAmount
  string originalCurrency
  float conversionRateUsed
  float convertedAmount
}
```

### Claim
```
Claim {
  cuid id PK
  cuid userId FK
  string month
  string dept
  int sessions
  float hours
  float amount
  string currency
  string status               // "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED"
  string notes
  bool isActive
}
```

### ClaimLineItem
```
ClaimLineItem {
  cuid id PK
  cuid claimId FK
  cuid serviceId FK
  cuid academicSessionId FK
  datetime sessionDate
  datetime sessionStart
  datetime sessionEnd
  float sessionHours
  float staffRateSnapshot
  float lineTotal
  string currency
  string serviceNameSnapshot
  string groupCodeSnapshot
}
```

### BankAccount
```
BankAccount {
  cuid id PK
  cuid ownerId FK
  bool isDcAccount
  string label
  string purpose
  string currency
  float currentBalance
  bool isActive
}
```

### AccountTransaction
```
AccountTransaction {
  cuid id PK
  cuid bankAccountId FK
  string description
  string transactionType
  float amount
}
```

### LedgerEntry
```
LedgerEntry {
  cuid id PK
  cuid transactionId FK
  cuid bankAccountId FK
  float amount
  string direction
  string purpose
  cuid studentInvoiceId FK
  cuid claimId FK
}
```

### DeptBudget
```
DeptBudget {
  cuid id PK
  string dept
  string quarter
  float totalAllocated
  string status
  cuid bankAccountId FK
  datetime quarterStart
  datetime quarterEnd
  bool isActive
}
```

### BudgetSubCategory
```
BudgetSubCategory {
  cuid id PK
  cuid budgetId FK
  string subCategoryType
  float allocated
  float utilised
  float remaining
}
```

### BudgetUtilisation
```
BudgetUtilisation {
  cuid id PK
  cuid subCategoryId FK
  cuid ledgerEntryId FK
  string referenceType
  float amount
}
```

### Ticket
```
Ticket {
  cuid id PK
  string displayId UK
  string title
  string description
  string status
  string priority
  cuid creatorId FK
  cuid assigneeId FK
  string department
  string originalDept
  string ticketType
  string attachmentLink
  bool isConfidential
  bool isActive
  string routingStack
  string meta
}
```

### TicketMessage
```
TicketMessage {
  cuid id PK
  cuid ticketId FK
  cuid senderId FK
  string body
  bool isInternal
  string attachmentLink
}
```

### TicketHistory
```
TicketHistory {
  cuid id PK
  cuid ticketId FK
  cuid actorId FK
  string action
  string meta
}
```

### TicketPermission
```
TicketPermission {
  cuid id PK
  string department UK
  bool canTargetStudent
  bool canTargetParent
  bool canTargetTeacher
  bool canTargetAmbassador
  bool canTargetCandidate
  bool canTargetPR
  bool canTargetIT
  bool canTargetHR
  bool canTargetFinance
  bool canTargetMarketing
  bool canTargetManagement
  bool isInternalOnly
}
```

### Announcement
```
Announcement {
  cuid id PK
  string title
  string body
  string[] targets            // "ALL_STUDENTS" | "ALL_PARENTS" | "ALL_TEACHERS" |
                              //  "ALL_AMBASSADORS" | "ALL_STAFF" | "DEPT_STAFF" | "INDIVIDUAL"
  string targetDept           // nullable; when targets includes DEPT_STAFF
  cuid targetUserId FK        // nullable; when targets includes INDIVIDUAL
  string priority             // "LOW" | "MEDIUM" | "HIGH"
  bool emailSent
  datetime createdAt
  datetime expiresAt
  bool isActive
}
```

### ContentGroup
```
ContentGroup {
  cuid id PK
  string name
  string dept                 // nullable
  bool isActive
}
```

### ContentGroupItem
```
ContentGroupItem {
  cuid id PK
  cuid contentGroupId FK
  cuid contentBankItemId FK
}
```

### ContentBankItem
```
ContentBankItem {
  cuid id PK
  string dept                 // nullable
  string name
  string url
  cuid addedByUserId FK
  bool isActive
}
```

### Recording
```
Recording {
  cuid id PK
  cuid serviceId FK           // nullable
  cuid sessionId FK           // nullable
  string title
  string subject
  string videoUrl
  datetime date
  float durationHours
  string category
  bool isActive
}
```

### SiteLog
```
SiteLog {
  cuid id PK
  cuid userId FK              // nullable; pre-auth events
  string action               // "LOGIN" | "LOGOUT" | "DB_CREATE" | "DB_UPDATE" |
                              //  "DB_DELETE" | "PAGE_VIEW" | "AUTH_FAIL"
  string entityType           // nullable; "Invoice" | "Enrollment" | "User" etc
  string entityId             // nullable
  string ipAddress
  string userAgent
  string device               // "mobile" | "desktop" | "tablet"
  string country              // resolved from IP
  json metaBefore             // nullable; DB state before mutation
  json metaAfter              // nullable; DB state after mutation
  datetime createdAt
}
```

### SyllabusItem
```
SyllabusItem {
  cuid id PK
  cuid serviceId FK
  string chapterNum
  string title
  string milestone
  int order
  bool isActive
}
```

### StudentProgress
```
StudentProgress {
  cuid id PK
  cuid studentId FK
  cuid syllabusItemId FK
  bool completed
  int masteryPct
}
```

### Doubt
```
Doubt {
  cuid id PK
  cuid studentId FK
  cuid syllabusItemId FK
  string body
  string response
  string status
}
```

### MockResult
```
MockResult {
  cuid id PK
  cuid studentId FK
  cuid serviceId FK
  float score
  float maxScore
  string topic
  datetime takenAt
}
```

### Assignment
```
Assignment {
  cuid id PK
  cuid studentId FK
  cuid serviceId FK
  string title
  string description
  datetime dueDate
  string status
  string grade
  string submission
}
```

### Meeting
```
Meeting {
  cuid id PK
  string title
  datetime dateTime
  string agenda
  string status
  string link
  string dept
  bool isActive
}
```

### MeetingParticipant
```
MeetingParticipant {
  cuid id PK
  cuid meetingId FK
  cuid userId FK
  string rsvp
}
```

### Referral
```
Referral {
  cuid id PK
  cuid referrerId FK
  cuid referredStudentId FK
  string code
  string status
  bool isActive
}
```

### AmbassadorDeliverable
```
AmbassadorDeliverable {
  cuid id PK
  cuid ambassadorId FK
  string title
  float score
  string status
}
```

### AmbassadorEarning
```
AmbassadorEarning {
  cuid id PK
  cuid ambassadorId FK
  string earningType
  float amount
  string currency
  string payoutStatus
}
```

### CurrencyRate
```
CurrencyRate {
  cuid id PK
  string fromCurrency
  string toCurrency
  float rate
  float reverseRate
}
```

### MarketingPost
```
MarketingPost {
  cuid id PK
  string contentType
  string status
  string canvaLink
  string driveLink
  string caption
  datetime scheduledDate
  string campaignTag
  bool isActive
}
```

### Lead
```
Lead {
  cuid id PK
  string name
  string email
  string phone
  string source
  string status
  string notes
  bool passedToPR
  bool isActive
}
```

### Candidate
```
Candidate {
  cuid id PK
  string email UK
  string name
  string role
  string status
  string cvLink
  string docsLink
  string notes
  string outreach
  bool isActive
}
```

### TextFormat
```
TextFormat {
  cuid id PK
  string name UK
  string text
  string alternateText1
  string alternateText2
  date dateAdded
  string use
}
```

### BacklogItem
```
BacklogItem {
  cuid id PK
  int serialNo
  string addedToCalendar
  string addedToCalendar2
  string event
  string desc
}
```

### SprintItem
```
SprintItem {
  cuid id PK
  int serialNo
  string addedToCalendar
  string addedToCalendar2
  string event
  string desc
}
```

### AccessLog (retained for credential tracking)
```
AccessLog {
  cuid id PK
  cuid staffId FK
  string toolName
  string credential
  datetime dateGranted
  bool revoked
  string notes
}
```

---

## 17. Key Business Rules Summary

1. One EnrollmentGroup per student per serviceType (max 4 groups)
2. One Enrollment per student per service; multiple allowed over time via date ranges
3. Enrollments never delinked from their group; history preserved by date ranges
4. Invoices generated per EnrollmentGroup; mixed service types never on same invoice
5. StudentProfile.status is ACTIVE from creation; PAUSED only when noShowCount hits 4
6. Trial logic lives at Enrollment level; trialRequired flag set by staff at creation
7. Trial sessions are real AcademicSessions (isTrial: true); zero charge; appear on invoice
8. Billing only starts when Enrollment.status = ACTIVE
9. No invoices during TRIAL, WAITING_CONFIRMATION, or while StudentProfile is PAUSED
10. HOURLY_FIXED: advance billing from expected hours; corrections on next invoice for actuals
11. HOURLY_FLEXIBLE: end-of-month billing from actual teacher logs; auto-generated on 1st
12. noShowCount 1,2,3: auto-ticket to PR dept; student still billed; staff can intervene per enrollment
13. noShowCount 4: StudentProfile → PAUSED; all enrollments auto-cancelled; billing stops
14. noShowCount resets on next student interaction
15. Staff must manually reactivate enrollments and StudentProfile after PAUSED
16. Cancellation mid-month is session-based not day-based
17. Reschedule: initiator suggests time, other party confirms, staff routes; rejection = charged
18. Rescheduled sessions billed normally; zero-fee CORRECTION line for accurate session log
19. Teacher no-show → CORRECTION line on next invoice; deduction or manual bank refund
20. Refunds are manual bank transfers; staff marks REFUNDED; no Stripe refund API
21. Currency conversion at invoice time; line items store original and converted amounts
22. Teacher Claim auto-generated from session logs on 1st; one claim per teacher per month
23. ClaimLineItems break down by service and session; staffRateSnapshot recorded at session time
24. Invoice shows session-level breakdown: exact date, time, duration, attendance status
25. Attendance linked to both sessionId and serviceId for direct service-level queries
26. Announcements target by role, dept, or individual; delivered via notification bar and email
27. ContentBankItems can belong to multiple ContentGroups via ContentGroupItem join table
28. SiteLog captures auth events and DB mutations with before/after state
29. PostHog handles product analytics: behaviour, funnels, heatmaps, session replay
30. AccessLog retained separately for staff credential and tool access tracking
