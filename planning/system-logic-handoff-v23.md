# System Logic & Schema Design — Full Handoff Document v5

> Complete business logic, all design decisions, and final entity definitions.
> Written for a builder agent (database, backend, or frontend).
> Read every section before making any implementation decisions.

---

## 1. Core Mental Model

```
FOUR ROLES — all mirror each other with symmetric naming:

Student    → StudentEnrolmentList    → StudentEnrolmentItem    → StudentInvoice    → PaymentRecord
Teacher    → TeacherEnrolmentList    → TeacherEnrolmentItem    → Claim             → Paycheck → PaymentRecord
Staff      → StaffEnrolmentList      → StaffEnrolmentItem      → Claim             → Paycheck → PaymentRecord
Ambassador → AmbassadorEnrolmentList → AmbassadorEnrolmentItem → AmbassadorClaim   → AmbassadorPaycheck → PaymentRecord

PRE-HIRE (all roles including student):
  Candidate → APPLIED → SCREENING → INTERVIEW_SCHEDULED → TASK_ASSIGNED → OFFER_SENT → HIRED | REJECTED
  Student admissions form is mandatory. Full pipeline is optional.

POST-HIRE SERVICE LEVEL:
  trialRequired = true  → trial session/meeting created (sessionType = TRIAL)
  trialRequired = false → no trial, straight to ACTIVE
  Feedback: SessionAttendance.feedbackStars/feedbackText filtered by isTrial = true

CURRICULUM (per service/programme):
  Service         → CurriculumList → [SyllabusList, TaskList, MockList, CourseTimelineList]
  AmbassadorService → AmbassadorProgrammeList → [AmbassadorProgrammeList, TaskList, AmbassadorTestList, AmbassadorProgrammeTimelineList]

RATES:
  Service → RateList → RateItem (one per country; DEFAULT fallback)
  RateChangeLog tracks every rate value change

CALENDAR:
  Every session/meeting/task creates CalendarItem rows (one per involved user)
  CalendarItem has GCal sync flag
```

---

