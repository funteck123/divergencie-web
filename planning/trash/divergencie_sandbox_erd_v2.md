# DivergenCIE Coaching — Sandbox ERD v2.0
**Ground Truth:** DC Database 2026.xlsx + UJM-v3.0  
**Built:** From scratch. No inheritance from prior sandbox ERD.  
**Status:** Complete. All Q1–Q17 decisions locked.

---

## Master Decision Log

| # | Topic | Decision |
|---|---|---|
| Q1 | Subject on User | NOT a column. Derived from active Enrollments via view. |
| Q2 | Service atomicity | Service = Board + SubjectCode + SubjectName + GroupId + Teacher + Currency + Rate |
| Q3 | Invoice cart model | Single InvoiceLineItem table, serviceType enum, nullable type-specific cols |
| Q4 | Student notes | Free-text blob + dedicated `referredBy` nullable column |
| Q5 | Teacher on rate card | FK to User + `instructorNameSnapshot` string for history |
| Q6a | Invoice line items | Single table with serviceType enum |
| Q6b | Invoice generation | Auto from active enrollments. Snapshot rates at generation time. |
| Q6c | Discounts | Discount table: per-student, optionally per-service. Type: scholarship/coupon/manual |
| Q7 | Group types | Single Group table with groupCategory enum (batch/individual/ondemand) |
| Q8 | Bank accounts | Normalized BankAccount table. Volunteer staff accounts = isDcAccount=true |
| Q9 | Ad-hoc services | Same Service table. null groupId = catalogue default / ad-hoc |
| Q10 | Enrollment unit | (student, service). Group derivable via service. |
| Q11 | Sessions | AcademicSession = group-level. Attendance = per-student join. One service per session. |
| Q12 | Budget spending | Claim approved → auto-debit claims_budget + LedgerEntry debit on Account |
| Q13 | Virtual accounts | Named purpose-pots. Volunteer staff bank accounts used by DC = isDcAccount=true. No subaccounts. |
| Q14 | Budget quarters | Calendar quarters. Always start zero. Manual fill. Previous quarters read-only. |
| Q15 | Budget tracking | Both tracked: BudgetUtilisation (remaining budget) + LedgerEntry (account balance) |
| Q16 | Budget sub-categories | Exactly 2 mandatory: claims_budget + operations_budget. Claims always hit claims. Rest hits operations. |
| Q17 | Revenue flow | All incoming (tuition/books/counselling) → Management Account via LedgerEntry. Outside dept budgets. |
| UJM | Missed class | Status = MISSED + auto-generated Ticket |
| UJM | Finance gate | financeApprovedFlag on User — flag only, no hard blocker |
| UJM | Deletions | No hard deletions. is_active flags only. |
| UJM | detectedCountry | On User, separate from billingAddress |
| UJM | Currency | No conversion. Services are currency-specific. |
| UJM | Teacher subjects | Teacher profiles have no subjects. Mapping at Service level. |
| UJM | XLSX parity | addedToCalendar + addedToCalendar2 kept exactly as named |
| UJM | Activity score | Calculated view. Inputs: tickets + sessions + timesheets + attendance + claims |
| UJM | Routing stack | String on Ticket (XLSX parity) |
| UJM | One-time enrollment | Ad-hoc purchases get a shadow enrollment record (status=one_time) |

---

## Mermaid ERD

```mermaid
erDiagram

    %% ==========================================
    %% CLUSTER 1 — USERS & PROFILES
    %% ==========================================

    User ||--o| StudentProfile : "has"
    User ||--o| TeacherProfile : "has"
    User ||--o| StaffProfile : "has"
    User ||--o| ParentProfile : "has"
    User ||--o| AmbassadorProfile : "has"
    User ||--o{ BankAccount : "owns"
    User ||--o{ User : "parent_of"

    User {
        string id PK "STU-001 TEA-001 etc"
        string email UK
        string name
        string role "student|teacher|parent|staff|ambassador|management"
        string dept "PR|HR|Finance|Marketing|IT|Management|null"
        boolean supervisor
        boolean financeApprovedFlag
        boolean is_active
        string passwordHash
        string referralCode UK
        string detectedCountry
        string billingAddress
        datetime createdAt
    }

    StudentProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        datetime dob
        string grade
        string board
        string targetUni
        string school
        string currency "preferred billing currency"
        string timeZone
        string timesheetUrl
        string gcrLink
        string scheduleLink
        string progressTrackerLink
        string whatsappNumber
        string parentWhatsappNumber
        string location "XLSX col: Location"
        string notes
        string referredBy
        datetime createdAt
    }

    TeacherProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        datetime dob
        string latestQualification
        string teachingProfileUrl
        datetime createdAt
    }

    StaffProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        datetime dob
        string roleTitle
        string salaryType "fixed|hourly"
        float salaryRate
        string latestQualification
        datetime createdAt
    }

    ParentProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        string phone
        string address
        datetime createdAt
    }

    AmbassadorProfile {
        string id PK
        string userId FK UK
        string firstName
        string lastName
        datetime dob
        string cohort "3mo|6mo"
        string referralLink
        string referralCode UK
        datetime createdAt
    }

    BankAccount {
        string id PK
        string ownerId FK "User.id — volunteer or staff"
        boolean isDcAccount "true = DC uses this account operationally"
        string label "Atiqa Akhtar Account | Expansion Account etc"
        string purpose "operations|savings|expansion|salary_pool|backup"
        string bankName
        string accountNumber
        string ifscCode
        string branchName
        string paytmId
        string currency
        float currentBalance
        boolean is_active
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 2 — SERVICE CATALOGUE & GROUPS
    %% ==========================================

    Group ||--o{ Service : "hosts"
    Service }o--|| User : "taught_by"

    Group {
        string id PK
        string code UK "B8 C14 T3 B18 etc"
        string groupCategory "batch|individual|ondemand"
        string status "active|inactive|completed"
        datetime createdAt
        boolean is_active
    }

    Service {
        string id PK
        string groupId FK "null = catalogue default or ad-hoc"
        string teacherId FK
        string board "Cambridge|Edexcel|IB|OCR|AQA|CollegeBoard|IDP|KSA|DC|Singapore|IMAT|null"
        string courseLevel "IGCSE|AS-Level|A-Level|GCSE|DP|SAT|IELTS|GAT|ACT|BTech|null"
        string subjectCode "0580 9701 J277 etc"
        string subjectName "Mathematics Chemistry Counselling etc"
        string fullSubjectName "Cambridge A-Level Chemistry - B8 - GBP"
        string serviceType "batch_tuition|individual_tuition|ondemand_tuition|book|counselling|adhoc"
        string currency
        float standardRate
        boolean isHourly
        string instructorNameSnapshot "teacher name at creation time"
        boolean is_active
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 3 — ENROLLMENT (THE CART)
    %% ==========================================

    User ||--o{ Enrollment : "enrolled_in"
    Service ||--o{ Enrollment : "has"
    Enrollment ||--o{ Discount : "has"

    Enrollment {
        string id PK
        string studentId FK
        string serviceId FK
        string status "active|paused|cancelled|completed|trial|one_time"
        datetime startDate
        datetime endDate
        datetime createdAt
        boolean is_active
    }

    Discount {
        string id PK
        string studentId FK
        string serviceId FK "null = invoice-level discount"
        string discountType "scholarship|coupon|manual"
        float value "amount or percentage"
        boolean isPct
        string code "coupon code if applicable"
        datetime validFrom
        datetime validTo
        boolean is_active
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 4 — ACADEMIC SESSIONS & ATTENDANCE
    %% ==========================================

    Group ||--o{ AcademicSession : "runs"
    User ||--o{ AcademicSession : "teaches"
    Service ||--o{ AcademicSession : "covers"
    AcademicSession ||--o{ Attendance : "records"
    User ||--o{ Attendance : "attends"

    AcademicSession {
        string id PK
        string groupId FK
        string teacherId FK
        string serviceId FK "one service per session"
        string topic
        datetime startTime
        datetime endTime
        int durationMinutes
        string zoomLink
        string wbLink
        string wbName
        string recordingLink
        string status "scheduled|completed|missed|cancelled|rescheduled"
        string timesheetSubmissionStatus "pending|submitted|overdue"
        datetime timesheetSubmittedAt
        datetime createdAt
        boolean is_active
    }

    Attendance {
        string id PK
        string sessionId FK
        string studentId FK
        string status "present|absent|late|missed"
        int durationMinutes
        string notes
        datetime markedAt
    }

    %% ==========================================
    %% CLUSTER 5 — BILLING & INVOICING
    %% ==========================================

    User ||--o{ StudentInvoice : "billed"
    StudentInvoice ||--o{ InvoiceLineItem : "contains"
    Enrollment ||--o{ InvoiceLineItem : "sourced_from"
    InvoiceMonth ||--o{ StudentInvoice : "period"

    InvoiceMonth {
        string id PK
        int serialNo "XLSX: S. No."
        string month UK "XLSX: Month e.g. Aug_of_2022"
    }

    StudentInvoice {
        string id PK
        string studentId FK
        string invoiceMonthId FK
        string month "YYYY-MM snapshot"
        datetime billingStart
        datetime billingEnd
        float totalAmount
        float discountApplied
        float netAmount
        float dueAmount
        string currency
        boolean paymentDone
        datetime paymentDate
        string paymentMethod
        string referenceNo
        int reminderStage "1-5 per UJM Finance journey"
        string invoicePdfUrl
        string paymentAcknowledgementMsg
        string paymentReminderMsg
        int serialNo
        string status "draft|issued|paid|overdue|deactivated"
        datetime issuedAt
        datetime createdAt
        boolean is_active
    }

    InvoiceLineItem {
        string id PK
        string invoiceId FK
        string enrollmentId FK "null for one-off — shadow enrollment created"
        string serviceType "batch_tuition|individual_tuition|ondemand_tuition|book|counselling|adhoc"
        string serviceNameSnapshot "Physics - CIE A-Level - B8"
        string teacherNameSnapshot "Mr Akhtar"
        string groupCodeSnapshot "B8"
        float rateSnapshot "rate at generation time"
        string currency
        boolean isHourly
        float hoursOrQty "hours if isHourly — quantity if book"
        float unitPrice "for books"
        float lineTotal
        string notes
    }

    %% ==========================================
    %% CLUSTER 6 — CLAIMS & COMPENSATION
    %% ==========================================

    User ||--o{ Claim : "submits"

    Claim {
        string id PK
        string userId FK
        string dept "claimant dept — determines which claims_budget is debited"
        string month
        int sessions
        float hours
        float rateApplied
        float amount
        string currency
        string status "pending|approved|rejected|paid"
        string notes
        string notes2
        datetime startDate
        datetime endDate
        datetime paymentDate
        datetime createdAt
        boolean is_active
    }

    %% ==========================================
    %% CLUSTER 7 — ACCOUNTS, BUDGETS & LEDGER
    %% ==========================================

    BankAccount ||--o{ AccountTransaction : "records"
    AccountTransaction ||--o{ LedgerEntry : "splits_into"
    BankAccount ||--o{ LedgerEntry : "affected_by"
    StudentInvoice ||--o{ LedgerEntry : "references"
    Claim ||--o{ LedgerEntry : "references"
    DeptBudget ||--o{ BudgetSubCategory : "has"
    BudgetSubCategory ||--o{ BudgetUtilisation : "consumed_by"
    BudgetUtilisation }o--|| LedgerEntry : "linked_to"
    BankAccount ||--o{ DeptBudget : "funds"

    AccountTransaction {
        string id PK
        string bankAccountId FK
        string description
        string transactionType "credit|debit"
        float amount
        string currency
        datetime createdAt
    }

    LedgerEntry {
        string id PK
        string transactionId FK
        string bankAccountId FK
        float amount
        string direction "debit|credit"
        string purpose "revenue|claim_payment|operations_payment|budget_allocation"
        string studentInvoiceId FK "null if not invoice-related"
        string claimId FK "null if not claim-related"
        datetime createdAt
    }

    DeptBudget {
        string id PK
        string dept "PR|HR|Finance|Marketing|IT|Management"
        string quarter "2026-Q1|2026-Q2 etc"
        float totalAllocated "lump sum set by Management"
        string status "draft|approved|active|closed"
        string bankAccountId FK "account this budget draws from"
        string approvedByUserId FK "Management user who approved"
        datetime approvedAt
        datetime quarterStart
        datetime quarterEnd
        datetime createdAt
        boolean is_active
    }

    BudgetSubCategory {
        string id PK
        string budgetId FK
        string subCategoryType "claims|operations"
        float allocated "portion of parent totalAllocated"
        float utilised "auto-updated on each BudgetUtilisation"
        float remaining "allocated - utilised"
        datetime createdAt
    }

    BudgetUtilisation {
        string id PK
        string subCategoryId FK
        string ledgerEntryId FK "the payment that triggered this"
        string referenceType "claim|invoice|ad_hoc"
        string referenceId "Claim.id or InvoiceLineItem.id"
        float amount
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 8 — TICKETING SYSTEM
    %% ==========================================

    User ||--o{ Ticket : "creates"
    User ||--o{ Ticket : "assigned_to"
    Ticket ||--o{ TicketMessage : "contains"
    User ||--o{ TicketMessage : "sends"
    Ticket ||--o{ TicketHistory : "records"
    User ||--o{ TicketHistory : "acts_in"

    Ticket {
        string id PK
        string displayId UK "TKT-0042"
        string title
        string description
        string status "open|in_progress|pending|resolved|closed|escalated"
        string priority "low|medium|high|urgent"
        string creatorId FK
        string assigneeId FK
        string department "PR|HR|Finance|Marketing|IT|Management"
        string originalDept
        string ticketType "support|reschedule|missed_class|hr_complaint|disciplinary|it_change|finance_query"
        string attachmentLink
        string category
        string routingStack "string — XLSX parity"
        boolean isConfidential "HR complaint or disciplinary"
        datetime createdAt
        datetime updatedAt
        boolean is_active
    }

    TicketMessage {
        string id PK
        string ticketId FK
        string senderId FK
        string body
        boolean isInternal
        string attachmentLink
        datetime createdAt
    }

    TicketHistory {
        string id PK
        string ticketId FK
        string actorId FK
        string action
        string meta
        datetime createdAt
    }

    TicketPermission {
        string id PK
        string department UK
        boolean canTargetStudent
        boolean canTargetParent
        boolean canTargetTeacher
        boolean canTargetAmbassador
        boolean canTargetCandidate
        boolean isInternalOnly
        boolean canTargetPR
        boolean canTargetIT
        boolean canTargetHR
        boolean canTargetFinance
        boolean canTargetMarketing
        boolean canTargetManagement
        datetime updatedAt
    }

    %% ==========================================
    %% CLUSTER 9 — ACADEMIC PROGRESS
    %% ==========================================

    Service ||--o{ SyllabusItem : "has"
    SyllabusItem ||--o{ StudentProgress : "tracked_by"
    SyllabusItem ||--o{ Doubt : "tagged_to"
    User ||--o{ StudentProgress : "records"
    User ||--o{ Doubt : "asks"
    User ||--o{ MockResult : "scores"
    User ||--o{ Assignment : "submits"
    Service ||--o{ MockResult : "for"
    Service ||--o{ Assignment : "for"

    SyllabusItem {
        string id PK
        string serviceId FK
        string chapterNum
        string title
        string milestone
        int order
        boolean is_active
    }

    StudentProgress {
        string id PK
        string studentId FK
        string syllabusItemId FK
        boolean completed
        int masteryPct
        datetime updatedAt
    }

    Doubt {
        string id PK
        string studentId FK
        string syllabusItemId FK
        string body
        string response
        string status "open|answered|closed"
        datetime createdAt
    }

    MockResult {
        string id PK
        string studentId FK
        string serviceId FK
        float score
        float maxScore
        string topic
        datetime takenAt
        datetime createdAt
    }

    Assignment {
        string id PK
        string studentId FK
        string serviceId FK
        string title
        string description
        datetime dueDate
        string status "pending|submitted|graded|missing"
        string grade
        string submissionLink
        datetime createdAt
        boolean is_active
    }

    %% ==========================================
    %% CLUSTER 10 — HR & CANDIDATES
    %% ==========================================

    Candidate {
        string id PK
        string email UK
        string name
        string role "teacher|TA|SM|HR|IT|Accounts|Marketing"
        string status "active|inactive|invited|interviewed|offered|rejected|onboarded"
        string cvLink
        string docsLink
        string notes
        string outreach "LinkedIn|Instagram|careers_page|referral"
        string skills
        string extraSkills
        string qualifications
        string expectedRate
        string timeZone
        string interviewTime
        datetime startDate
        string offerLetterStatus "pending|sent|accepted|declined"
        string gcrAccess
        string classSchedule
        string workFolder
        datetime interviewRequestedAt
        boolean is_active
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 11 — MEETINGS
    %% ==========================================

    Meeting ||--o{ MeetingParticipant : "has"
    User ||--o{ MeetingParticipant : "attends"

    Meeting {
        string id PK
        string title
        datetime dateTime
        string agenda
        string status "scheduled|confirmed|cancelled|rescheduled|completed"
        string link
        string dept
        string meetingType "dept_internal|townhall|interdept|management"
        datetime createdAt
        boolean is_active
    }

    MeetingParticipant {
        string id PK
        string meetingId FK
        string userId FK
        string rsvp "accepted|declined|pending|rescheduled"
    }

    %% ==========================================
    %% CLUSTER 12 — AMBASSADOR PROGRAMME
    %% ==========================================

    User ||--o{ Referral : "refers"
    AmbassadorProfile ||--o{ AmbassadorDeliverable : "submits"
    AmbassadorProfile ||--o{ AmbassadorEarning : "earns"
    Referral ||--o{ AmbassadorEarning : "generates"

    Referral {
        string id PK
        string referrerId FK "User.id"
        string referredStudentId FK "User.id null until enrolled"
        string code
        string status "pending|enrolled|expired"
        datetime createdAt
        boolean is_active
    }

    AmbassadorDeliverable {
        string id PK
        string ambassadorId FK "AmbassadorProfile.id"
        string title
        string submissionLink
        float score
        string feedback
        string status "pending|submitted|graded"
        datetime submittedAt
        datetime createdAt
    }

    AmbassadorEarning {
        string id PK
        string ambassadorId FK "AmbassadorProfile.id"
        string earningType "commission|allowance"
        float amount
        string currency
        string referralId FK "null for allowance"
        string payoutStatus "pending|approved|paid"
        datetime earnedAt
        datetime createdAt
    }

    %% ==========================================
    %% CLUSTER 13 — CONTENT & MARKETING
    %% ==========================================

    MarketingPost {
        string id PK
        string canvaLink
        string driveLink
        string caption
        datetime scheduledDate
        string contentType "carousel|reel|post|story|vlog|documentary|alumni_story|staff_story|literature"
        string status "scheduled|posted|missed"
        string campaignTag
        string performanceNotes
        datetime createdAt
        boolean is_active
    }

    Lead {
        string id PK
        string source "google_ads|reddit|instagram|whatsapp_channel|telegram|school_visit|referral"
        string name
        string contact
        datetime dateReceived
        boolean passedToPR
        datetime passedAt
        string prTicketId FK "Ticket.id created on handoff"
        boolean is_active
        datetime createdAt
    }

    ContentBankItem {
        string id PK
        string dept "PR|HR|Finance|Marketing|IT|Management"
        string name
        string url
        string description
        datetime dateAdded
        string addedByUserId FK
        boolean is_active
    }

    %% ==========================================
    %% CLUSTER 14 — STENCIL TABLES (XLSX PARITY)
    %% ==========================================

    CanvaDesign {
        string id PK
        string name
        datetime date
        string link
    }

    Booklet {
        string id PK
        string name
        datetime date
        string link
    }

    GcrClassroom {
        string id PK
        string name
        string link
        datetime date
        int serialNo
    }

    StudentStatus {
        string id PK
        string name UK
        string definition
    }

    BacklogItem {
        string id PK
        int serialNo
        string importance
        string addedToCalendar
        datetime dateAdded
        string addedToCalendar2
        datetime date
        string additionalTask
        string event
        string desc
        string startTime
        string endTime
        float durationHours
        string location
        string tag
        string nextSteps
    }

    SprintItem {
        string id PK
        int serialNo
        string importance
        string addedToCalendar
        datetime dateAdded
        string addedToCalendar2
        datetime date
        string additionalTask
        string event
        string desc
        string startTime
        string endTime
        float durationHours
        string location
        string tag
        string nextSteps
    }

    CurrencyRate {
        string id PK
        string fromCurrency
        string toCurrency "INR as reference"
        float rate
        float reverseRate
        datetime effectiveDate
    }

    TextFormat {
        string id PK
        string name UK
        string text
        string alternateText1
        string use
        datetime date
    }
```