## 2. Users & Profiles

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
  datetime registrationDate
  string cancellationReason
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
  string status               // "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED"
  string roleTitle
  string salaryType
  float salaryRate
  string role
  string dept
  bool isSupervisor
  datetime registrationDate
  datetime departedAt
  string departureReason
}
```

### AmbassadorProfile
```
AmbassadorProfile {
  cuid id PK
  cuid userId FK
  string cohort
  string referralCode UK
  string programmeDuration    // "3_MONTH" | "6_MONTH"
  datetime programmeStart
  datetime programmeEnd
  string completionStatus     // "ACTIVE" | "COMPLETED" | "DROPPED"
  string certificateLink
  string linkedInBadgeLink
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

---

## 3. Pre-Hire Pipeline (all roles)

One `Candidate` table covers teacher, staff, ambassador, and student admissions.
Student admissions form is mandatory. Full pipeline is optional for students.

```
Candidate {
  cuid id PK
  string email UK
  string name
  string candidateType        // "TEACHER" | "STAFF" | "AMBASSADOR" | "STUDENT"
  string role
  string status               // "APPLIED" | "SCREENING" | "INTERVIEW_SCHEDULED" |
                              //  "TASK_ASSIGNED" | "OFFER_SENT" | "HIRED" | "REJECTED"
  string cvLink
  string docsLink
  string notes
  string outreachSource       // "LINKEDIN" | "INSTAGRAM" | "REFERRAL" | "DIRECT" | "FORM"
  string outreachStatus       // "CONTACTED" | "RESPONDED" | "INVITED" | "NOT_RESPONDED"
  string trialTaskLink        // nullable; task assigned pre-hire
  datetime interviewAt        // nullable
  cuid convertedToUserId FK   // nullable; populated when HIRED → User created
  bool isActive
}
```

---

## 4. Services & Rate System

### Group
```
Group {
  cuid id PK
  string code UK              // "B8" | "B14" | "C1" | "T1"
  string groupCategory        // "B_GROUP" | "C_GROUP" | "T_GROUP"
  string status
  bool isActive
}
```

### Service
```
Service {
  cuid id PK
  cuid groupId FK
  cuid teacherId FK           // denorm snapshot; source of truth is TeacherEnrolmentItem
  string board
  string courseLevel
  string subjectCode
  string subjectName
  string serviceType          // "HOURLY_FIXED" | "HOURLY_FLEXIBLE" | "MONTHLY" | "ONE_OFF"
  bool isHourly
  string teacherIdSnapshot
  bool isActive
}
```

### GcrList + GcrItem
One GcrList per service (1-to-1). Each GcrItem has a unique URL.
Previously represented as a single `gcrLink` string on Service — now expanded to support multiple links.

```
GcrList {
  cuid id PK
  cuid serviceId FK UK
}

GcrItem {
  cuid id PK
  cuid gcrListId FK
  string label
  string url UK
}
```

### RateList + RateItem
One RateList per service. One RateItem per country. DEFAULT country is fallback.
All rate changes logged in RateChangeLog.

```
RateList {
  cuid id PK
  cuid serviceId UK
  bool isActive
}

RateItem {
  cuid id PK
  cuid rateListId FK
  string country              // "MY" | "IN" | "PK" | "GB" | "SA" | "DEFAULT"
  string currency             // "MYR" | "INR" | "PKR" | "GBP" | "SAR"
  float clientRate
  float staffRate             // null for ONE_OFF
  string status               // "ACTIVE" | "PAUSED" | "INACTIVE"
  datetime activatedAt        // denorm
  datetime pausedAt           // denorm
  datetime deactivatedAt      // denorm
  bool isActive
}

RateItemStatusHistory {
  cuid id PK
  cuid rateItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

RateChangeLog {
  cuid id PK
  cuid rateItemId FK
  float previousClientRate
  float newClientRate
  float previousStaffRate
  float newStaffRate
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

---

## 5. SessionType (shared lookup)

Used by ScheduleOccurrence, AcademicSession, Meeting, and AmbassadorMeeting.
Staff-managed. Expandable without deploy.

```
SessionType {
  cuid id PK
  string name                 // "CLASS" | "MOCK" | "TRIAL" | "EXAM" | "ORAL_EXAM" | "REVISION" | custom
  bool isActive
}
```

---

## 6. Student Side — EnrolmentList & EnrolmentItem

### StudentEnrolmentList
One per student per serviceType. Max 4 per student.

```
StudentEnrolmentList {
  cuid id PK
  cuid studentId FK
  string serviceType
  bool isActive
}
```

### StudentEnrolmentItem
One per student per service. Multiple over time via date ranges. Never delinked.

```
StudentEnrolmentItem {
  cuid id PK
  cuid enrolmentListId FK
  cuid studentId FK
  cuid serviceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "CANCELLED" | "ENDED" | "COMPLETED"
  bool trialRequired
  datetime startDate
  datetime endDate
  float expectedHoursPerMonth
  datetime activatedAt        // denorm
  datetime cancelledAt        // denorm
  datetime completedAt        // denorm; auto when duration ends or manual
  string cancellationReason
  bool isActive
}

StudentEnrolmentItemStatusHistory {
  cuid id PK
  cuid enrolmentItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

Discount {
  cuid id PK
  cuid studentId FK
  cuid enrolmentItemId FK
  string discountType
  float value
  bool isPct
  string code
  bool isActive
}
```

---

## 7. Teacher Side — EnrolmentList & EnrolmentItem

One TeacherEnrolmentList per teacher per serviceType. One TeacherEnrolmentItem per teacher per service.
Teacher claim is per EnrolmentList per month — mirrors student invoice per EnrolmentList.

```
TeacherEnrolmentList {
  cuid id PK
  cuid teacherId FK
  string serviceType
  bool isActive
}

TeacherEnrolmentItem {
  cuid id PK
  cuid enrolmentListId FK
  cuid teacherId FK
  cuid serviceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "CANCELLED" | "ENDED" | "COMPLETED"
  bool trialRequired
  datetime startDate
  datetime endDate
  datetime activatedAt
  datetime cancelledAt
  datetime completedAt
  string cancellationReason
  bool isActive
}

TeacherEnrolmentItemStatusHistory {
  cuid id PK
  cuid enrolmentItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

---

## 8. Staff Side — EnrolmentList & EnrolmentItem

```
StaffEnrolmentList {
  cuid id PK
  cuid staffId FK
  string serviceType
  bool isActive
}

StaffEnrolmentItem {
  cuid id PK
  cuid enrolmentListId FK
  cuid staffId FK
  cuid staffServiceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "CANCELLED" | "ENDED" | "COMPLETED"
  bool trialRequired
  datetime startDate
  datetime endDate
  float expectedHoursPerMonth
  datetime activatedAt
  datetime cancelledAt
  datetime completedAt
  string cancellationReason
  bool isActive
}

StaffEnrolmentItemStatusHistory {
  cuid id PK
  cuid enrolmentItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

---

## 9. Ambassador Side — EnrolmentList, EnrolmentItem & Commission

```
AmbassadorEnrolmentList {
  cuid id PK
  cuid ambassadorId FK
  string serviceType
  bool isActive
}

AmbassadorEnrolmentItem {
  cuid id PK
  cuid enrolmentListId FK
  cuid ambassadorId FK
  cuid ambassadorServiceId FK
  string status               // "TRIAL" | "WAITING_CONFIRMATION" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  bool trialRequired
  datetime startDate
  datetime endDate
  datetime activatedAt
  datetime cancelledAt
  datetime completedAt        // auto when programme duration ends or manual
  string cancellationReason
  bool isActive
}

AmbassadorEnrolmentItemStatusHistory {
  cuid id PK
  cuid enrolmentItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

### AmbassadorCommissionList + AmbassadorCommissionItem

One CommissionList per ambassador. One CommissionItem per StudentEnrolmentItem referred.
Auto-inactive when StudentEnrolmentItem cancelled. Auto-resume when re-enrolled.

```
AmbassadorCommissionList {
  cuid id PK
  cuid ambassadorId FK
  bool isActive
}

AmbassadorCommissionItem {
  cuid id PK
  cuid commissionListId FK
  cuid studentEnrolmentItemId FK  // exactly one student enrolment
  float commissionPct             // set at item creation
  string status                   // "ACTIVE" | "PAUSED" | "INACTIVE"
  datetime activatedAt
  datetime pausedAt
  datetime deactivatedAt
  bool isActive
}

AmbassadorCommissionItemStatusHistory {
  cuid id PK
  cuid commissionItemId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

AmbassadorCommissionRateChangeLog {
  cuid id PK
  cuid commissionItemId FK
  float previousPct
  float newPct
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

---

## 10. Schedules (all sides)

### Recurrence types — expanded
All schedule occurrences now support multiple recurrence patterns.

```
ServiceSchedule {
  cuid id PK
  cuid serviceId UK
  bool isActive
}

ScheduleOccurrence {
  cuid id PK
  cuid scheduleId FK
  cuid sessionTypeId FK
  string recurrenceType       // "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY" | "ONE_OFF" | "CUSTOM"
  string dayOfWeek            // nullable; WEEKLY/BIWEEKLY
  int dayOfMonth              // nullable; MONTHLY
  string monthOfYear          // nullable; YEARLY
  datetime oneOffDate         // nullable; ONE_OFF
  string customPattern        // nullable; e.g. "every 5 days" or "3x per month"
  datetime startTime
  datetime endTime
  float durationHours
  string status               // "ACTIVE" | "PAUSED" | "INACTIVE"
  datetime activatedAt
  datetime pausedAt
  datetime deactivatedAt
  bool isActive
}

ScheduleOccurrenceStatusHistory {
  cuid id PK
  cuid occurrenceId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

ScheduleChangeRequest {
  cuid id PK
  cuid scheduleId FK
  cuid occurrenceId FK
  cuid requestedByUserId FK
  string requestType          // "ADD" | "REMOVE" | "RESCHEDULE" | "PAUSE"
  string recurrenceType
  string proposedDayOfWeek
  datetime proposedStartTime
  datetime proposedEndTime
  float proposedDuration
  cuid proposedSessionTypeId FK
  string status               // "PENDING" | "APPROVED" | "REJECTED"
  string rejectionReason
  datetime resolvedAt
  cuid resolvedByUserId FK
}
```

Same pattern mirrored:
- `StaffServiceSchedule` → `StaffScheduleOccurrence` → `StaffScheduleOccurrenceStatusHistory` → `StaffScheduleChangeRequest`
- `AmbassadorServiceSchedule` → `AmbassadorScheduleOccurrence` → `AmbassadorScheduleOccurrenceStatusHistory` → `AmbassadorScheduleChangeRequest`

---

## 11. Academic Sessions & SessionAttendance

### AcademicSession

```
AcademicSession {
  cuid id PK
  cuid groupId FK
  cuid teacherId FK
  cuid serviceId FK
  cuid serviceScheduleId FK
  cuid occurrenceId FK
  cuid scheduledByUserId FK
  cuid sessionTypeId FK
  string topic
  datetime startTime
  datetime endTime
  datetime originalStartTime
  datetime originalEndTime
  float durationHours
  bool isTrial                // true when sessionType = TRIAL
  string status               // "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED"
  string sessionMode          // "SCHEDULED" | "MANUAL"
  string zoomLink
  string zoomId
  string zoomPasscode
  bool addedToCalendar
  datetime calendarSyncedAt
  string recordingUrl
  string transcriptUrl
  string summaryUrl
  string wbLink
  string wbName
  string timesheetSubmissionStatus
  datetime submissionDeadline // auto: startTime + 24hrs
  bool submissionOverdue      // computed: deadline passed + wbLink/recordingUrl null
}
```

3 overdue submissions → warning ticket auto-raised to PR/staff.

### SessionAttendance

```
SessionAttendance {
  cuid id PK
  cuid sessionId FK
  cuid serviceId FK
  cuid studentId FK
  cuid enrolmentItemId FK
  string status               // "PRESENT" | "CANCELLED" | "RESCHEDULED" |
                              //  "ABSENT_NO_SHOW" | "ABSENT_NOTIFIED"
  float teacherLoggedHours
  float studentLoggedHours
  bool hoursMatch
  string hoursMatchStatus     // "MATCHED" | "MISMATCHED" | "PENDING"
  int noShowCount
  bool changeRequestPending
  string changeRequestStatus  // "PENDING" | "APPROVED" | "REJECTED"
  int feedbackStars           // nullable; 1-5; used for TRIAL sessions too
  string feedbackText         // nullable
  datetime feedbackGivenAt    // nullable
  string notes
  datetime markedAt
}
```

No-show escalation (students):
```
noShowCount 1 → Ticket (NO_SHOW_WARNING, PR, LOW)
noShowCount 2 → Ticket (NO_SHOW_WARNING, PR, MEDIUM)
noShowCount 3 → Ticket (NO_SHOW_WARNING, PR, HIGH)
noShowCount 4 → StudentProfile PAUSED; all enrolment items CANCELLED; billing stops
```

---

## 12. Meetings & MeetingAttendance (Staff side)

### Meeting

```
Meeting {
  cuid id PK
  cuid staffServiceId FK
  cuid staffServiceScheduleId FK
  cuid occurrenceId FK
  cuid scheduledByUserId FK
  cuid sessionTypeId FK
  string title
  string agenda
  datetime startTime
  datetime endTime
  datetime originalStartTime
  datetime originalEndTime
  float durationHours
  bool isTrial
  string status
  string sessionMode
  string zoomLink
  string zoomId
  string zoomPasscode
  bool addedToCalendar
  datetime calendarSyncedAt
  string recordingUrl
  string transcriptUrl
  string summaryUrl
  string dept
  bool isActive
}
```

### MeetingAttendance

```
MeetingAttendance {
  cuid id PK
  cuid meetingId FK
  cuid staffServiceId FK
  cuid staffId FK
  cuid enrolmentItemId FK
  string status
  float staffLoggedHours
  float managementLoggedHours
  bool hoursMatch
  string hoursMatchStatus
  int noShowCount
  bool changeRequestPending
  string changeRequestStatus
  int feedbackStars
  string feedbackText
  datetime feedbackGivenAt
  string notes
  datetime markedAt
}
```

No-show escalation (staff):
```
noShowCount 1 → Ticket (MANAGEMENT, LOW)
noShowCount 2 → Ticket (MANAGEMENT, MEDIUM)
noShowCount 3 → Ticket + StaffProfile PAUSED; all enrolment items CANCELLED
```

---

## 13. Ambassador Meetings & Attendance

```
AmbassadorMeeting {
  cuid id PK
  cuid ambassadorServiceId FK
  cuid scheduleId FK
  cuid occurrenceId FK
  cuid scheduledByUserId FK
  cuid sessionTypeId FK
  string title
  string agenda
  datetime startTime
  datetime endTime
  datetime originalStartTime
  datetime originalEndTime
  float durationHours
  bool isTrial
  string status
  string sessionMode
  string zoomLink
  string zoomId
  string zoomPasscode
  bool addedToCalendar
  datetime calendarSyncedAt
  string recordingUrl
  string transcriptUrl
  string summaryUrl
  bool isActive
}

AmbassadorMeetingAttendance {
  cuid id PK
  cuid meetingId FK
  cuid ambassadorId FK
  cuid enrolmentItemId FK
  string status
  float ambassadorLoggedHours
  float managementLoggedHours
  bool hoursMatch
  string hoursMatchStatus
  int noShowCount
  bool changeRequestPending
  string changeRequestStatus
  int feedbackStars
  string feedbackText
  datetime feedbackGivenAt
  string notes
  datetime markedAt
}
```

No-show escalation (ambassador): same as staff — 3 strikes → PAUSED.

---

## 14. CalendarItem (org-wide; stored with GCal sync)

One CalendarItem per entity per involved user. Created when source entity is created.

```
CalendarItem {
  cuid id PK
  string entityType           // "ACADEMIC_SESSION" | "MEETING" | "AMBASSADOR_MEETING" |
                              //  "GENERAL_MEETING" | "TASK_DUE" | "MOCK" | "SKILL_CHECK" | "EXAM"
  cuid entityId               // FK to source entity
  cuid userId FK              // whose calendar this appears on
  datetime startTime
  datetime endTime
  string title
  string colour               // nullable; visual grouping
  string status               // mirrors source entity status
  bool addedToGCal
  datetime gCalSyncedAt
  string gCalEventId          // nullable; for update/delete GCal event
}
```

---

## 15. Curriculum (Student Services)

```
CurriculumList {
  cuid id PK
  cuid serviceId UK
  bool isActive
}
```

### SyllabusList
```
SyllabusList {
  cuid id PK
  cuid curriculumListId FK
  string name
  string version
  string level
  string status               // "ACTIVE" | "PAUSED" | "INACTIVE"
  datetime activatedAt
  datetime pausedAt
  datetime deactivatedAt
  bool isActive
}

SyllabusListStatusHistory {
  cuid id PK
  cuid syllabusListId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

SyllabusItem {
  cuid id PK
  cuid syllabusListId FK
  string chapterNum
  string chapterTitle
  string topicCode
  string topicTitle
  string level
  int order
  bool lectureCompleted
  int pastPaperQCount
  float marksLostInPPQ
  string pastPaperNotesLink
  string difficultTopics
  string note
  bool isActive
}

StudentSyllabusProgress {
  cuid id PK
  cuid studentId FK
  cuid syllabusItemId FK
  string status               // "PENDING" | "ONGOING" | "COMPLETED" | "DOUBT" | "REVISION_NEEDED"
  int masteryPct
  datetime updatedAt
}
```

### TaskList
```
TaskType {
  cuid id PK
  string name                 // "HOMEWORK" | "WORKSHEET" | "PAST_PAPER" | "DELIVERABLE" | "READING" | "PRACTICE" | custom
  bool isActive
}

TaskList {
  cuid id PK
  cuid curriculumListId FK
  bool isActive
}

TaskItem {
  cuid id PK
  cuid taskListId FK
  cuid taskTypeId FK
  cuid sessionId FK           // nullable
  cuid syllabusItemId FK      // nullable
  string title
  string description
  string hwLink
  string paperLink            // nullable; PAST_PAPER type
  datetime dueDate
  bool assignedToAll
  bool isActive
}

TaskAssignment {
  cuid id PK
  cuid taskItemId FK
  cuid studentId FK
}

TaskSubmission {
  cuid id PK
  cuid taskItemId FK
  cuid studentId FK
  string status               // "PENDING" | "SUBMITTED" | "LATE" | "MISSING"
  float totalMarks
  float marksScored
  float marksLost
  string subtopicsLostOn
  string submissionLink
  string notes
  datetime submittedAt
}
```

### MockList
```
MockList {
  cuid id PK
  cuid curriculumListId FK
  bool isActive
}

MockItem {
  cuid id PK
  cuid mockListId FK
  cuid sessionId FK
  cuid syllabusItemId FK
  string mockType             // "CHAPTER_MOCK" | "FULL_PAPER" | "TOPICAL_TEST" | "DRESS_REHEARSAL"
  string paperCode
  string paperLink
  datetime scheduledDate
  float totalMarks
  bool isActive
}

MockResult {
  cuid id PK
  cuid mockItemId FK
  cuid studentId FK
  float marksScored
  float marksAvailable
  float marksLost
  string submissionLink
  string correctionLink
  string notes
  bool completed
  datetime completedAt
}
```

### CourseTimelineList
```
CourseTimelineList {
  cuid id PK
  cuid curriculumListId FK
  bool isActive
}

CourseTimelineItem {
  cuid id PK
  cuid timelineListId FK
  string month
  int weekNumber
  string itemType             // "SYLLABUS" | "TASK" | "MOCK"
  cuid syllabusItemId FK      // nullable
  cuid taskItemId FK          // nullable
  cuid mockItemId FK          // nullable
  string notes
}
```

---

## 16. Ambassador Programme (Curriculum mirror)

```
AmbassadorProgrammeList {
  cuid id PK
  cuid ambassadorServiceId UK
  bool isActive
}
```

### AmbassadorProgrammeList (mirrors SyllabusList)
```
AmbassadorProgrammeList {
  cuid id PK
  cuid programmeListId FK
  string name                 // "Public Speaking" | "Sales" | "Digital Marketing"
  string version
  string status               // "ACTIVE" | "PAUSED" | "INACTIVE"
  datetime activatedAt
  datetime pausedAt
  datetime deactivatedAt
  bool isActive
}

AmbassadorProgrammeListStatusHistory {
  cuid id PK
  cuid programmeListId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

AmbassadorProgrammeItem {
  cuid id PK
  cuid programmeListId FK
  string programmeCode
  string programmeTitle
  string level
  int order
  string note
  bool isActive
}

AmbassadorProgrammeProgress {
  cuid id PK
  cuid ambassadorId FK
  cuid programmeItemId FK
  string status               // "PENDING" | "ONGOING" | "COMPLETED" | "DOUBT" | "REVISION_NEEDED"
  int masteryPct
  datetime updatedAt
}
```

### AmbassadorTestList (mirrors MockList)
```
AmbassadorTestList {
  cuid id PK
  cuid programmeListId FK
  bool isActive
}

AmbassadorTestItem {
  cuid id PK
  cuid testListId FK
  cuid meetingId FK           // maps to AmbassadorMeeting
  cuid programmeItemId FK         // nullable
  string testType             // "SKILL_CHECK" | "MODULE_TEST" | "FINAL_ASSESSMENT"
  string paperLink
  datetime scheduledDate
  float totalMarks
  bool isActive
}

AmbassadorTestResult {
  cuid id PK
  cuid testItemId FK
  cuid ambassadorId FK
  float marksScored
  float marksAvailable
  float marksLost
  string submissionLink
  string notes
  bool completed
  datetime completedAt
}
```

### AmbassadorProgrammeTimelineList (mirrors CourseTimelineList)
```
AmbassadorProgrammeTimelineList {
  cuid id PK
  cuid programmeListId FK
  bool isActive
}

AmbassadorProgrammeTimelineItem {
  cuid id PK
  cuid timelineListId FK
  string month
  int weekNumber
  string itemType             // "SKILL" | "TASK" | "TEST"
  cuid programmeItemId FK         // nullable
  cuid taskItemId FK          // nullable
  cuid testItemId FK          // nullable
  string notes
}
```

---

## 17. Ambassador Services & Referrals

```
AmbassadorService {
  cuid id PK
  string title                // "3 Month Ambassador Programme" | "6 Month Ambassador Programme"
  string serviceType          // "MONTHLY" | "ONE_OFF"
  string currency
  float rate                  // nullable; if Divergencie pays ambassador allowance
  bool isActive
}

Referral {
  cuid id PK
  cuid referrerId FK
  cuid referredStudentId FK
  string code
  string status               // "PENDING" | "ENROLLED" | "ACTIVE" | "CANCELLED"
  bool isActive
}

ReferralClick {
  cuid id PK
  cuid referralId FK
  string ipAddress
  string userAgent
  datetime clickedAt
  bool convertedToEnquiry
  bool convertedToEnrolment
}
```

---

## 18. Claims, Paychecks & Ambassador Claims

### Financial status — fully mirrored across all entities
```
DRAFT | SUBMITTED | PENDING | PARTIALLY_PAID | PAID |
DISPUTED_PRE_PAYMENT | DISPUTED | REFUNDED | WAIVED | CANCELLED
```

Every status change logged in `XStatusChangeLog { entityId, fromStatus, toStatus, changedAt, changedByUserId, reason }`.

### Claim (teacher + staff)
```
Claim {
  cuid id PK
  cuid userId FK
  cuid enrolmentListId FK     // which EnrolmentList this claim covers (one per list per month)
  string claimantType         // "TEACHER" | "STAFF"
  string month
  string dept
  int sessions
  float hours
  float amount
  string currency
  cuid receivingPaymentMethodId FK
  string status
  string statusReason
  string notes
  bool isActive
}

ClaimLineItem {
  cuid id PK
  cuid claimId FK
  cuid serviceId FK
  cuid sessionId FK
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

ClaimStatusChangeLog {
  cuid id PK
  cuid claimId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

### Paycheck
```
Paycheck {
  cuid id PK
  cuid claimId FK
  cuid recipientId FK
  cuid enrolmentListId FK
  cuid paycheckMonthId FK
  cuid receivingPaymentMethodId FK
  string month
  string paycheckMode
  float subtotal
  float deductionsApplied
  float netAmount
  float dueAmount
  string currency
  string status
  string statusReason
  bool isActive
  string notes
}

PaycheckStatusChangeLog {
  cuid id PK
  cuid paycheckId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

PaycheckLineItem {
  cuid id PK
  cuid paycheckId FK
  string lineType             // "SESSION" | "MEETING" | "CORRECTION"
  cuid enrolmentItemId FK
  cuid sessionId FK           // nullable
  cuid meetingId FK           // nullable
  datetime eventDate
  datetime eventStart
  datetime eventEnd
  datetime originalEventStart
  datetime originalEventEnd
  string attendanceStatusSnapshot
  bool isTrialEvent
  float eventHours
  float rateSnapshot
  string serviceTitleSnapshot
  cuid originalPaycheckId FK
  cuid originalLineItemId FK
  string correctionReason
  datetime originalEventDate
  float correctionAmount
  float originalAmount
  string originalCurrency
  float conversionRateUsed
  float convertedAmount
}
```

### AmbassadorClaim
Auto-populated from ReferralClick + Referral records. Ambassador reviews, adds manually if needed, submits.

```
AmbassadorClaim {
  cuid id PK
  cuid ambassadorId FK
  cuid commissionListId FK
  string month
  float totalStudentAmountPaid  // sum of confirmed PaymentRecords for linked enrolments
  float commissionAmount        // sum of line totals
  string currency
  cuid receivingPaymentMethodId FK
  string status
  string statusReason
  string notes
  bool isActive
}

AmbassadorClaimLineItem {
  cuid id PK
  cuid claimId FK
  cuid commissionItemId FK        // which AmbassadorCommissionItem
  cuid studentEnrolmentItemId FK
  float studentHoursLogged
  float studentAmountPaid
  float commissionPct
  float lineTotal
  string currency
}

AmbassadorClaimStatusChangeLog {
  cuid id PK
  cuid claimId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

AmbassadorPaycheck {
  cuid id PK
  cuid claimId FK
  cuid ambassadorId FK
  cuid paycheckMonthId FK
  cuid receivingPaymentMethodId FK
  string month
  float subtotal
  float dueAmount
  string currency
  string status
  string statusReason
  bool isActive
  string notes
}

AmbassadorPaycheckStatusChangeLog {
  cuid id PK
  cuid paycheckId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

---

## 19. Student Invoicing

```
StudentInvoice {
  cuid id PK
  cuid studentId FK
  cuid enrolmentListId FK
  cuid invoiceMonthId FK
  cuid receivingPaymentMethodId FK
  string month
  string invoiceMode          // "AUTO_MONTHLY" | "ONE_OFF"
  float subtotal
  float discountApplied
  float netAmount
  float dueAmount
  string currency
  string status
  string statusReason
  int reminderStage
  bool isActive
  string notes
}

StudentInvoiceStatusChangeLog {
  cuid id PK
  cuid invoiceId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}

InvoiceLineItem {
  cuid id PK
  cuid invoiceId FK
  string lineType             // "SESSION" | "ADHOC" | "CORRECTION"
  cuid enrolmentItemId FK
  cuid sessionId FK
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

InvoiceMonth {
  cuid id PK
  string month UK
}
```

---

## 20. Payment Methods & Bank Accounts

```
PaymentMethodType {
  cuid id PK
  string name
  string region
  bool isActive
}

PaymentMethod {
  cuid id PK
  cuid createdByUserId FK
  cuid ownedByUserId FK
  cuid typeId FK
  string label
  string reference
  string currency
  bool isActive
}

BankAccount {
  cuid id PK
  cuid ownerId FK
  cuid paymentMethodId FK
  bool isDcAccount
  string label
  string purpose
  string currency
  float currentBalance
  bool isActive
}

PaymentRecord {
  cuid id PK
  string entityType           // "STUDENT_INVOICE" | "PAYCHECK" | "AMBASSADOR_PAYCHECK"
  cuid entityId
  cuid receivingPaymentMethodId FK
  cuid paidByUserId FK
  cuid payingPaymentMethodId FK
  float amount
  string currency
  string receiptLink
  string stripePaymentIntentId
  string status               // "PENDING_VERIFICATION" | "COMPLETED" | "DISPUTED" | "FAILED" | "REFUNDED"
  datetime submittedAt
  datetime paidAt
  bool receiverConfirmed
  cuid confirmedByUserId FK
  datetime confirmedAt
  string disputeReason
  string disputeNotes
}
```

---

## 21. Finance — Ledger & Budgets

```
AccountTransaction {
  cuid id PK
  cuid bankAccountId FK
  string description
  string transactionType
  float amount
}

LedgerEntry {
  cuid id PK
  cuid transactionId FK
  cuid bankAccountId FK
  float amount
  string direction
  string purpose
  cuid studentInvoiceId FK
  cuid paycheckId FK
  cuid ambassadorPaycheckId FK
  cuid claimId FK
}

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

BudgetSubCategory {
  cuid id PK
  cuid budgetId FK
  string subCategoryType
  float allocated
  float utilised
  float remaining
}

BudgetUtilisation {
  cuid id PK
  cuid subCategoryId FK
  cuid ledgerEntryId FK
  string referenceType
  float amount
}
```

---

## 22. Tickets

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
  string ticketType           // "NO_SHOW_WARNING" | "BILLING_DISPUTE" | "PRE_PAYMENT_DISPUTE" |
                              //  "SERVICE_CORRECTION" | "CHANGE_REQUEST" | "DISCIPLINARY" | "GENERAL"
  string attachmentLink
  bool isConfidential
  bool isActive
  string routingStack
  string meta
}

TicketMessage {
  cuid id PK
  cuid ticketId FK
  cuid senderId FK
  string body
  bool isInternal
  string attachmentLink
}

TicketHistory {
  cuid id PK
  cuid ticketId FK
  cuid actorId FK
  string action
  string meta
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

## 23. HR — Staff Records & Disciplinary

```
StaffRecord {
  cuid id PK
  cuid userId FK
  string recordType           // "WARNING" | "TERMINATION" | "PROTOCOL_VIOLATION" | "COMMENDATION"
  cuid triggeredByTicketId FK // nullable
  cuid issuedByUserId FK
  string notes
  string documentLink
  datetime issuedAt
}
```

---

## 24. Student Flags

```
StudentFlag {
  cuid id PK
  cuid studentId FK
  cuid flaggedByUserId FK     // nullable; system auto-flags
  string flagType             // "AT_RISK" | "MISSING_ASSIGNMENT" | "ABSENT_STREAK" |
                              //  "PAYMENT_OVERDUE" | "CUSTOM"
  string flagSource           // "AUTO" | "MANUAL"
  string notes
  bool resolved
  datetime flaggedAt
  datetime resolvedAt
  cuid resolvedByUserId FK
}
```

Auto-raise triggers:
- 3 missed TaskSubmissions → `MISSING_ASSIGNMENT`
- Absent streak (threshold TBD) → `ABSENT_STREAK`
- StudentInvoice.status = UNPAID past due → `PAYMENT_OVERDUE`
- Low masteryPct threshold (TBD) → `AT_RISK`

---

## 25. Announcements, Content & Misc

```
Announcement {
  cuid id PK
  string title
  string body
  string targets
  string targetDept
  cuid targetUserId FK
  string priority
  bool emailSent
  datetime createdAt
  datetime expiresAt
  bool isActive
}

ContentGroup { cuid id PK, string name, string dept, bool isActive }
ContentGroupItem { cuid id PK, cuid contentGroupId FK, cuid contentBankItemId FK }
ContentBankItem { cuid id PK, string dept, string name, string url, cuid addedByUserId FK, bool isActive }

GeneralMeeting { cuid id PK, string title, datetime dateTime, string agenda, string status, string link, string dept, bool isActive }
MeetingParticipant { cuid id PK, cuid meetingId FK, cuid userId FK, string rsvp }

Recording { cuid id PK, cuid serviceId FK, cuid sessionId FK, string title, string subject, string videoUrl, datetime date, float durationHours, string category, bool isActive }

SiteLog { cuid id PK, cuid userId FK, string action, string entityType, string entityId, string ipAddress, string userAgent, string device, string country, json metaBefore, json metaAfter, datetime createdAt }
AccessLog { cuid id PK, cuid staffId FK, string toolName, string credential, datetime dateGranted, bool revoked, string notes }

CurrencyRate { cuid id PK, string fromCurrency, string toCurrency, float rate, float reverseRate }
MarketingPost { cuid id PK, string contentType, string status, string canvaLink, string driveLink, string caption, datetime scheduledDate, string campaignTag, bool isActive }
Lead { cuid id PK, string name, string email, string phone, string source, string status, string notes, bool passedToPR, bool isActive }
TextFormat { cuid id PK, string name UK, string text, string alternateText1, string alternateText2, date dateAdded, string use }
BacklogItem { cuid id PK, int serialNo, string addedToCalendar, string addedToCalendar2, string event, string desc }
SprintItem { cuid id PK, int serialNo, string addedToCalendar, string addedToCalendar2, string event, string desc }

Doubt { cuid id PK, cuid studentId FK, cuid syllabusItemId FK, string body, string response, string status }
AmbassadorDeliverable { cuid id PK, cuid ambassadorId FK, string title, float score, string status }
AmbassadorEarning { cuid id PK, cuid ambassadorId FK, string earningType, float amount, string currency, string payoutStatus }
```

---

## 26. Key Business Rules

### Naming symmetry
1. All four roles use XEnrolmentList + XEnrolmentItem pattern
2. All financial entities share the same status set with XStatusChangeLog
3. All lifecycle entities use Option B (status history table) + denorm shortcuts
4. All status changes traceable to a user and reason

### Schedules
5. One ServiceSchedule per service; ScheduleOccurrence supports WEEKLY/BIWEEKLY/MONTHLY/YEARLY/ONE_OFF/CUSTOM
6. Sessions auto-generated Sunday midnight from ACTIVE occurrences
7. SessionType shared lookup across occurrences and sessions (student, staff, ambassador)
8. CalendarItem created for every session/meeting/task; one row per involved user; GCal sync flag

### Rates
9. Service has no direct rate fields — all rates in RateList → RateItem per country
10. DEFAULT RateItem is fallback if no country-specific rate exists
11. All rate changes logged in RateChangeLog

### Pre-hire
12. Candidate table covers all roles including student (admissions form mandatory; pipeline optional)
13. Pre-hire task for all roles; post-hire trial for all (if trialRequired = true)
14. trialRequired = false → no trial, no feedback, straight to ACTIVE

### Enrolment lifecycle
15. COMPLETED auto-triggers when programme end date reached or manually by staff
16. All four enrolment item types share same status set; all have XStatusHistory
17. activatedAt/cancelledAt/completedAt denormalised on all enrolment items

### Student billing
18. Invoice lookup: serviceId + student.country → RateItem; DEFAULT fallback
19. Billing starts only when StudentEnrolmentItem.status = ACTIVE
20. HOURLY_FLEXIBLE: dual logging; exact match required; mismatch → SERVICE_CORRECTION ticket

### Teacher/Staff payroll
21. One Claim per EnrolmentList per month (mirrors one invoice per EnrolmentList)
22. Teacher/Staff no-show thresholds: student=4, staff=3, ambassador=3

### Ambassador
23. AmbassadorCommissionItem maps to exactly one StudentEnrolmentItem; % set at creation
24. Auto-inactive when linked StudentEnrolmentItem cancelled; auto-resume when re-enrolled
25. AmbassadorClaim auto-populated from Referral + ReferralClick; ambassador reviews and submits
26. Commission = studentAmountPaid × commissionPct per line item

### Curriculum
27. One CurriculumList per service; one AmbassadorProgrammeList per AmbassadorService
28. SyllabusList/AmbassadorProgrammeList: ACTIVE|PAUSED|INACTIVE; old lists stay for history
29. SyllabusItems/AmbassadorProgrammeItems never edited — deactivated and replaced
30. TaskItem auto-creates TaskSubmission for each assigned student on creation
31. MockItem maps to AcademicSession of type MOCK; AmbassadorTestItem maps to AmbassadorMeeting

### Payments
32. All financial statuses mirrored: DRAFT|SUBMITTED|PENDING|PARTIALLY_PAID|PAID|DISPUTED_PRE_PAYMENT|DISPUTED|REFUNDED|WAIVED|CANCELLED
33. Every status change logged with reason in XStatusChangeLog
34. Disputes back and forth until PARTIALLY_PAID or PAID only
35. Every payment requires receipt link except Stripe

### Flags & records
36. StudentFlag auto-raised from system events; PR/management can manually flag
37. StaffRecord issued by HR for warnings, terminations, protocol violations
38. AcademicSession.submissionDeadline = startTime + 24hrs; 3 overdue → warning ticket

---

## 27. Role Records (warnings, disciplinary, commendations)

Every role has its own record table. Same structure across all four. Issued by HR or management. Can be triggered by a ticket or manually.

```
StudentRecord {
  cuid id PK
  cuid userId FK
  string recordType           // "WARNING" | "SUSPENSION" | "TERMINATION" | "COMMENDATION" | "NOTE"
  cuid triggeredByTicketId FK // nullable
  cuid issuedByUserId FK
  string notes
  string documentLink         // nullable
  datetime issuedAt
}

TeacherRecord {
  cuid id PK
  cuid userId FK
  string recordType           // "WARNING" | "PROTOCOL_VIOLATION" | "TERMINATION" | "COMMENDATION" | "NOTE"
  cuid triggeredByTicketId FK
  cuid issuedByUserId FK
  string notes
  string documentLink
  datetime issuedAt
}

StaffRecord {
  cuid id PK
  cuid userId FK
  string recordType           // "WARNING" | "PROTOCOL_VIOLATION" | "TERMINATION" | "COMMENDATION" | "NOTE"
  cuid triggeredByTicketId FK
  cuid issuedByUserId FK
  string notes
  string documentLink
  datetime issuedAt
}

AmbassadorRecord {
  cuid id PK
  cuid userId FK
  string recordType           // "WARNING" | "TERMINATION" | "COMMENDATION" | "NOTE"
  cuid triggeredByTicketId FK
  cuid issuedByUserId FK
  string notes
  string documentLink
  datetime issuedAt
}
```

---

## 28. Lookup Tables (staff-managed; classification fields only)

All lookup tables follow the same pattern: staff can add, edit, deactivate via admin panel. No deploy needed. Status fields (state machines) are NOT lookup tables — they are hardcoded.

### TicketType
```
TicketType {
  cuid id PK
  string name       // "NO_SHOW_WARNING" | "BILLING_DISPUTE" | "PRE_PAYMENT_DISPUTE" |
                    //  "SERVICE_CORRECTION" | "CHANGE_REQUEST" | "DISCIPLINARY" | "GENERAL"
  bool isActive
}
```
`Ticket.ticketType` becomes `cuid ticketTypeId FK`.

### NotificationType
```
NotificationType {
  cuid id PK
  string name       // "CLASS_REMINDER" | "PAYMENT_DUE" | "ATTENDANCE_ALERT" |
                    //  "MISSED_POST" | "CLAIM_APPROVED" | "TICKET_UPDATE" |
                    //  "NO_SHOW_WARNING" | "SCHEDULE_CHANGE"
  bool isActive
}
```

### FlagType
```
FlagType {
  cuid id PK
  string name       // "AT_RISK" | "MISSING_ASSIGNMENT" | "ABSENT_STREAK" |
                    //  "PAYMENT_OVERDUE" | "CUSTOM"
  bool isActive
}
```
`StudentFlag.flagType` becomes `cuid flagTypeId FK`.

### RecordType
```
RecordType {
  cuid id PK
  string name       // "WARNING" | "SUSPENSION" | "PROTOCOL_VIOLATION" |
                    //  "TERMINATION" | "COMMENDATION" | "NOTE"
  bool isActive
}
```
Used by all four XRecord tables: `StudentRecord`, `TeacherRecord`, `StaffRecord`, `AmbassadorRecord`.

### MockType
```
MockType {
  cuid id PK
  string name       // "CHAPTER_MOCK" | "FULL_PAPER" | "TOPICAL_TEST" | "DRESS_REHEARSAL"
  bool isActive
}
```
`MockItem.mockType` becomes `cuid mockTypeId FK`.

### AmbassadorTestType
```
AmbassadorTestType {
  cuid id PK
  string name       // "SKILL_CHECK" | "MODULE_TEST" | "FINAL_ASSESSMENT"
  bool isActive
}
```
`AmbassadorTestItem.testType` becomes `cuid testTypeId FK`.

### OutreachSource
```
OutreachSource {
  cuid id PK
  string name       // "LINKEDIN" | "INSTAGRAM" | "REFERRAL" | "DIRECT" | "FORM"
  bool isActive
}
```
`Candidate.outreachSource` becomes `cuid outreachSourceId FK`.

### SocialPlatformType
```
SocialPlatformType {
  cuid id PK
  string name       // "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "FACEBOOK"
  bool isActive
}
```

### SocialPostType
```
SocialPostType {
  cuid id PK
  string name       // "POST" | "REEL" | "STORY"
  bool isActive
}
```

### CampaignTag
```
CampaignTag {
  cuid id PK
  string name       // expandable; no fixed initial values
  bool isActive
}
```
`MarketingPost.campaignTag` string field removed; replaced by `cuid campaignTagId FK` on `CampaignItem`.

---

## 29. Notifications

Per-user triggered notifications. Distinct from broadcast `Announcement`.

```
Notification {
  cuid id PK
  cuid userId FK
  cuid notificationTypeId FK
  string title
  string body
  string entityType         // nullable; what triggered it
  cuid entityId             // nullable
  bool read
  datetime createdAt
}
```

---

## 30. Job Postings & Registration Forms

### JobPosting
```
JobPosting {
  cuid id PK
  string role
  string dept
  string description
  string jobPostingLink     // external link (LinkedIn, website careers page)
  string jobPostingPosterLink // Canva/Drive link to the visual poster
  string status             // "DRAFT" | "OPEN" | "CLOSED"
  datetime postedAt
  datetime closedAt
  bool isActive
}
```
`Candidate` gets `cuid jobPostingId FK` (nullable).

### RegistrationForm + RegistrationFormEntry
Staff builds one form per role. Prospective users fill it in. On submission, auto-creates a `Candidate` record.

```
RegistrationForm {
  cuid id PK
  string name               // "Student Enquiry Form" | "Teacher Application" | "Ambassador Apply"
  string targetRole         // "STUDENT" | "TEACHER" | "STAFF" | "AMBASSADOR"
  string description
  bool isPublic             // whether visible on public website
  bool isActive
}

RegistrationFormEntry {
  cuid id PK
  cuid formId FK
  string name
  string email
  string phone
  string country
  string message
  string cvLink             // nullable; for job applications
  json additionalData       // role-specific flexible fields
  string status             // "NEW" | "REVIEWED" | "CONVERTED" | "DISMISSED"
  cuid convertedToCandidateId FK // nullable; populated when converted to Candidate
  datetime submittedAt
}
```

---

## 31. Checklist System (flexible per entity and role)

Staff defines checklist templates per entity type + role. Templates are applied to each session/meeting instance. Staff can add/edit template items without deploy.

```
ChecklistTemplate {
  cuid id PK
  string name               // "Teacher Pre-Class" | "Student In-Class" | "Staff Meeting"
  string entityType         // "ACADEMIC_SESSION" | "MEETING" | "AMBASSADOR_MEETING"
  string targetRole         // "TEACHER" | "STUDENT" | "STAFF" | "AMBASSADOR" | "MANAGEMENT"
  bool isActive
}

ChecklistTemplateItem {
  cuid id PK
  cuid templateId FK
  string label              // "Camera on" | "Remind student" | "Breakout room set up" |
                            //  "Whiteboard titled" | "Recording started" | "HW submitted"
  int order
  bool isActive
}

ChecklistEntry {
  cuid id PK
  cuid templateId FK
  string entityType         // which session/meeting this entry is for
  cuid entityId
  cuid userId FK            // who is completing this checklist
  bool completed            // true when all items done
  datetime completedAt
}

ChecklistItemEntry {
  cuid id PK
  cuid checklistEntryId FK
  cuid templateItemId FK
  bool checked
  datetime checkedAt
}
```

Known templates and items:

```
Teacher Pre-Class (AcademicSession, TEACHER):
  - Recording started
  - Breakout room set up
  - Camera on
  - Whiteboard titled
  - Student reminded

Student In-Class (AcademicSession, STUDENT):
  - Attendance marked
  - Camera on
  - HW submitted

Staff Meeting (Meeting, STAFF):
  - Camera on
  - Attendees reminded
  - Agenda reviewed

Ambassador Meeting (AmbassadorMeeting, AMBASSADOR):
  - Camera on
  - Attendees reminded
```

---

## 32. Marketing Posts & Campaigns

### MarketingPost (updated)
`campaignTag` string field removed. Now links to `CampaignItem`. Added platform and post type lookups.

```
MarketingPost {
  cuid id PK
  cuid platformTypeId FK    // SocialPlatformType
  cuid postTypeId FK        // SocialPostType
  string postName           // internal reference name
  string postDesc           // internal description
  string postCaption        // actual text that goes into the post
  string canvaLink
  string driveLink
  datetime scheduledDate
  string status             // "DRAFT" | "SCHEDULED" | "POSTED" | "MISSED"
  bool isActive
}
```

### Campaign + CampaignItem
```
Campaign {
  cuid id PK
  string name
  string description
  cuid campaignTagId FK     // CampaignTag lookup
  datetime startDate
  datetime endDate
  string status             // "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  bool isActive
}

CampaignItem {
  cuid id PK
  cuid campaignId FK
  string itemType           // "POST" | "OUTREACH" | "EXHIBITION" (expandable lookup later)
  cuid entityId             // polymorphic; points to MarketingPost or future entity
  string entityType         // "MARKETING_POST" | future types
  string notes
  bool isActive
}
```

`MarketingPost` links to `Campaign` via `CampaignItem.entityId`. One post can belong to one campaign item. Future campaign item types (OUTREACH, EXHIBITION) plug in without schema changes.

---

## 33. Updated Entity Fields (patches to existing entities)

### Candidate (additions)
```
cuid jobPostingId FK        // nullable
string offerLetterLink      // nullable
string rejectionReason      // nullable
cuid outreachSourceId FK    // replaces outreachSource string
```

### ContentBankItem (additions)
```
string description          // nullable
datetime createdAt
```

### Existing string fields converted to FK lookups
```
Ticket.ticketType           → cuid ticketTypeId FK
StudentFlag.flagType        → cuid flagTypeId FK
MockItem.mockType           → cuid mockTypeId FK
AmbassadorTestItem.testType → cuid testTypeId FK
Candidate.outreachSource    → cuid outreachSourceId FK
XRecord.recordType (all 4)  → cuid recordTypeId FK
MarketingPost.campaignTag   → removed; handled by CampaignItem
```

---

## 34. Campaign Item Types — Outreach & Exhibition

### OutreachType lookup
```
OutreachType {
  cuid id PK
  string name       // "COLD_CALL" | "DM_CAMPAIGN" | "SCHOOL_VISIT" |
                    //  "LINKEDIN_OUTREACH" | "WHATSAPP_BLAST"
  bool isActive
}
```

### ExhibitionType lookup
```
ExhibitionType {
  cuid id PK
  string name       // "SCHOOL_FAIR" | "CAREER_FAIR" | "OPEN_DAY" | "VIRTUAL_EVENT"
  bool isActive
}
```

### OutreachItem
Maps to `CampaignItem.entityType = "OUTREACH"`.

```
OutreachItem {
  cuid id PK
  cuid outreachTypeId FK
  string title
  string targetAudience
  cuid assignedToUserId FK    // nullable; which staff member owns this
  datetime plannedDate
  datetime completedAt        // nullable
  int leadCount               // how many leads generated
  string status               // "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  string notes
  bool isActive
}
```

### ExhibitionItem
Maps to `CampaignItem.entityType = "EXHIBITION"`.

```
ExhibitionItem {
  cuid id PK
  cuid exhibitionTypeId FK
  string title
  string venue
  string location
  cuid assignedToUserId FK    // nullable
  datetime plannedDate
  datetime completedAt        // nullable
  int leadCount
  string status               // "PLANNED" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
  string notes
  bool isActive
}
```

### CampaignItem.entityType — final values
```
"MARKETING_POST" | "OUTREACH" | "EXHIBITION"
```

---

## 35. Remaining Additions (UJM final pass)

### ContentType lookup
Added to `MarketingPost` as `cuid contentTypeId FK`.

```
ContentType {
  cuid id PK
  string name       // "CAROUSEL" | "VLOG" | "DOCUMENTARY" | "ALUMNI_STORY" |
                    //  "SUCCESS_STORY" | "STAFF_STORY" | "LITERATURE" | "REEL"
  bool isActive
}
```

### Lead — handoff ticket link
When `passedToPR = true` → ticket auto-created, assigned to PR dept supervisor by default.
`Lead` gets `cuid handoffTicketId FK` (nullable).

### KnowledgeBank

```
KnowledgeBankDomain {
  cuid id PK
  string name       // "BILLING" | "SCHEDULING" | "TECHNICAL" | "HR" | custom
  bool isActive
}

KnowledgeBankList {
  cuid id PK
  cuid domainId FK
  string dept
  bool isActive
}

KnowledgeBankItem {
  cuid id PK
  cuid listId FK
  string title
  string summary
  cuid sourceTicketId FK    // nullable; ticket this knowledge came from
  bool isActive
}
```

Resolved tickets can be added to knowledge bank. Staff picks which list → `KnowledgeBankItem` created with `sourceTicketId`. `KnowledgeBankDomain` is a lookup table (staff-managed).

### Org Backlog Bank + Meeting Sprint/Backlog

#### Core model
```
BacklogItem (one per ticket; ticket drives status)
  → ticketId is mandatory and unique
  → BacklogItem has NO status field
  → isClosed = computed from linked Ticket.status = "CLOSED"
  → only way to complete a backlog item = close its ticket
  → BacklogItem has its own changelog for planning-layer events
```

#### BacklogItem
```
BacklogItem {
  cuid id PK
  cuid ticketId FK UK        // one-to-one with Ticket; mandatory
  string dept
  string title               // can mirror ticket title
  string priority            // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  bool isActive
}

BacklogItemChangeLog {
  cuid id PK
  cuid backlogItemId FK
  string event               // "ADDED_TO_BANK" | "PULLED_TO_SPRINT" |
                             //  "RETURNED_TO_BANK" | "TICKET_CLOSED"
  cuid meetingId FK          // nullable; which meeting triggered this event
  datetime changedAt
  cuid changedByUserId FK    // nullable; system events have no user
  string notes
}
```

#### OrgBacklogBank
One org-wide bank. All backlog items live here, filtered by dept.

```
OrgBacklogBank {
  cuid id PK
  string name               // "Org Backlog"
  bool isActive
}
```

`BacklogItem` gets `cuid orgBacklogBankId FK` — all items belong to the bank.

#### Meeting Sprint & Backlog lists

Every meeting has one `MeetingSprintList` (items pulled from bank to work on) and one `MeetingBacklogList` (new items raised during meeting, auto-pushed to bank after meeting ends).

```
MeetingSprintList {
  cuid id PK
  cuid meetingId FK UK       // one per meeting
  bool isActive
}

MeetingSprintItem {
  cuid id PK
  cuid sprintListId FK
  cuid backlogItemId FK      // references existing BacklogItem in bank
  string notes
}

MeetingBacklogList {
  cuid id PK
  cuid meetingId FK UK       // one per meeting
  bool isActive
}

MeetingBacklogItem {
  cuid id PK
  cuid backlogListId FK
  cuid ticketId FK           // ticket created for this item
  string title
  string dept
  string priority
  string notes
  bool pushedToBank          // auto-true when meeting ends
  datetime pushedAt          // auto-set on meeting completion
}
```

#### Flow
```
Before meeting:
  Staff pulls BacklogItems from OrgBacklogBank → MeetingSprintItems
  Each MeetingSprintItem references existing BacklogItem + Ticket

During meeting:
  New issues raised → MeetingBacklogItems created (with new Tickets)

After meeting (auto):
  All MeetingBacklogItems → pushed to OrgBacklogBank as new BacklogItems
  pushedToBank = true, pushedAt = meeting.endTime
  BacklogItemChangeLog entry: ADDED_TO_BANK, meetingId recorded

Status sync:
  BacklogItem has no status — always read Ticket.status
  MeetingSprintItem completion = close the Ticket
  BacklogItemChangeLog records TICKET_CLOSED when Ticket.status → CLOSED
```

#### GeneralMeeting also gets sprint/backlog lists
`MeetingSprintList` and `MeetingBacklogList` link to `meetingId` — this covers both payroll `Meeting` and `GeneralMeeting`. The `meetingId` field should reference whichever meeting type is relevant (polymorphic via `meetingType` + `meetingId`, or separate lists per meeting type — keep as-is since GeneralMeeting is the primary context for sprint/backlog work).

---

## 36. Syllabus Chapter Structure + Recording Connections

### Syllabus restructure
`SyllabusItem` no longer holds `chapterNum` / `chapterTitle` — those move to `SyllabusChapter`.

```
SyllabusList
  └── SyllabusChapter (NEW)
        e.g. "1 Motion Forces and Energy" | "2 Thermal Physics"
        └── SyllabusItem
              e.g. "1.1.3 Define acceleration"
              └── StudentSyllabusProgress (per student)
```

```
SyllabusChapter {
  cuid id PK
  cuid syllabusListId FK
  string chapterNum         // "1" | "2" | "3"
  string chapterTitle       // "Motion Forces and Energy"
  int order
  bool isActive
}
```

`SyllabusItem` updated:
- Remove `chapterNum`, `chapterTitle`
- Add `cuid syllabusChapterId FK`

### Recording — updated connections
```
Recording {
  cuid id PK
  cuid serviceId FK           // always set; which service
  cuid sessionId FK           // nullable; which AcademicSession
  cuid meetingId FK           // nullable; which Meeting
                              // at least one of sessionId or meetingId must be set
  string title
  string subject
  string videoUrl
  datetime date
  float durationHours
  string category
  bool isActive
}
```

### ChapterRecordingList + ChapterRecordingItem
One curated recording list per SyllabusChapter. Teacher/staff tags relevant recordings to chapters after sessions. One recording can appear in multiple chapters.

```
ChapterRecordingList {
  cuid id PK
  cuid syllabusChapterId UK   // one per chapter
  bool isActive
}

ChapterRecordingItem {
  cuid id PK
  cuid chapterRecordingListId FK
  cuid recordingId FK
  string notes                // nullable; e.g. "covers section 1.2.3 onwards"
  int order
  bool isActive
}
```

---

## 37. Performance Metrics & Progress Reports

### MetricSnapshot
Auto-computed on 1st of each month from live data. Stored for historical comparison (Aug vs Sep etc).

```
MetricSnapshot {
  cuid id PK
  string entityType           // "STUDENT" | "TEACHER" | "STAFF" | "AMBASSADOR" |
                              //  "SERVICE" | "ORG"
  cuid entityId               // nullable for ORG type
  string month                // "Aug_2024"
  json metrics                // all computed values (see below per type)
  datetime snapshotAt
}
```

### Metrics per entity type

**STUDENT metrics (stored in json):**
```
{
  attendanceRate,             // sessions present / total sessions that month
  syllabusCompletion,         // % SyllabusItems with status COMPLETED
  avgMasteryPct,              // avg masteryPct across all SyllabusItems
  taskCompletionRate,         // TaskSubmissions submitted / total assigned
  avgTaskScore,               // avg marksScored/totalMarks across TaskSubmissions
  avgMockScore,               // avg MockResult marksScored/marksAvailable
  noShowCount,                // ABSENT_NO_SHOW count that month
  paymentStatus               // "PAID" | "PARTIALLY_PAID" | "UNPAID" | "OVERDUE"
}
```

**TEACHER metrics:**
```
{
  sessionsDelivered,          // AcademicSessions with status COMPLETED
  hoursLogged,                // sum of teacherLoggedHours on SessionAttendance
  avgFeedbackStars,           // avg feedbackStars from SessionAttendance
  submissionComplianceRate,   // sessions with wbLink+recordingUrl submitted on time / total
  noShowCount
}
```

**STAFF metrics:**
```
{
  meetingsAttended,
  hoursLogged,
  tasksCompleted,             // TaskSubmissions or ChecklistItemEntry completed
  noShowCount
}
```

**AMBASSADOR metrics:**
```
{
  referralClicks,             // ReferralClick count that month
  referralsConverted,         // ReferralClick.convertedToEnrolment = true
  commissionEarned,           // AmbassadorClaimLineItem totals
  meetingsAttended,
  programmeProgress           // % AmbassadorProgrammeItems COMPLETED
}
```

**ORG metrics (rollup):**
```
{
  totalActiveStudents,
  totalRevenue,               // sum of confirmed PaymentRecords incoming
  totalClaimsPaid,            // sum of confirmed PaymentRecords outgoing
  avgStudentAttendance,
  avgTeacherCompliance,       // avg submissionComplianceRate across teachers
  newEnrolments,              // StudentEnrolmentItems activated that month
  cancellations,              // StudentEnrolmentItems cancelled that month
  netEnrolmentChange          // newEnrolments - cancellations
}
```

---

### ProgressReport
Auto-generated monthly PDF per student. Staff can add comments before it is sent.

```
ProgressReport {
  cuid id PK
  cuid studentId FK
  cuid metricSnapshotId FK    // the snapshot this report is based on
  string month
  string pdfLink              // auto-generated PDF stored in Drive
  string staffComments        // nullable; staff adds before sending
  string status               // "GENERATED" | "REVIEWED" | "SENT"
  cuid reviewedByUserId FK    // nullable
  datetime reviewedAt         // nullable
  datetime sentAt             // nullable
  bool isActive
}
```

Flow:
```
1st of month
  → MetricSnapshot computed and stored
  → ProgressReport auto-generated (PDF created, status: GENERATED)
  → Staff reviews, adds comments → status: REVIEWED
  → Staff sends to student/parent → status: SENT
  → Notification triggered to student + parent
```

---

## 38. Portal-Wide RBAC (Role-Based Access Control)

Managed by IT dept. Hybrid model: code defines default permissions per role; DB stores overrides only.

### PortalPermission (override table)
```
PortalPermission {
  cuid id PK
  string role                 // "STUDENT" | "PARENT" | "TEACHER" | "STAFF" |
                              //  "AMBASSADOR" | "MANAGEMENT"
  string dept                 // nullable; for STAFF role dept-level overrides
  cuid userId FK              // nullable; for individual user overrides
  string resource             // "INVOICES" | "SCHEDULES" | "CURRICULUM" |
                              //  "CLAIMS" | "REPORTS" | "CANDIDATES" |
                              //  "TICKETS" | "CONTENT_BANK" | "KNOWLEDGE_BANK" |
                              //  "BACKLOG" | "CAMPAIGNS" | "ANALYTICS" |
                              //  "ADMIN_LOOKUPS" | "PAYROLL" | "BUDGET"
  bool canView
  bool canCreate
  bool canEdit
  bool canDelete
  bool canApprove
  cuid updatedByUserId FK
  datetime updatedAt
}
```

### Rules
```
Resolution order (most specific wins):
  1. Individual user override (userId set)
  2. Dept-level override (role + dept set, userId null)
  3. Role-level override (role set, dept + userId null)
  4. Code default (no DB row = falls back to hardcoded defaults)

IT dept manages rows via admin panel
Management can request changes via ticket → IT applies
No override row = code default applies (no DB row needed for normal cases)
```

### Default permissions (code-defined; not in DB)
```
STUDENT:    view own schedule, curriculum, invoices, progress reports
PARENT:     view student schedule, invoices, progress reports
TEACHER:    view+edit own sessions, curriculum, claims; view students in their services
STAFF:      varies by dept (finance sees payroll; hr sees candidates; pr sees tickets+leads)
AMBASSADOR: view own programme, referrals, commission, meetings
MANAGEMENT: full access to all resources
```

---

## 39. Schema Fixes (v7 final pass)

- `AmbassadorProgrammeList` collision fixed — versioned content list renamed to `AmbassadorProgrammeContentList`; mirrors `SyllabusList` pattern exactly
- `SyllabusItem` — removed `chapterNum`/`chapterTitle`; now uses `syllabusChapterId FK`
- `SyllabusList → SyllabusChapter → SyllabusItem` chain corrected; duplicate relationship removed
- `Recording` — added `meetingId FK` (nullable; at least one of sessionId or meetingId must be set)
- Old flat `BacklogItem` and `SprintItem` tables removed; replaced by `OrgBacklogBank → BacklogItem` system
- `MarketingPost` — old version with string `contentType`/`campaignTag` replaced; now uses `platformTypeId FK`, `postTypeId FK`, `contentTypeId FK`
- `Candidate` — `outreachSource` string → `outreachSourceId FK`; added `jobPostingId`, `offerLetterLink`, `rejectionReason`
- `Lead` — added `handoffTicketId FK`
- `ContentBankItem` — added `description` and `createdAt`
- `Ticket.ticketType` string → `ticketTypeId FK`
- `MockItem.mockType` string → `mockTypeId FK`
- `AmbassadorTestItem.testType` string → `testTypeId FK`
- `StudentFlag.flagType` string → `flagTypeId FK`
- All four XRecord tables `.recordType` string → `recordTypeId FK`
- All lookup tables now have proper ERD relationship declarations
- `Doubt` — added `createdAt`, `answeredByUserId FK`, `answeredAt`
- `AmbassadorDeliverable` and `AmbassadorEarning` removed — superseded by `AmbassadorCommissionItem` and `AmbassadorClaim`
- `ProgressReport` connected to `Notification` — triggers notification to student + parent when sent

---

## 40. Schema Fixes (v10 — ERD Changelist Applied)

All changes below were identified during ERD review and applied to `schema-erd-v10.md`. The system logic above remains unchanged; this section documents what was corrected and why.

### Cardinality fixes

- `CurriculumList → SyllabusList` — changed from one-to-one (`||--||`) to one-to-many (`||--o{`). System logic (§15, §28) states old SyllabusLists are kept for history when a new version is activated; multiple SyllabusLists can exist per CurriculumList over time.
- `CurriculumList → TaskList`, `CurriculumList → MockList`, `CurriculumList → CourseTimelineList` — all changed from one-to-one to one-to-many (`||--o{`) for consistency. All curriculum sub-lists are now treated as versioned, matching the SyllabusList pattern.

### Phantom relationship removed

- `Referral ||--o{ AmbassadorCommissionItem` — removed. `AmbassadorCommissionItem` has no `referralId FK` field; it links to a `StudentEnrolmentItem` via `studentEnrolmentItemId FK`. The commission tracks the enrolled student, not the referral record itself. No field change required — relationship line was an ERD error only.

### User self-referential relationship removed

- `User ||--o{ User : "parent of"` — removed. `User` has no `parentUserId FK` field and nothing in the schema backs this relationship. A parent is a `User` with a `ParentProfile`; the child link is now handled by the field addition below.

### ParentProfile — linked student field added

```
ParentProfile {
  cuid id PK
  cuid userId FK
  cuid linkedStudentId FK    ← NEW; FK to StudentProfile
  string phone
  string address
}
```

- Added `cuid linkedStudentId FK` pointing to `StudentProfile`.
- Added ERD relationship: `ParentProfile ||--o{ StudentProfile : "linked to"`.
- Without this field, the system had no way to scope a parent's portal access to their child's data (invoices, schedule, progress reports). This was a functional gap, not just a diagram omission.
- One `ParentProfile` links to one `StudentProfile`. If a parent has multiple children enrolled, they will have one `ParentProfile` per child (each backed by the same `User` record via `userId FK`).

### PaycheckLineItem — correction self-reference added

- Added `PaycheckLineItem ||--o| PaycheckLineItem : "corrects"` to match the equivalent relationship already present on `InvoiceLineItem`.
- `PaycheckLineItem` already carries `originalPaycheckId FK`, `originalLineItemId FK`, `correctionReason`, `originalAmount`, and `correctionAmount` — the relationship was always implied by the fields; it was simply missing from the diagram.

### Missing relationship lines added

- `GeneralMeeting ||--o{ BacklogItemChangeLog : "triggers"` — `BacklogItemChangeLog.meetingId FK` references `GeneralMeeting` (records which meeting triggered a PULLED_TO_SPRINT or RETURNED_TO_BANK event) but the line was absent from the ERD.
- `AcademicSession ||--o{ PaycheckLineItem : "paid as"` — `PaycheckLineItem.sessionId FK` (nullable) can reference an `AcademicSession` when a teacher is paid for a class session. `Meeting ||--o{ PaycheckLineItem` was already drawn; the academic session side was missing.

---

## 41. Schema Fixes (v11 — Second ERD Changelist Applied)

All changes below were applied to `schema-erd-v11.md`. System logic above is unchanged except for the `Claim` and `Paycheck` field-level fix in item 3, which affects the DB schema.

### Duplicate declaration removed

- `User ||--o{ StaffRecord : "has record"` appeared twice — once in the Users section and once in the Role Records section. The duplicate in the Users section was removed.

### ChapterRecordingItem cardinality corrected

- `ChapterRecordingItem ||--|| Recording` (one-to-one) replaced with `Recording ||--o{ ChapterRecordingItem : "referenced by"` (one-to-many).
- System logic (§36) states one Recording can appear in multiple chapters. Many `ChapterRecordingItems` can reference the same `Recording`; the prior 1:1 was incorrect.

### Claim & Paycheck — polymorphic FK split

`Claim.enrolmentListId FK` was a single FK used polymorphically against either `TeacherEnrolmentList` or `StaffEnrolmentList` depending on `claimantType`. A single FK column cannot enforce referential integrity against two tables.

**Updated fields in `Claim`:**
```
BEFORE:
  cuid enrolmentListId FK

AFTER:
  cuid teacherEnrolmentListId FK   // nullable; set when claimantType = "TEACHER"
  cuid staffEnrolmentListId FK     // nullable; set when claimantType = "STAFF"
  // exactly one must be non-null — enforce via check constraint
```

**Same split applied to `Paycheck`** (which carried the same field for the same reason):
```
BEFORE:
  cuid enrolmentListId FK

AFTER:
  cuid teacherEnrolmentListId FK
  cuid staffEnrolmentListId FK
```

ERD relationship lines (`TeacherEnrolmentList ||--o{ Claim` and `StaffEnrolmentList ||--o{ Claim`) remain correct and unchanged.

### Missing relationship lines added

- `Claim ||--o{ LedgerEntry : "references"` — `LedgerEntry.claimId FK` existed; all other LedgerEntry FK relationship lines were drawn except this one.
- `Meeting ||--o{ Recording : "recorded as"` — `Recording.meetingId FK` (nullable) existed; `AcademicSession ||--o{ Recording` was present but the Meeting side was missing.
- `SessionType ||--o{ ScheduleChangeRequest : "types"` — added for all three variants (student, staff, ambassador). All three `ScheduleChangeRequest` tables carry a `proposedSessionTypeId FK`; none had a relationship line to `SessionType`.
- `SyllabusItem ||--o{ TaskItem : "tagged"` — `TaskItem.syllabusItemId FK` (nullable) existed with no line.
- `SyllabusItem ||--o{ MockItem : "tagged"` — `MockItem.syllabusItemId FK` (nullable) existed with no line.
- `CourseTimelineItem` — added three missing lines: `SyllabusItem ||--o{ CourseTimelineItem`, `TaskItem ||--o{ CourseTimelineItem`, `MockItem ||--o{ CourseTimelineItem`. All three FKs existed on the entity with no drawn relationships.
- `AmbassadorProgrammeTimelineItem` — added three missing lines: `AmbassadorProgrammeItem ||--o{ AmbassadorProgrammeTimelineItem`, `TaskItem ||--o{ AmbassadorProgrammeTimelineItem`, `AmbassadorTestItem ||--o{ AmbassadorProgrammeTimelineItem`. Same pattern as CourseTimelineItem.

### Ambassador programme sub-list cardinality updated

- `AmbassadorProgrammeList ||--|| AmbassadorTestList` → `||--o{`
- `AmbassadorProgrammeList ||--|| AmbassadorProgrammeTimelineList` → `||--o{`
- Matches the versioning pattern applied to `CurriculumList` sub-lists in v10. The ambassador programme uses the same versioning logic symmetrically; old lists are kept for history.

---

## 42. Schema Fixes (v12 — Third ERD Changelist Applied)

All changes below were applied to `schema-erd-v12.md`. No system logic changes.

### Symmetry fixes — ScheduleChangeRequest

- `StaffScheduleOccurrence ||--o{ StaffScheduleChangeRequest : "has"` added. The student schedule section already had `ScheduleOccurrence ||--o{ ScheduleChangeRequest : "has"`; the staff variant was missing the equivalent Occurrence → ChangeRequest line despite `StaffScheduleChangeRequest.occurrenceId FK` existing.
- `AmbassadorScheduleOccurrence ||--o{ AmbassadorScheduleChangeRequest : "has"` added for the same reason.

### AmbassadorService — missing connections

- `AmbassadorService ||--o{ AmbassadorMeeting : "covers"` added. `AmbassadorMeeting.ambassadorServiceId FK` existed with no line; mirrors `StaffService ||--o{ Meeting : "covers"`.
- `AmbassadorService ||--o{ AmbassadorEnrolmentItem : "has"` added. `AmbassadorEnrolmentItem.ambassadorServiceId FK` existed with no line; mirrors `StaffService ||--o{ StaffEnrolmentItem : "has"`.

### Fix 3 follow-through — Paycheck EnrolmentList lines

- `TeacherEnrolmentList ||--o{ Paycheck : "generates"` added.
- `StaffEnrolmentList ||--o{ Paycheck : "generates"` added.
- The v11 FK split added `teacherEnrolmentListId FK` and `staffEnrolmentListId FK` to `Paycheck` but the corresponding relationship lines were only added for `Claim`, not `Paycheck`.

### Ambassador programme gaps

- `AmbassadorProgrammeItem ||--o{ AmbassadorTestItem : "tagged"` added. `AmbassadorTestItem.programmeItemId FK` (nullable) was unconnected; mirrors `SyllabusItem ||--o{ MockItem`.
- `AmbassadorCommissionList ||--o{ AmbassadorClaim : "generates"` added. `AmbassadorClaim.commissionListId FK` was unconnected.
- `AmbassadorCommissionItem ||--o{ AmbassadorClaimLineItem : "claimed via"` added. `AmbassadorClaimLineItem.commissionItemId FK` was unconnected.
- `StudentEnrolmentItem ||--o{ AmbassadorClaimLineItem : "tracked via"` added. `AmbassadorClaimLineItem.studentEnrolmentItemId FK` was unconnected.

### Referral — User connections

- `User ||--o{ Referral : "refers"` added for `Referral.referrerId FK`.
- `User ||--o{ Referral : "referred in"` added for `Referral.referredStudentId FK`.

### Actor / audit FK relationship lines (item 11)

All `changedByUserId`, `scheduledByUserId`, `requestedByUserId`, `resolvedByUserId`, `issuedByUserId`, `answeredByUserId`, `submits`, and `receives` FK fields on the following entities now have explicit `User ||--o{` lines drawn:

`RateItemStatusHistory`, `RateChangeLog`, `StudentEnrolmentItemStatusHistory`, `TeacherEnrolmentItemStatusHistory`, `StaffEnrolmentItemStatusHistory`, `AmbassadorEnrolmentItemStatusHistory`, `AmbassadorCommissionItemStatusHistory`, `AmbassadorCommissionRateChangeLog`, `ScheduleOccurrenceStatusHistory`, `StaffScheduleOccurrenceStatusHistory`, `AmbassadorScheduleOccurrenceStatusHistory`, `ScheduleChangeRequest`, `StaffScheduleChangeRequest`, `AmbassadorScheduleChangeRequest`, `AcademicSession`, `Meeting`, `AmbassadorMeeting`, `StudentInvoiceStatusChangeLog`, `ClaimStatusChangeLog`, `PaycheckStatusChangeLog`, `AmbassadorClaimStatusChangeLog`, `AmbassadorPaycheckStatusChangeLog`, `SyllabusListStatusHistory`, `AmbassadorProgrammeContentListStatusHistory`, `Doubt`, `BacklogItemChangeLog`, `Claim`, `Paycheck`, `AmbassadorClaim`, `AmbassadorPaycheck`.

### Denorm student / ambassador ID relationship lines (item 12)

All denorm `studentId FK` and `ambassadorId FK` fields on child tables now have explicit `User ||--o{` lines drawn:

`StudentEnrolmentItem`, `TeacherEnrolmentItem`, `AmbassadorEnrolmentItem`, `StudentInvoice`, `SessionAttendance`, `MeetingAttendance`, `AmbassadorMeetingAttendance`, `TaskAssignment`, `TaskSubmission`, `MockResult`, `Discount`, `StudentSyllabusProgress`, `AmbassadorProgrammeProgress`, `AmbassadorTestResult`.

All new User relationship lines were added to the Users & Profiles section header block, grouped under two comments: `%% ── actor / audit FKs ──` and `%% ── denorm student / ambassador IDs ──`.

---

## 43. Normalisation Notes (v13)

### InvoiceMonth — purpose and design intent

`InvoiceMonth` is a billing period gate, not just a label lookup. It serves three roles:

1. **Period control** — because `StudentInvoice.invoiceMonthId`, `Paycheck.paycheckMonthId`, and `AmbassadorPaycheck.paycheckMonthId` are all FKs into `InvoiceMonth`, an invoice or paycheck cannot be created for a month that has not been explicitly opened in the system. This prevents accidental billing into future or invalid periods.

2. **Cross-entity anchor** — all three financial entity types (`StudentInvoice`, `Paycheck`, `AmbassadorPaycheck`) share the same `InvoiceMonth` row for a given period. Querying all financial activity for a month is a single FK join across all three tables.

3. **Format consistency** — the `month UK` constraint ensures exactly one canonical string per period (e.g. `"2025-03"`), preventing drift across tables.

### `string month` denorm — intentional

`StudentInvoice`, `Claim`, `Paycheck`, `AmbassadorClaim`, and `AmbassadorPaycheck` all carry a `string month` field alongside the `invoiceMonthId FK` / `paycheckMonthId FK`. The string is directly derivable from the FK via `InvoiceMonth.month` and is therefore a 3NF violation.

This is **intentional**. The month label is accessed on almost every financial list view and report. Storing it directly avoids a join on every read. It follows the same pattern as the `activatedAt`/`cancelledAt` status datetime denorms documented in §39–42.

**Maintenance rule:** when an `InvoiceMonth` row is created, the `month` string written to child records must exactly match `InvoiceMonth.month` for that row. This should be enforced at the application layer (service/mutation), not left to individual callers.

---

## 44. Schema Changes (v14)

### Global rename — `XStatusHistory` → `XStatusChangeLog`

All status audit tables now use a single unified naming convention: `XStatusChangeLog`. Previously, enrolment items, rate items, schedule occurrences, and syllabus lists used `XStatusHistory` while financial entities used `XStatusChangeLog`. There was no logical reason for the split — both table types store identical information (fromStatus, toStatus, changedAt, changedByUserId, reason). All `XStatusHistory` tables are renamed to `XStatusChangeLog` in v14. Sections §39–43 use the old names; treat all prior mentions of `XStatusHistory` as `XStatusChangeLog`.

Renamed tables:
`StudentEnrolmentItemStatusChangeLog`, `TeacherEnrolmentItemStatusChangeLog`, `StaffEnrolmentItemStatusChangeLog`, `AmbassadorEnrolmentItemStatusChangeLog`, `AmbassadorCommissionItemStatusChangeLog`, `RateItemStatusChangeLog`, `ScheduleOccurrenceStatusChangeLog`, `StaffScheduleOccurrenceStatusChangeLog`, `AmbassadorScheduleOccurrenceStatusChangeLog`, `SyllabusListStatusChangeLog`, `AmbassadorProgrammeContentListStatusChangeLog`.

### Global rename — `InvoiceMonth` → `BillingMonth`

`InvoiceMonth` is renamed to `BillingMonth` throughout the ERD. The table is used by `StudentInvoice`, `Paycheck`, and `AmbassadorPaycheck` — the old name only described one use case. Field renames: `invoiceMonthId FK` → `billingMonthId FK` on `StudentInvoice`; `paycheckMonthId FK` → `billingMonthId FK` on `Paycheck` and `AmbassadorPaycheck`. Sections §43 and prior use the old name; treat all prior mentions of `InvoiceMonth`/`invoiceMonthId`/`paycheckMonthId` as the new names.

### Versioning fields added to five sub-lists

`TaskList`, `MockList`, `CourseTimelineList`, `AmbassadorTestList`, and `AmbassadorProgrammeTimelineList` were promoted to one-to-many in v10/v11 but lacked the fields to make multiple versions meaningful. All five now match the `SyllabusList` versioning pattern (minus `level`, which is not needed — one set of lists per service is always sufficient):

```
string name
int version
string status       // ACTIVE | PAUSED | INACTIVE
datetime activatedAt
datetime pausedAt
datetime deactivatedAt
bool isActive
```

### New StatusChangeLog tables — five versioned sub-lists

Each of the five newly-versioned sub-lists now has a corresponding status audit table following the standard schema:

`TaskListStatusChangeLog`, `MockListStatusChangeLog`, `CourseTimelineListStatusChangeLog`, `AmbassadorTestListStatusChangeLog`, `AmbassadorProgrammeTimelineListStatusChangeLog`.

Each carries: `id PK`, `xListId FK`, `fromStatus`, `toStatus`, `changedAt`, `changedByUserId FK`, `reason`.

### New StatusChangeLog tables — sessions and meetings

`AcademicSession`, `Meeting`, and `AmbassadorMeeting` all carry a `status` field with meaningful transitions (SCHEDULED → RESCHEDULED → COMPLETED | CANCELLED) but had no audit trail. Three new tables added:

`AcademicSessionStatusChangeLog`, `MeetingStatusChangeLog`, `AmbassadorMeetingStatusChangeLog`.

Each carries: `id PK`, `sessionId FK` / `meetingId FK`, `fromStatus`, `toStatus`, `changedAt`, `changedByUserId FK`, `reason`. These tables support dispute resolution, no-show escalation tracing, and reschedule history.

### CalendarItem — three missing relationship lines added

`GeneralMeeting ||--o{ CalendarItem : "generates"`, `TaskItem ||--o{ CalendarItem : "generates"`, `MockItem ||--o{ CalendarItem : "generates"`. System logic §14 lists `"GENERAL_MEETING"`, `"TASK_DUE"`, and `"MOCK"` as valid `CalendarItem.entityType` values; the relationship lines were absent.

### Service → EnrolmentItem relationship lines added

`Service ||--o{ StudentEnrolmentItem : "enrolled in"` and `Service ||--o{ TeacherEnrolmentItem : "teaches"`. Both `StudentEnrolmentItem.serviceId FK` and `TeacherEnrolmentItem.serviceId FK` existed with no drawn relationship.

### CurrencyRate — `effectiveDate` added

`CurrencyRate` now carries `datetime effectiveDate`. When resolving a rate for a historical billing, the lookup is: `fromCurrency = X AND toCurrency = Y AND effectiveDate <= billingDate ORDER BY effectiveDate DESC LIMIT 1`. This ensures past invoices and paychecks always reference the rate that was in effect at the time of billing, not the current rate.

---

## 45. Schema Changes (v15)

### `version` fields standardised to `string`

All seven versioned list tables now use `string version` consistently: `SyllabusList`, `AmbassadorProgrammeContentList`, `TaskList`, `MockList`, `CourseTimelineList`, `AmbassadorTestList`, `AmbassadorProgrammeTimelineList`. The five lists added in v14 were incorrectly typed as `int version`; corrected to `string` to allow semantic versioning values (e.g. "v1", "v2.1", "2025-A").

### `PaycheckLineItem.enrolmentItemId FK` split into two nullable FKs

Same fix applied to `Claim` and `Paycheck` in v11. `PaycheckLineItem.enrolmentItemId FK` was a single FK used polymorphically against either `TeacherEnrolmentItem` or `StaffEnrolmentItem` depending on `claimantType`.

**Updated fields in `PaycheckLineItem`:**
```
BEFORE:
  cuid enrolmentItemId FK

AFTER:
  cuid teacherEnrolmentItemId FK   // nullable; set when paid to teacher
  cuid staffEnrolmentItemId FK     // nullable; set when paid to staff
  // exactly one must be non-null — enforce via check constraint
```

Relationship lines added:
- `TeacherEnrolmentItem ||--o{ PaycheckLineItem : "paid as"`
- `StaffEnrolmentItem ||--o{ PaycheckLineItem : "paid as"`

### `StudentProfile.referredBy` → `cuid referredByUserId FK`

`referredBy` was a raw `string` with no referential integrity. Replaced with `cuid referredByUserId FK` pointing to `User` (the referring user). Relationship line added: `User ||--o{ StudentProfile : "referred"`. The existing `User ||--o| StudentProfile : "has"` line is unchanged.

### `PaymentMethod ||--o{ PaymentRecord : "paid from"` added

`PaymentRecord` carries two PaymentMethod FKs: `receivingPaymentMethodId FK` (the account receiving the payment) and `payingPaymentMethodId FK` (the account the payer used). Only the receiving side had a relationship line drawn. The paying side is now represented: `PaymentMethod ||--o{ PaymentRecord : "paid from"`.

### `User ||--o{ ChecklistEntry : "assigned to"` added

`ChecklistEntry.userId FK` was present with no User relationship line. Added to the User relationship block.

### `ChapterRecordingList.syllabusChapterId` constraint marker corrected

Changed from `UK` to `FK`. The field is a foreign key to `SyllabusChapter`; the uniqueness is already conveyed by the `SyllabusChapter ||--|| ChapterRecordingList` one-to-one relationship line. Matches the convention applied to all other unique-FK fields in v12.1.

---

## 46. Schema Changes (v16)

### 1. `GeneralMeetingStatusChangeLog` added

`GeneralMeeting` carried `string status` with no audit trail. Added to match the pattern applied to `AcademicSession`, `Meeting`, and `AmbassadorMeeting` in v14.

```
GeneralMeetingStatusChangeLog {
  cuid id PK
  cuid meetingId FK
  string fromStatus
  string toStatus
  datetime changedAt
  cuid changedByUserId FK
  string reason
}
```

Relationship lines added: `GeneralMeeting ||--o{ GeneralMeetingStatusChangeLog : "history"` and `User ||--o{ GeneralMeetingStatusChangeLog : "changed by"`.

### 2. `Claim` and `AmbassadorClaim` → Paycheck cardinality corrected

- `Claim ||--|| Paycheck` → `Claim ||--o| Paycheck`
- `AmbassadorClaim ||--|| AmbassadorPaycheck` → `AmbassadorClaim ||--o| AmbassadorPaycheck`

`||--||` (mandatory both sides) implied every Claim immediately has a Paycheck. A Claim progresses through SUBMITTED → APPROVED before a Paycheck is issued — the Paycheck is optional until that point. `||--o|` (Claim has zero or one Paycheck) is correct.

### 3. `CurrencyRate` — composite unique constraint (handout only)

Mermaid ERD cannot represent composite unique constraints. The following constraint must be enforced at the database level:

```sql
UNIQUE(fromCurrency, toCurrency, effectiveDate)
```

Without this, duplicate rate rows for the same currency pair on the same date are possible, which would make the `effectiveDate <= billingDate ORDER BY effectiveDate DESC LIMIT 1` lookup non-deterministic.

### 4. `User.referralCode` and `AmbassadorProfile.referralCode UK` — both retained

Every `User` gets a `referralCode` (supporting student-refers-student referrals). Ambassadors additionally carry a `referralCode UK` on `AmbassadorProfile` — this is their programme-specific code with stricter uniqueness enforcement and is the code used in `Referral` records. The `User.referralCode` is a general-purpose code for any user type; no UK constraint is applied at the User level since uniqueness is handled by the application layer for non-ambassador codes.

### 5. `KnowledgeBankItem` — `addedByUserId FK` and `createdAt` added

```
BEFORE:
  cuid sourceTicketId FK
  bool isActive

AFTER:
  cuid sourceTicketId FK
  cuid addedByUserId FK
  datetime createdAt
  bool isActive
```

Relationship line added: `User ||--o{ KnowledgeBankItem : "added by"`. Consistent with `ContentBankItem`, `Recording`, and `MarketingPost` which all carry equivalent audit fields.

---

## 47. Schema Changes (v17)

### 1. `Announcement.createdByUserId FK` added

`Announcement` had `createdAt` but no author FK. Added `cuid createdByUserId FK` and relationship line `User ||--o{ Announcement : "created by"`. Consistent with every other content-creation entity in the schema.

### 2. `Discount.appliedByUserId FK` and `createdAt` added

`Discount` is a financial adjustment with no audit trail. Added:
- `cuid appliedByUserId FK` — who approved/applied the discount
- `datetime createdAt` — when it was applied

Relationship line added: `User ||--o{ Discount : "applied by"`. The existing `User ||--o{ Discount : "given to"` line (for `studentId`) remains.

### 3. `StudentProfile` setup flag timestamps added

Each of the four setup boolean flags now has a corresponding `At` datetime field:

```
BEFORE:
  bool gcrAssigned
  bool groupAssigned
  bool scheduleAssigned
  bool financeApprovedFlag

AFTER:
  bool gcrAssigned
  datetime gcrAssignedAt
  bool groupAssigned
  datetime groupAssignedAt
  bool scheduleAssigned
  datetime scheduleAssignedAt
  bool financeApprovedFlag
  datetime financeApprovedAt
```

The `At` fields are nullable — null means the step has not been completed yet. When a flag is set to `true`, the corresponding `At` field is set to the current timestamp at the application layer. Enables onboarding SLA tracking and reporting on setup completion times.

### 4. `RecordType.targetRole` added

`RecordType` is the lookup table for formal administrative record categories (warnings, suspensions, commendations, etc.). Previously shared across all four role record tables with no role scoping, meaning types irrelevant to a role (e.g. `SUSPENSION` for a teacher) would appear in every dropdown.

Added `string targetRole` with values: `"STUDENT"` | `"TEACHER"` | `"STAFF"` | `"AMBASSADOR"` | `"ALL"`.

- Types scoped to a specific role only show for that role's record form
- `"ALL"` types (e.g. `WARNING`, `COMMENDATION`, `NOTE`, `TERMINATION`) appear for every role
- Frontend query: `WHERE targetRole IN ('<role>', 'ALL')` when loading record type options
- Example scoping: `SUSPENSION` → `"STUDENT"`, `PROTOCOL_VIOLATION` → `"TEACHER"`, `"STAFF"`, `PROGRAMME_TERMINATION` → `"AMBASSADOR"`

No ERD relationship line change needed — `RecordType ||--o{ XRecord` lines remain correct for all four role record tables.

---

## 48. Schema Changes (v18)

### 1. `StudentProfile.cancelledAt` added

`StudentProfile` had `cancellationReason` but no corresponding timestamp. Added `datetime cancelledAt` (nullable) immediately after `cancellationReason`. Set at the application layer when `status` transitions to `"CANCELLED"`. Mirrors the pattern on `StaffProfile` which carries both `departedAt` and `departureReason`.

### 2. `Recording.uploadedByUserId FK` added

`Recording` had no author tracking. Added `cuid uploadedByUserId FK` and relationship line `User ||--o{ Recording : "uploaded by"`. Consistent with `ContentBankItem`, `MarketingPost`, `KnowledgeBankItem`, and `Announcement` which all carry equivalent author FKs.

### 3. `Notification.readAt` added

`Notification` had `bool read` with no corresponding timestamp. Added `datetime readAt` (nullable) alongside `bool read`. Set at the application layer when the notification is marked as read. Consistent with the pattern used throughout the schema where every boolean state change has a corresponding `At` datetime.

### 4. `TextFormat.dateAdded` changed from `date` to `datetime`

`date` has no time component — adding two text formats on the same day would produce ambiguous ordering. Changed to `datetime` for consistency with every other timestamp field in the schema.

---

## 49. Schema Changes (v19)

### 1. `Lead.source` → `cuid outreachSourceId FK`

`Lead.source` was a free `string` while `Candidate.outreachSourceId FK` used the `OutreachSource` lookup table. When a Lead converts to a Candidate via `handoffTicketId`, source attribution was jumping from an unstructured string to a FK — inconsistent reporting. `Lead.source` replaced with `cuid outreachSourceId FK`. Relationship line added: `OutreachSource ||--o{ Lead : "sources"`.

### 2. `ReferralClick` conversion timestamps added

`convertedToEnquiry` and `convertedToEnrolment` were boolean flags with no corresponding timestamps. Added:
- `datetime convertedToEnquiryAt` (nullable) — set when the click converts to an enquiry
- `datetime convertedToEnrolmentAt` (nullable) — set when the click converts to an enrolment

Required for referral attribution analytics: time-to-conversion, cohort analysis, and ambassador performance measurement.

### 3. `Candidate.createdAt` added

`Candidate` had no creation timestamp. Added `datetime createdAt` to enable pipeline velocity measurement, time-to-hire tracking, and sourcing lag analysis.

### 4. `AmbassadorPaycheck.netAmount` added

`Paycheck` carries `subtotal → deductionsApplied → netAmount → dueAmount`. `AmbassadorPaycheck` had `subtotal` and `dueAmount` but was missing `netAmount`. Added `float netAmount` between `subtotal` and `dueAmount`. For ambassadors with no deductions, `netAmount = subtotal`; the field is set at the application layer when the paycheck is generated, consistent with how `Paycheck.netAmount` is handled.

---

## 50. Schema Changes (v20)

### 1. `AccessLog` revoke symmetry added

`AccessLog` had `dateGranted` and a `revoked` boolean, but no record of when or by whom access was revoked. Added:
- `datetime revokedAt` (nullable) — when access was revoked
- `cuid revokedByUserId FK` (nullable) — who revoked it

Relationship line added: `User ||--o{ AccessLog : "revoked by"`. The existing `User ||--o{ AccessLog : "owns"` line (for `staffId`) remains. This completes the grant/revoke audit trail for a security-sensitive table.

### 2. `MarketingPost.createdByUserId FK` added

`MarketingPost` was the last content-type entity without an author FK. Added `cuid createdByUserId FK` and relationship line `User ||--o{ MarketingPost : "created by"`. Consistent with `ContentBankItem`, `Recording`, `KnowledgeBankItem`, and `Announcement`.

### 3. `AccessLog.credential` — security note (no schema change)

**`AccessLog.credential` must NOT store raw credentials, secrets, passwords, or API keys.** Storing plaintext or reversibly-encrypted credentials in an application database is a serious security risk — a database breach would expose every stored credential.

The `credential` field is intended only as a non-sensitive reference label — e.g. the username, account identifier, or a description of what access was granted ("Admin login for Zoom", "Read-only Drive folder X"). It must never hold the actual secret.

Actual secrets should be managed by a dedicated secrets manager (e.g. environment-level vault, cloud secrets service) and never written to `AccessLog`. If a credential value genuinely must be referenced, store only an opaque pointer/ID to the secrets manager entry, not the secret itself.

This should be enforced at the application layer (validation on write) and surfaced as a constraint in the admin UI so staff cannot accidentally paste a real secret into the field.

---

## 51. Schema Changes (v21)

### 1. `Booklets` renamed to `Booklet`

Entity names are singular throughout the schema (one row = one entity). `Booklets` was the only plural. Renamed to `Booklet`; relationship line updated to `Service ||--o{ Booklet : "has"`.

### 2. Three new lookup tables — Department, StaffRole, UserType

Previously `dept` and `role` were free-text strings scattered across many entities, allowing inconsistent values ("Finance" / "finance" / "FINANCE"). Three lookup tables added, each `{ id PK, name UK, isActive }`:

**`Department`** — replaces every `string dept` field (13 entities): `StaffProfile`, `StaffService`, `Meeting`, `GeneralMeeting`, `Claim`, `DeptBudget`, `ContentGroup`, `ContentBankItem`, `KnowledgeBankList`, `BacklogItem`, `MeetingBacklogItem`, `JobPosting`, `PortalPermission`. Each `dept` → `cuid deptId FK`, with a `Department ||--o{ X` relationship line.

**`StaffRole`** — job roles (e.g. MANAGER, COORDINATOR, LEAD). Replaces `string role` on `StaffProfile`, `Candidate`, `JobPosting`, `PortalPermission`. Each → `cuid staffRoleId FK`. Note: `StaffProfile.roleTitle` (free-text display title, e.g. "Senior Physics Lead") is retained and is distinct from `staffRoleId` (the role category).

**`UserType`** — the user category (STUDENT / TEACHER / STAFF / AMBASSADOR / PARENT / ALL). This is the *user type* (which profile a User has), distinct from `StaffRole` (a staff job role). Replaces the string `targetRole` / `candidateType` fields:
- `RecordType.targetRole` → `cuid targetUserTypeId FK`
- `RegistrationForm.targetRole` → `cuid targetUserTypeId FK`
- `ChecklistTemplate.targetRole` → `cuid targetUserTypeId FK`
- `Candidate.candidateType` → `cuid candidateUserTypeId FK`

`dept` and `isSupervisor` on `StaffProfile` remain separate fields — `dept` (now `deptId FK`) is the department, `isSupervisor` is an independent boolean, neither overlapping with `staffRoleId`.

### 3. Junction table uniqueness constraints (handout only)

Mermaid ERD cannot express composite unique constraints. The following junction / link tables use a surrogate `cuid id PK` with two FKs and must enforce a composite `UNIQUE` constraint at the database level to prevent duplicate pairs:

- `TaskAssignment` — `UNIQUE(taskItemId, studentId)`
- `ContentGroupItem` — `UNIQUE(contentGroupId, contentBankItemId)`
- `ChecklistItemEntry` — `UNIQUE(checklistEntryId, templateItemId)`
- `MeetingSprintItem` — `UNIQUE(sprintListId, backlogItemId)`
- `ChapterRecordingItem` — `UNIQUE(chapterRecordingListId, recordingId)`

Without these, the same pair can be inserted more than once (e.g. the same student assigned the same task twice). Enforce at the DB layer via a composite unique index.

---

## 52. UJM Alignment Changes (v22)

This section closes gaps between the User Journey Map (UJM-v3.0) dept functions and the schema. Items are addressed structurally where a data home was missing; some are satisfied by existing generic structures plus documentation.

### 1. Recurring staff meetings (townhall / workshop / dept-internal) — routed through the schedule chain

No new entity. Recurring staff meetings use the same pattern as classes:
`StaffService → StaffServiceSchedule → StaffScheduleOccurrence → Meeting`, classified by `SessionType`.

- Cadence (bimonthly townhall, weekly dept-internal, bimonthly teacher-training workshop) is expressed in `StaffScheduleOccurrence.recurrenceType` — never hardcoded.
- Classification is via `SessionType`. Seed `SessionType` with values including `DEPT_INTERNAL`, `WORKSHOP`, `TOWNHALL`, `TEACHER_TRAINING` (in addition to existing class/meeting types).
- "Did each dept hold its 2 weekly internals?" becomes a query: count `Meeting` rows with the relevant `SessionType` + `deptId` in the period vs the expected occurrences.
- A missed meeting is the same shape as a missed class: a `StaffScheduleOccurrence` with no completed `Meeting`.

### 2. Marketing posting cadence — schedule → slot → post pattern (mirrors class scheduling)

The "story every other day, 1 reel + 1 post/week, missed post → auto PR ticket" rule is modelled the same way classes are, rather than hardcoded. Three additions:

```
MarketingSchedule {
  cuid id PK
  string name
  bool isActive
}

MarketingScheduleOccurrence {
  cuid id PK
  cuid scheduleId FK
  cuid postTypeId FK
  string recurrenceType        // DAILY | EVERY_OTHER_DAY | WEEKLY | ...
  string dayOfWeek
  int dayOfMonth
  string monthOfYear
  datetime oneOffDate
  string customPattern
  int quotaPerPeriod           // e.g. 1 reel/week → quota 1
  string status
  datetime activatedAt / pausedAt / deactivatedAt
  bool isActive
}

MarketingPostSlot {
  cuid id PK
  cuid occurrenceId FK
  cuid postTypeId FK
  datetime dueDate
  string status                // PENDING | FULFILLED | MISSED
  cuid missedTicketId FK       // nullable; set when a missed-post ticket is raised
  bool isActive
}
```

- `MarketingPost` now carries `cuid slotId FK` (nullable — ad-hoc posts need not fulfil a slot).
- Relationship `MarketingPostSlot ||--o| MarketingPost : "fulfilled by"`.
- **Missed-post rule (queryable, not hardcoded):** a slot where `dueDate < now AND status != FULFILLED AND no linked MarketingPost`. When detected, the app raises a PR/Ops ticket and stores its id in `MarketingPostSlot.missedTicketId` (`Ticket ||--o| MarketingPostSlot : "flags missed"`).
- Symmetrical with a missed class (a `ScheduleOccurrence` with no completed `AcademicSession`).

### 3. Ambassador deliverables — deliberately not modelled

Decision: out of scope for now. `AmbassadorTestItem` / `AmbassadorTestResult` already cover graded tests if needed.

### 4. Ambassador allowance — polymorphic claim line items

Clarified semantics:
- **Commission** depends on *who the ambassador referred* — keyed to the referred student's enrolment (`studentEnrolmentItemId`). Already modelled.
- **Allowance** depends on *what service the ambassador themselves enrolled in* — the rate on `AmbassadorService`, via the ambassador's own `AmbassadorEnrolmentItem`. This mirrors how teacher pay flows from `TeacherEnrolmentItem → service rate`.

`AmbassadorClaimLineItem` is now polymorphic by `lineType`, exactly like `InvoiceLineItem` and `PaycheckLineItem`:

```
AmbassadorClaimLineItem {
  cuid id PK
  cuid claimId FK
  string lineType                    // "COMMISSION" | "ALLOWANCE"
  cuid commissionItemId FK           // set for COMMISSION lines
  cuid studentEnrolmentItemId FK     // set for COMMISSION lines (the referred student)
  cuid ambassadorEnrolmentItemId FK  // set for ALLOWANCE lines (ambassador's own service)
  float studentHoursLogged
  float studentAmountPaid
  float commissionPct
  float lineTotal
  string currency
}
```

- COMMISSION line: valued from `commissionPct × studentAmountPaid`, keyed to `commissionItemId` + `studentEnrolmentItemId`.
- ALLOWANCE line: valued from the `AmbassadorService.rate` for the ambassador's `ambassadorEnrolmentItemId`.
- Relationship added: `AmbassadorEnrolmentItem ||--o{ AmbassadorClaimLineItem : "allowance via"`.
- A single `AmbassadorClaim` can now contain both commission and allowance lines for the month; `AmbassadorPaycheck` pays the total.

### 5. Staff performance metrics — extend MetricSnapshot (no new table)

`MetricSnapshot` is already generic (`entityType`, `entityId`, `month`, `metrics(json)`, `snapshotAt`). It now also covers staff and dept metrics:

- `entityType = "STAFF"` with `entityId = userId` — one snapshot per staff member per month.
- The six UJM KPI categories (productivity, attendance, financial, activity, workload, quality) are computed application-side each month and stored in the `metrics` json blob.
- **Grain:** per-staff only. Dept-level metrics are aggregated on the fly from the staff snapshots in a department (no stored dept rows), keeping the data normalized.
- Tradeoff (documented in §normalisation review): the json blob is not SQL-queryable, so "rank all staff by productivity" is computed in the application layer, not via SQL. Accepted for flexibility — KPI categories can change without migration.
- No schema change required.

---

## 53. Required Seed Data (build prerequisites)

These lookup-table rows are **assumed by the schema and application logic** and must be seeded at build time, before the system can function. Values can be edited/extended later via the admin panel, but the marked rows below are hard dependencies referenced elsewhere in this handout.

### UserType — **must include `ALL`**
`STUDENT`, `TEACHER`, `STAFF`, `AMBASSADOR`, `PARENT`, `ALL`.
- `ALL` is a hard dependency: `RecordType`, `RegistrationForm`, and `ChecklistTemplate` scope to a `UserType`, and shared types (e.g. `WARNING`, `COMMENDATION`, `NOTE`, `TERMINATION`) point at `ALL` so they appear for every role. Without an `ALL` row these references break.

### SessionType — **must include staff-meeting classifications**
Existing class/meeting types, **plus**: `DEPT_INTERNAL`, `WORKSHOP`, `TOWNHALL`, `TEACHER_TRAINING`, and `TRIAL`.
- Required because recurring staff meetings route through `StaffService → StaffServiceSchedule → StaffScheduleOccurrence → Meeting` and are distinguished only by `SessionType` (see §52.1). The "2 weekly dept-internal meetings" and "bimonthly townhall/workshop" cadence reporting depends on these values existing.
- `TRIAL` is referenced by the `isTrial` derivation on `AcademicSession` / `Meeting` / `AmbassadorMeeting`.

### Department
Seed the real departments: `PR_OPS`, `HR`, `FINANCE`, `MARKETING`, `IT`, `MANAGEMENT` (adjust to actual naming).
- Every `deptId FK` across 13 entities depends on these rows.

### StaffRole
Seed the actual job roles: e.g. `TEACHER`, `TA`, `SM` (social media), `HR`, `ACCOUNTS`, `IT`, `MANAGER`, `COORDINATOR`.
- Referenced by `StaffProfile`, `Candidate`, `JobPosting`, `PortalPermission`.

### RecordType — with `targetUserTypeId` set per row
e.g. `WARNING`→ALL, `COMMENDATION`→ALL, `NOTE`→ALL, `TERMINATION`→ALL, `SUSPENSION`→STUDENT, `PROTOCOL_VIOLATION`→TEACHER/STAFF.
- Each row must point at a valid `UserType` (including the `ALL` row above).

### Other lookups (no special hard dependency — seed as needed)
`TaskType`, `MockType`, `AmbassadorTestType`, `PaymentMethodType`, `TicketType`, `NotificationType`, `FlagType`, `OutreachSource`, `OutreachType`, `ExhibitionType`, `ContentType`, `SocialPlatformType`, `SocialPostType`, `CampaignTag`. These are staff-managed classification tables; seed with initial values but no row is structurally required for the system to boot.

---

## 54. Schema Changes (v23) — Ambassador Claim Totals + Marketing Schedule Polish

### Decision on commission model (no restructure)

Considered re-modelling commission as a computed-at-claim-time service, but **rejected** — it would discard the durable commission lifecycle this handout (§9) deliberately specifies: one `AmbassadorCommissionItem` per referred student, with `ACTIVE`/`PAUSED`/`INACTIVE` status that auto-inactivates when the student cancels and auto-resumes on re-enrolment, plus the per-item rate-change log. The `AmbassadorCommissionItem` / `AmbassadorCommissionList` / their two change logs are **retained as-is**. Symmetry with allowance is achieved at the claim-line level (polymorphic `lineType`), not by collapsing the commission structure.

### 1. `AmbassadorClaim` — neutral totals

Commission-specific totals replaced so a claim can hold both commission and allowance lines:

```
BEFORE:
  float totalStudentAmountPaid
  float commissionAmount

AFTER:
  float subtotal       // sum of all line totals (commission + allowance)
  float netAmount      // subtotal after any adjustments
  float dueAmount      // outstanding
```

This aligns `AmbassadorClaim` with the `subtotal → netAmount → dueAmount` shape used by `StudentInvoice` and `Paycheck`. (Teacher/staff `Claim` left unchanged per scope decision.)

`commissionListId FK` is now **nullable** — an allowance-only claim (ambassador made zero referrals but is owed their service allowance) has no commission list. Generating links:
- `AmbassadorCommissionList ||--o{ AmbassadorClaim` (commission-driven claims)
- `AmbassadorEnrolmentList ||--o{ AmbassadorClaim` (allowance-driven / combined claims)

### Allowance line valuation — `rateSnapshot` added to `AmbassadorClaimLineItem`

```
float rateSnapshot   // captures AmbassadorService.rate at claim time, for ALLOWANCE lines
```

- COMMISSION line: valued from `commissionPct × studentAmountPaid` (existing fields).
- ALLOWANCE line: valued from `rateSnapshot` (the ambassador's `AmbassadorService.rate` at claim time), keyed to `ambassadorEnrolmentItemId`.
- Commission-specific fields (`studentHoursLogged`, `studentAmountPaid`, `commissionPct`) are nullable on allowance lines; `rateSnapshot` is null on commission lines.

### 3. `MarketingScheduleOccurrenceStatusChangeLog` added

`MarketingScheduleOccurrence` has `status` + `activatedAt`/`pausedAt`/`deactivatedAt` but lacked the status-change log every other occurrence type has. Added, with `User ||--o{ MarketingScheduleOccurrenceStatusChangeLog : "changed by"`.

### 4. `MarketingSchedule` — owner and department

`MarketingSchedule` was a free-floating table. Added:
- `cuid deptId FK` — scopes the cadence to a department (`Department ||--o{ MarketingSchedule`)
- `cuid createdByUserId FK` — who defined it (`User ||--o{ MarketingSchedule`)

### 5. `MarketingPostSlot.postTypeId` removed (deduplication)

The slot inherited its post type from `MarketingScheduleOccurrence.postTypeId`. Storing it again on the slot was a transitive dependency. Removed; resolve post type via `slot → occurrence → postTypeId`.