---

## Calculated Views (Not Stored)

```sql
-- 1. Subject list per student (replaces non-atomic subject column)
CREATE VIEW v_student_subjects AS
SELECT
    e.studentId,
    GROUP_CONCAT(s.subjectName, ', ') AS subjectsList
FROM Enrollment e
JOIN Service s ON e.serviceId = s.id
WHERE e.status = 'active'
GROUP BY e.studentId;

-- 2. Staff activity score (all inputs, calculated not cached)
CREATE VIEW v_staff_activity_score AS
SELECT
    u.id AS staffId,
    u.name,
    COUNT(DISTINCT CASE WHEN t.status = 'resolved' THEN t.id END) AS ticketsResolved,
    COUNT(DISTINCT sess.id) AS sessionsConducted,
    SUM(CASE WHEN sess.timesheetSubmissionStatus = 'submitted' THEN 1 ELSE 0 END) AS timesheetsOnTime,
    COUNT(DISTINCT att.id) AS attendanceLogged,
    COUNT(DISTINCT c.id) AS claimsSubmitted,
    COUNT(DISTINCT CASE WHEN c.status = 'approved' THEN c.id END) AS claimsApproved
FROM User u
LEFT JOIN Ticket t ON t.assigneeId = u.id
LEFT JOIN AcademicSession sess ON sess.teacherId = u.id
LEFT JOIN Attendance att ON att.studentId = u.id
LEFT JOIN Claim c ON c.userId = u.id
WHERE u.role IN ('teacher', 'staff', 'management')
GROUP BY u.id;

-- 3. XLSX Students sheet export (exact column name parity)
CREATE VIEW v_students_xslv AS
SELECT
    sp.userId        AS "Student ID",
    u.name           AS "Student Name",
    GROUP_CONCAT(DISTINCT g.code) AS "Batch",
    sp.currency      AS "Currency",
    sp.timesheetUrl  AS "Timesheet",
    sp.timeZone      AS "Time Zone",
    sp.whatsappNumber AS "WhatsApp Number",
    sp.parentWhatsappNumber AS "Parent WhatsApp Number",
    u.email          AS "Email",
    sp.school        AS "School",
    sp.gcrLink       AS "GCR",
    sp.scheduleLink  AS "Schedule",
    sp.notes         AS "Notes",
    sp.progressTrackerLink AS "Progress Tracker",
    sp.location      AS "Location"
FROM StudentProfile sp
JOIN User u ON sp.userId = u.id
LEFT JOIN Enrollment e ON e.studentId = u.id AND e.status = 'active'
LEFT JOIN Service svc ON e.serviceId = svc.id
LEFT JOIN Group g ON svc.groupId = g.id
WHERE u.is_active = TRUE
GROUP BY sp.userId;

-- 4. Budget remaining per dept per quarter
CREATE VIEW v_budget_status AS
SELECT
    db.dept,
    db.quarter,
    db.totalAllocated,
    SUM(bsc.allocated) AS totalSubAllocated,
    SUM(bsc.utilised)  AS totalUtilised,
    SUM(bsc.remaining) AS totalRemaining,
    db.status
FROM DeptBudget db
JOIN BudgetSubCategory bsc ON bsc.budgetId = db.id
GROUP BY db.id;
```

---

## Automation Rules (System Behaviour)

| Trigger | Action |
|---|---|
| Quarter start (Jan 1 / Apr 1 / Jul 1 / Oct 1) | Auto-create DeptBudget rows for all 6 depts with totalAllocated=0, status=draft. Auto-create 2 BudgetSubCategory rows (claims + operations) each with allocated=0. |
| Claim status → approved | Auto-create LedgerEntry (debit on linked BankAccount) + BudgetUtilisation (debit on dept claims sub-category) |
| InvoiceLineItem created for non-tuition one-off | Auto-create shadow Enrollment with status=one_time before line item insert |
| AcademicSession status → missed | Auto-update Attendance.status = missed for all students in group + Auto-create Ticket with ticketType=missed_class |
| StudentInvoice status → paid | Auto-create LedgerEntry credit on Management BankAccount |
| All incoming revenue (any invoice paid) | LedgerEntry credits Management Account only. No dept budget touched. |

---

## Cluster Summary (66 tables + 4 views)

| # | Cluster | Tables |
|---|---|---|
| 1 | Users & Profiles | User, StudentProfile, TeacherProfile, StaffProfile, ParentProfile, AmbassadorProfile, BankAccount |
| 2 | Service Catalogue | Group, Service |
| 3 | Enrollment / Cart | Enrollment, Discount |
| 4 | Academic Sessions | AcademicSession, Attendance |
| 5 | Billing & Invoicing | StudentInvoice, InvoiceLineItem, InvoiceMonth |
| 6 | Claims | Claim |
| 7 | Accounts, Budgets & Ledger | AccountTransaction, LedgerEntry, DeptBudget, BudgetSubCategory, BudgetUtilisation |
| 8 | Ticketing | Ticket, TicketMessage, TicketHistory, TicketPermission |
| 9 | Academic Progress | SyllabusItem, StudentProgress, Doubt, MockResult, Assignment |
| 10 | HR & Candidates | Candidate |
| 11 | Meetings | Meeting, MeetingParticipant |
| 12 | Ambassador | Referral, AmbassadorDeliverable, AmbassadorEarning |
| 13 | Content & Marketing | MarketingPost, Lead, ContentBankItem |
| 14 | Stencils (XLSX parity) | CanvaDesign, Booklet, GcrClassroom, StudentStatus, BacklogItem, SprintItem, CurrencyRate, TextFormat |
| Views | Calculated | v_student_subjects, v_staff_activity_score, v_students_xslv, v_budget_status |

