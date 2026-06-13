```mermaid
erDiagram

  %% ─── USERS & PROFILES ───────────────────────────────────────────

  User ||--o| StudentProfile : "has"
  User ||--o{ StudentProfile : "referred"
  User ||--o| TeacherProfile : "has"
  User ||--o| StaffProfile : "has"
  User ||--o| ParentProfile : "has"
  User ||--o| AmbassadorProfile : "has"
  User ||--o{ BankAccount : "owns"
  User ||--o{ Ticket : "creates"
  User ||--o{ Ticket : "assigned"
  User ||--o{ TicketMessage : "sends"
  User ||--o{ TicketHistory : "acts"
  User ||--o{ MeetingParticipant : "attends"
  User ||--o{ ContentBankItem : "adds"
  User ||--o{ SiteLog : "logged"
  User ||--o{ PaymentMethod : "owns"
  User ||--o{ PaymentRecord : "pays"
  User ||--o{ StudentFlag : "flagged"
  User ||--o{ Candidate : "becomes"
  %% ── actor / audit FKs ──
  User ||--o{ RateItemStatusChangeLog : "changed by"
  User ||--o{ RateChangeLog : "changed by"
  User ||--o{ StudentEnrolmentItemStatusChangeLog : "changed by"
  User ||--o{ TeacherEnrolmentItemStatusChangeLog : "changed by"
  User ||--o{ StaffEnrolmentItemStatusChangeLog : "changed by"
  User ||--o{ AmbassadorEnrolmentItemStatusChangeLog : "changed by"
  User ||--o{ AmbassadorCommissionItemStatusChangeLog : "changed by"
  User ||--o{ AmbassadorCommissionRateChangeLog : "changed by"
  User ||--o{ ScheduleOccurrenceStatusChangeLog : "changed by"
  User ||--o{ StaffScheduleOccurrenceStatusChangeLog : "changed by"
  User ||--o{ AmbassadorScheduleOccurrenceStatusChangeLog : "changed by"
  User ||--o{ ScheduleChangeRequest : "requested by"
  User ||--o{ StaffScheduleChangeRequest : "requested by"
  User ||--o{ AmbassadorScheduleChangeRequest : "requested by"
  User ||--o{ AcademicSession : "scheduled by"
  User ||--o{ Meeting : "scheduled by"
  User ||--o{ AmbassadorMeeting : "scheduled by"
  User ||--o{ StudentInvoiceStatusChangeLog : "changed by"
  User ||--o{ ClaimStatusChangeLog : "changed by"
  User ||--o{ PaycheckStatusChangeLog : "changed by"
  User ||--o{ AmbassadorClaimStatusChangeLog : "changed by"
  User ||--o{ AmbassadorPaycheckStatusChangeLog : "changed by"
  User ||--o{ SyllabusListStatusChangeLog : "changed by"
  User ||--o{ AmbassadorProgrammeContentListStatusChangeLog : "changed by"
  %% ── new v14 status change logs ──
  User ||--o{ TaskListStatusChangeLog : "changed by"
  User ||--o{ MockListStatusChangeLog : "changed by"
  User ||--o{ CourseTimelineListStatusChangeLog : "changed by"
  User ||--o{ AmbassadorTestListStatusChangeLog : "changed by"
  User ||--o{ AmbassadorProgrammeTimelineListStatusChangeLog : "changed by"
  User ||--o{ AcademicSessionStatusChangeLog : "changed by"
  User ||--o{ MeetingStatusChangeLog : "changed by"
  User ||--o{ AmbassadorMeetingStatusChangeLog : "changed by"
  User ||--o{ GeneralMeetingStatusChangeLog : "changed by"
  User ||--o{ MarketingScheduleOccurrenceStatusChangeLog : "changed by"
  User ||--o{ Doubt : "answers"
  User ||--o{ BacklogItemChangeLog : "changed by"
  User ||--o{ Claim : "submits"
  User ||--o{ Paycheck : "receives"
  User ||--o{ AmbassadorClaim : "submits"
  User ||--o{ AmbassadorPaycheck : "receives"
  %% ── denorm student / ambassador IDs ──
  User ||--o{ StudentEnrolmentItem : "enrolled"
  User ||--o{ TeacherEnrolmentItem : "teaches"
  User ||--o{ AmbassadorEnrolmentItem : "enrolled"
  User ||--o{ StudentInvoice : "billed"
  User ||--o{ SessionAttendance : "attends"
  User ||--o{ MeetingAttendance : "attends"
  User ||--o{ AmbassadorMeetingAttendance : "attends"
  User ||--o{ TaskAssignment : "assigned to"
  User ||--o{ TaskSubmission : "submitted by"
  User ||--o{ MockResult : "achieved by"
  User ||--o{ Discount : "given to"
  User ||--o{ Discount : "applied by"
  User ||--o{ StudentSyllabusProgress : "tracks"
  User ||--o{ AmbassadorProgrammeProgress : "tracks"
  User ||--o{ AmbassadorTestResult : "achieved by"
  User ||--o{ ChecklistEntry : "assigned to"

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

  StudentProfile {
    cuid id PK
    cuid userId FK
    string status
    string mainCurrency
    string timeZone
    string notes
    cuid referredByUserId FK
    string timesheetURL
    string scheduleURL
    string progressTrackerURL
    bool gcrAssigned
    datetime gcrAssignedAt
    bool groupAssigned
    datetime groupAssignedAt
    bool scheduleAssigned
    datetime scheduleAssignedAt
    bool financeApprovedFlag
    datetime financeApprovedAt
    datetime registrationDate
    string cancellationReason
    datetime cancelledAt
  }

  TeacherProfile {
    cuid id PK
    cuid userId FK
    string teachingProfileUrl
    bool idDocProvided
    bool salaryAccountProvided
  }

  StaffProfile {
    cuid id PK
    cuid userId FK
    string status
    string roleTitle
    string salaryType
    float salaryRate
    cuid staffRoleId FK
    cuid deptId FK
    bool isSupervisor
    datetime registrationDate
    datetime departedAt
    string departureReason
  }

  AmbassadorProfile {
    cuid id PK
    cuid userId FK
    string cohort
    string referralCode UK
    string programmeDuration
    datetime programmeStart
    datetime programmeEnd
    string completionStatus
    string certificateLink
    string linkedInBadgeLink
  }

  ParentProfile ||--o{ StudentProfile : "linked to"

  ParentProfile {
    cuid id PK
    cuid userId FK
    cuid linkedStudentId FK
    string phone
    string address
  }

  %% ─── PRE-HIRE PIPELINE ───────────────────────────────────────────

  Candidate {
    cuid id PK
    string email UK
    string name
    cuid candidateUserTypeId FK
    cuid staffRoleId FK
    string status
    string cvLink
    string docsLink
    string notes
    cuid outreachSourceId FK
    string outreachStatus
    string trialTaskLink
    datetime interviewAt
    cuid jobPostingId FK
    string offerLetterLink
    string rejectionReason
    cuid convertedToUserId FK
    bool isActive
    datetime createdAt
  }

  %% ─── SESSION TYPES ───────────────────────────────────────────────

  SessionType {
    cuid id PK
    string name
    bool isActive
  }

  %% ─── GROUPS & SERVICES ───────────────────────────────────────────

  Group ||--o{ Service : "hosts"
  Group ||--o{ AcademicSession : "runs"
  Service ||--|| ServiceSchedule : "has"
  Service ||--|| RateList : "has"
  Service ||--|| CurriculumList : "has"
  Service ||--o{ AcademicSession : "covers"
  Service ||--o{ StudentEnrolmentItem : "enrolled in"
  Service ||--o{ TeacherEnrolmentItem : "teaches"
  Service ||--o{ ClaimLineItem : "claimed via"
  Service ||--o{ Recording : "has"
  Service ||--o{ SessionAttendance : "tracks"
  Service ||--o{ Booklet : "has"
  Service ||--|| GcrList : "has"
  GcrList ||--o{ GcrItem : "has"

  Group {
    cuid id PK
    string code UK
    string groupCategory
    string status
    bool isActive
  }

  Service {
    cuid id PK
    cuid groupId FK
    cuid teacherId FK
    string board
    string courseLevel
    string subjectCode
    string subjectName
    string serviceType
    bool isHourly
    string teacherIdSnapshot
    %% gcrLink replaced by GcrList / GcrItem
    bool isActive
  }

  Booklet {
    cuid id PK
    cuid serviceId FK
    string label
    string url
    bool isActive
  }

  GcrList {
    cuid id PK
    cuid serviceId FK
  }

  GcrItem {
    cuid id PK
    cuid gcrListId FK
    string label
    string url UK
  }

  %% ─── RATE SYSTEM ─────────────────────────────────────────────────

  RateList ||--o{ RateItem : "has"
  RateItem ||--o{ RateItemStatusChangeLog : "history"
  RateItem ||--o{ RateChangeLog : "changes"

  RateList {
    cuid id PK
    cuid serviceId UK
    bool isActive
  }

  RateItem {
    cuid id PK
    cuid rateListId FK
    string country
    string currency
    float clientRate
    float staffRate
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  RateItemStatusChangeLog {
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

  %% ─── STUDENT ENROLMENT ───────────────────────────────────────────

  User ||--o{ StudentEnrolmentList : "has"
  StudentEnrolmentList ||--o{ StudentEnrolmentItem : "contains"
  StudentEnrolmentList ||--o{ StudentInvoice : "generates"
  StudentEnrolmentItem ||--o{ Discount : "has"
  StudentEnrolmentItem ||--o{ SessionAttendance : "tracks"
  StudentEnrolmentItem ||--o{ InvoiceLineItem : "billed via"
  StudentEnrolmentItem ||--o{ StudentEnrolmentItemStatusChangeLog : "history"

  StudentEnrolmentList {
    cuid id PK
    cuid studentId FK
    string serviceType
    bool isActive
  }

  StudentEnrolmentItem {
    cuid id PK
    cuid enrolmentListId FK
    cuid studentId FK
    cuid serviceId FK
    string status
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

  StudentEnrolmentItemStatusChangeLog {
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
    cuid appliedByUserId FK
    datetime createdAt
    bool isActive
  }

  %% ─── TEACHER ENROLMENT ───────────────────────────────────────────

  User ||--o{ TeacherEnrolmentList : "has"
  TeacherEnrolmentList ||--o{ TeacherEnrolmentItem : "contains"
  TeacherEnrolmentList ||--o{ Claim : "generates"
  TeacherEnrolmentList ||--o{ Paycheck : "generates"
  TeacherEnrolmentItem ||--o{ TeacherEnrolmentItemStatusChangeLog : "history"

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
    string status
    bool trialRequired
    datetime startDate
    datetime endDate
    datetime activatedAt
    datetime cancelledAt
    datetime completedAt
    string cancellationReason
    bool isActive
  }

  TeacherEnrolmentItemStatusChangeLog {
    cuid id PK
    cuid enrolmentItemId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  %% ─── STAFF ENROLMENT ─────────────────────────────────────────────

  User ||--o{ StaffEnrolmentList : "has"
  StaffEnrolmentList ||--o{ StaffEnrolmentItem : "contains"
  StaffEnrolmentList ||--o{ Claim : "generates"
  StaffEnrolmentList ||--o{ Paycheck : "generates"
  StaffEnrolmentItem ||--o{ StaffEnrolmentItemStatusChangeLog : "history"
  StaffEnrolmentItem ||--o{ MeetingAttendance : "tracks"

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
    string status
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

  StaffEnrolmentItemStatusChangeLog {
    cuid id PK
    cuid enrolmentItemId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  %% ─── AMBASSADOR ENROLMENT & COMMISSION ──────────────────────────

  User ||--o{ AmbassadorEnrolmentList : "has"
  AmbassadorEnrolmentList ||--o{ AmbassadorEnrolmentItem : "contains"
  AmbassadorEnrolmentItem ||--o{ AmbassadorEnrolmentItemStatusChangeLog : "history"
  AmbassadorEnrolmentItem ||--o{ AmbassadorMeetingAttendance : "tracks"
  User ||--o{ AmbassadorCommissionList : "has"
  AmbassadorCommissionList ||--o{ AmbassadorCommissionItem : "contains"
  AmbassadorCommissionItem ||--o{ AmbassadorCommissionItemStatusChangeLog : "history"
  AmbassadorCommissionItem ||--o{ AmbassadorCommissionRateChangeLog : "changes"
  StudentEnrolmentItem ||--o{ AmbassadorCommissionItem : "tracked by"

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
    string status
    bool trialRequired
    datetime startDate
    datetime endDate
    datetime activatedAt
    datetime cancelledAt
    datetime completedAt
    string cancellationReason
    bool isActive
  }

  AmbassadorEnrolmentItemStatusChangeLog {
    cuid id PK
    cuid enrolmentItemId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  AmbassadorCommissionList {
    cuid id PK
    cuid ambassadorId FK
    bool isActive
  }

  AmbassadorCommissionItem {
    cuid id PK
    cuid commissionListId FK
    cuid studentEnrolmentItemId FK
    float commissionPct
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  AmbassadorCommissionItemStatusChangeLog {
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

  %% ─── SCHEDULES (STUDENT) ─────────────────────────────────────────

  ServiceSchedule ||--o{ ScheduleOccurrence : "has"
  ServiceSchedule ||--o{ AcademicSession : "generates"
  ServiceSchedule ||--o{ ScheduleChangeRequest : "has"
  ScheduleOccurrence ||--o{ AcademicSession : "generates"
  ScheduleOccurrence ||--o{ ScheduleOccurrenceStatusChangeLog : "history"
  ScheduleOccurrence ||--o{ ScheduleChangeRequest : "has"
  SessionType ||--o{ ScheduleOccurrence : "types"
  SessionType ||--o{ AcademicSession : "types"
  SessionType ||--o{ ScheduleChangeRequest : "types"

  ServiceSchedule {
    cuid id PK
    cuid serviceId UK
    bool isActive
  }

  ScheduleOccurrence {
    cuid id PK
    cuid scheduleId FK
    cuid sessionTypeId FK
    string recurrenceType
    string dayOfWeek
    int dayOfMonth
    string monthOfYear
    datetime oneOffDate
    string customPattern
    datetime startTime
    datetime endTime
    float durationHours
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  ScheduleOccurrenceStatusChangeLog {
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
    string requestType
    string recurrenceType
    string proposedDayOfWeek
    datetime proposedStartTime
    datetime proposedEndTime
    float proposedDuration
    cuid proposedSessionTypeId FK
    string status
    string rejectionReason
    datetime resolvedAt
    cuid resolvedByUserId FK
  }

  %% ─── SCHEDULES (STAFF) ───────────────────────────────────────────

  StaffServiceSchedule ||--o{ StaffScheduleOccurrence : "has"
  StaffServiceSchedule ||--o{ Meeting : "generates"
  StaffServiceSchedule ||--o{ StaffScheduleChangeRequest : "has"
  StaffScheduleOccurrence ||--o{ Meeting : "generates"
  StaffScheduleOccurrence ||--o{ StaffScheduleOccurrenceStatusChangeLog : "history"
  StaffScheduleOccurrence ||--o{ StaffScheduleChangeRequest : "has"
  SessionType ||--o{ StaffScheduleOccurrence : "types"
  SessionType ||--o{ Meeting : "types"
  SessionType ||--o{ StaffScheduleChangeRequest : "types"

  StaffServiceSchedule {
    cuid id PK
    cuid staffServiceId UK
    bool isActive
  }

  StaffScheduleOccurrence {
    cuid id PK
    cuid scheduleId FK
    cuid sessionTypeId FK
    string recurrenceType
    string dayOfWeek
    int dayOfMonth
    string monthOfYear
    datetime oneOffDate
    string customPattern
    datetime startTime
    datetime endTime
    float durationHours
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  StaffScheduleOccurrenceStatusChangeLog {
    cuid id PK
    cuid occurrenceId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  StaffScheduleChangeRequest {
    cuid id PK
    cuid scheduleId FK
    cuid occurrenceId FK
    cuid requestedByUserId FK
    string requestType
    string recurrenceType
    string proposedDayOfWeek
    datetime proposedStartTime
    datetime proposedEndTime
    float proposedDuration
    cuid proposedSessionTypeId FK
    string status
    string rejectionReason
    datetime resolvedAt
    cuid resolvedByUserId FK
  }

  %% ─── SCHEDULES (AMBASSADOR) ──────────────────────────────────────

  AmbassadorServiceSchedule ||--o{ AmbassadorScheduleOccurrence : "has"
  AmbassadorServiceSchedule ||--o{ AmbassadorMeeting : "generates"
  AmbassadorServiceSchedule ||--o{ AmbassadorScheduleChangeRequest : "has"
  AmbassadorScheduleOccurrence ||--o{ AmbassadorMeeting : "generates"
  AmbassadorScheduleOccurrence ||--o{ AmbassadorScheduleOccurrenceStatusChangeLog : "history"
  AmbassadorScheduleOccurrence ||--o{ AmbassadorScheduleChangeRequest : "has"
  SessionType ||--o{ AmbassadorScheduleOccurrence : "types"
  SessionType ||--o{ AmbassadorMeeting : "types"
  SessionType ||--o{ AmbassadorScheduleChangeRequest : "types"

  AmbassadorServiceSchedule {
    cuid id PK
    cuid ambassadorServiceId UK
    bool isActive
  }

  AmbassadorScheduleOccurrence {
    cuid id PK
    cuid scheduleId FK
    cuid sessionTypeId FK
    string recurrenceType
    string dayOfWeek
    int dayOfMonth
    string monthOfYear
    datetime oneOffDate
    string customPattern
    datetime startTime
    datetime endTime
    float durationHours
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  AmbassadorScheduleOccurrenceStatusChangeLog {
    cuid id PK
    cuid occurrenceId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  AmbassadorScheduleChangeRequest {
    cuid id PK
    cuid scheduleId FK
    cuid occurrenceId FK
    cuid requestedByUserId FK
    string requestType
    string recurrenceType
    string proposedDayOfWeek
    datetime proposedStartTime
    datetime proposedEndTime
    float proposedDuration
    cuid proposedSessionTypeId FK
    string status
    string rejectionReason
    datetime resolvedAt
    cuid resolvedByUserId FK
  }

  %% ─── ACADEMIC SESSIONS ───────────────────────────────────────────

  AcademicSession ||--o{ SessionAttendance : "records"
  AcademicSession ||--o{ AcademicSessionStatusChangeLog : "history"

  AcademicSessionStatusChangeLog {
    cuid id PK
    cuid sessionId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  AcademicSession ||--o{ InvoiceLineItem : "billed as"
  AcademicSession ||--o{ ClaimLineItem : "claimed as"
  AcademicSession ||--o{ PaycheckLineItem : "paid as"
  AcademicSession ||--o{ Recording : "recorded as"
  AcademicSession ||--o{ TaskItem : "has tasks"
  AcademicSession ||--o{ MockItem : "has mocks"
  AcademicSession ||--o{ CalendarItem : "generates"

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
    string wbLink
    string wbName
    string timesheetSubmissionStatus
    datetime submissionDeadline
    bool submissionOverdue
  }

  SessionAttendance {
    cuid id PK
    cuid sessionId FK
    cuid serviceId FK
    cuid studentId FK
    cuid enrolmentItemId FK
    string status
    float teacherLoggedHours
    float studentLoggedHours
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

  %% ─── STAFF MEETINGS ──────────────────────────────────────────────

  Meeting ||--o{ MeetingAttendance : "records"
  Meeting ||--o{ MeetingStatusChangeLog : "history"

  MeetingStatusChangeLog {
    cuid id PK
    cuid meetingId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  Meeting ||--o{ PaycheckLineItem : "paid as"
  Meeting ||--o{ CalendarItem : "generates"
  Meeting ||--o{ Recording : "recorded as"

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
    cuid deptId FK
    bool isActive
  }

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

  %% ─── AMBASSADOR MEETINGS ─────────────────────────────────────────

  AmbassadorMeeting ||--o{ AmbassadorMeetingAttendance : "records"
  AmbassadorMeeting ||--o{ AmbassadorMeetingStatusChangeLog : "history"

  AmbassadorMeetingStatusChangeLog {
    cuid id PK
    cuid meetingId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  AmbassadorMeeting ||--o{ AmbassadorTestItem : "has tests"
  AmbassadorMeeting ||--o{ CalendarItem : "generates"
  GeneralMeeting ||--o{ CalendarItem : "generates"
  TaskItem ||--o{ CalendarItem : "generates"
  MockItem ||--o{ CalendarItem : "generates"

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

  %% ─── CALENDAR ────────────────────────────────────────────────────

  CalendarItem {
    cuid id PK
    string entityType
    cuid entityId
    cuid userId FK
    datetime startTime
    datetime endTime
    string title
    string colour
    string status
    bool addedToGCal
    datetime gCalSyncedAt
    string gCalEventId
  }

  %% ─── CURRICULUM (STUDENT) ────────────────────────────────────────

  CurriculumList ||--o{ SyllabusList : "has"
  CurriculumList ||--o{ TaskList : "has"
  CurriculumList ||--o{ MockList : "has"
  CurriculumList ||--o{ CourseTimelineList : "has"
  SyllabusList ||--o{ SyllabusChapter : "contains"
  SyllabusList ||--o{ SyllabusListStatusChangeLog : "history"
  SyllabusChapter ||--o{ SyllabusItem : "contains"
  SyllabusItem ||--o{ StudentSyllabusProgress : "tracked by"
  SyllabusItem ||--o{ Doubt : "tagged"
  SyllabusItem ||--o{ TaskItem : "tagged"
  SyllabusItem ||--o{ MockItem : "tagged"
  TaskList ||--o{ TaskItem : "contains"
  TaskList ||--o{ TaskListStatusChangeLog : "history"

  TaskListStatusChangeLog {
    cuid id PK
    cuid taskListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  TaskItem ||--o{ TaskSubmission : "submitted as"
  TaskItem ||--o{ TaskAssignment : "assigned via"
  MockList ||--o{ MockItem : "contains"
  MockList ||--o{ MockListStatusChangeLog : "history"

  MockListStatusChangeLog {
    cuid id PK
    cuid mockListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  MockItem ||--o{ MockResult : "results"
  CourseTimelineList ||--o{ CourseTimelineItem : "contains"
  CourseTimelineList ||--o{ CourseTimelineListStatusChangeLog : "history"

  CourseTimelineListStatusChangeLog {
    cuid id PK
    cuid timelineListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  SyllabusItem ||--o{ CourseTimelineItem : "scheduled in"
  TaskItem ||--o{ CourseTimelineItem : "scheduled in"
  MockItem ||--o{ CourseTimelineItem : "scheduled in"

  CurriculumList {
    cuid id PK
    cuid serviceId UK
    bool isActive
  }

  SyllabusList {
    cuid id PK
    cuid curriculumListId FK
    string name
    string version
    string level
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  SyllabusListStatusChangeLog {
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
    cuid syllabusChapterId FK
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
    string status
    int masteryPct
    datetime updatedAt
  }

  TaskType {
    cuid id PK
    string name
    bool isActive
  }

  TaskList {
    cuid id PK
    cuid curriculumListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  TaskItem {
    cuid id PK
    cuid taskListId FK
    cuid taskTypeId FK
    cuid sessionId FK
    cuid syllabusItemId FK
    string title
    string description
    string hwLink
    string paperLink
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
    string status
    float totalMarks
    float marksScored
    float marksLost
    string subtopicsLostOn
    string submissionLink
    string notes
    datetime submittedAt
  }

  MockList {
    cuid id PK
    cuid curriculumListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  MockItem {
    cuid id PK
    cuid mockListId FK
    cuid sessionId FK
    cuid syllabusItemId FK
    cuid mockTypeId FK
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

  CourseTimelineList {
    cuid id PK
    cuid curriculumListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  CourseTimelineItem {
    cuid id PK
    cuid timelineListId FK
    string month
    int weekNumber
    string itemType
    cuid syllabusItemId FK
    cuid taskItemId FK
    cuid mockItemId FK
    string notes
  }

  %% ─── AMBASSADOR PROGRAMME ────────────────────────────────────────

  AmbassadorService ||--|| AmbassadorServiceSchedule : "has"
  AmbassadorService ||--|| AmbassadorProgrammeList : "has"
  AmbassadorService ||--o{ AmbassadorMeeting : "covers"
  AmbassadorService ||--o{ AmbassadorEnrolmentItem : "has"
  AmbassadorProgrammeList ||--o{ AmbassadorProgrammeContentList : "has"
  AmbassadorProgrammeList ||--o{ AmbassadorTestList : "has"
  AmbassadorProgrammeList ||--o{ AmbassadorProgrammeTimelineList : "has"
  AmbassadorProgrammeContentList ||--o{ AmbassadorProgrammeItem : "contains"
  AmbassadorProgrammeContentList ||--o{ AmbassadorProgrammeContentListStatusChangeLog : "history"
  AmbassadorProgrammeItem ||--o{ AmbassadorProgrammeProgress : "tracked by"
  AmbassadorTestList ||--o{ AmbassadorTestItem : "contains"
  AmbassadorTestList ||--o{ AmbassadorTestListStatusChangeLog : "history"

  AmbassadorTestListStatusChangeLog {
    cuid id PK
    cuid testListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  AmbassadorProgrammeItem ||--o{ AmbassadorTestItem : "tagged"
  AmbassadorTestItem ||--o{ AmbassadorTestResult : "results"
  AmbassadorProgrammeTimelineList ||--o{ AmbassadorProgrammeTimelineItem : "contains"
  AmbassadorProgrammeTimelineList ||--o{ AmbassadorProgrammeTimelineListStatusChangeLog : "history"

  AmbassadorProgrammeTimelineListStatusChangeLog {
    cuid id PK
    cuid timelineListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }
  AmbassadorProgrammeItem ||--o{ AmbassadorProgrammeTimelineItem : "scheduled in"
  TaskItem ||--o{ AmbassadorProgrammeTimelineItem : "scheduled in"
  AmbassadorTestItem ||--o{ AmbassadorProgrammeTimelineItem : "scheduled in"

  AmbassadorService {
    cuid id PK
    string title
    string serviceType
    string currency
    float rate
    bool isActive
  }

  AmbassadorProgrammeList {
    cuid id PK
    cuid ambassadorServiceId UK
    bool isActive
  }

  AmbassadorProgrammeContentList {
    cuid id PK
    cuid programmeListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  AmbassadorProgrammeContentListStatusChangeLog {
    cuid id PK
    cuid contentListId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  AmbassadorProgrammeItem {
    cuid id PK
    cuid contentListId FK
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
    string status
    int masteryPct
    datetime updatedAt
  }

  AmbassadorTestList {
    cuid id PK
    cuid programmeListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  AmbassadorTestItem {
    cuid id PK
    cuid testListId FK
    cuid meetingId FK
    cuid programmeItemId FK
    cuid testTypeId FK
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

  AmbassadorProgrammeTimelineList {
    cuid id PK
    cuid programmeListId FK
    string name
    string version
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  AmbassadorProgrammeTimelineItem {
    cuid id PK
    cuid timelineListId FK
    string month
    int weekNumber
    string itemType
    cuid programmeItemId FK
    cuid taskItemId FK
    cuid testItemId FK
    string notes
  }

  %% ─── REFERRALS ───────────────────────────────────────────────────

  Referral ||--o{ ReferralClick : "clicked"
  User ||--o{ Referral : "refers"
  User ||--o{ Referral : "referred in"

  Referral {
    cuid id PK
    cuid referrerId FK
    cuid referredStudentId FK
    string code
    string status
    bool isActive
  }

  ReferralClick {
    cuid id PK
    cuid referralId FK
    string ipAddress
    string userAgent
    datetime clickedAt
    bool convertedToEnquiry
    datetime convertedToEnquiryAt
    bool convertedToEnrolment
    datetime convertedToEnrolmentAt
  }

  %% ─── STUDENT INVOICING ───────────────────────────────────────────

  StudentInvoice ||--o{ InvoiceLineItem : "contains"
  StudentInvoice ||--o{ LedgerEntry : "references"
  StudentInvoice ||--o{ PaymentRecord : "settled by"
  StudentInvoice ||--o{ StudentInvoiceStatusChangeLog : "history"
  BillingMonth ||--o{ StudentInvoice : "period"
  BillingMonth ||--o{ Paycheck : "period"
  BillingMonth ||--o{ AmbassadorPaycheck : "period"
  InvoiceLineItem ||--o| InvoiceLineItem : "corrects"

  BillingMonth {
    cuid id PK
    string month UK
  }

  StudentInvoice {
    cuid id PK
    cuid studentId FK
    cuid enrolmentListId FK
    cuid billingMonthId FK
    cuid receivingPaymentMethodId FK
    string month
    string invoiceMode
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
    string lineType
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

  %% ─── CLAIMS & PAYCHECKS ──────────────────────────────────────────

  Claim ||--o{ ClaimLineItem : "contains"
  Claim ||--o| Paycheck : "triggers"
  Claim ||--o{ ClaimStatusChangeLog : "history"
  Paycheck ||--o{ PaycheckLineItem : "contains"
  PaycheckLineItem ||--o| PaycheckLineItem : "corrects"
  TeacherEnrolmentItem ||--o{ PaycheckLineItem : "paid as"
  StaffEnrolmentItem ||--o{ PaycheckLineItem : "paid as"
  Paycheck ||--o{ LedgerEntry : "references"
  Claim ||--o{ LedgerEntry : "references"
  Paycheck ||--o{ PaymentRecord : "settled by"
  Paycheck ||--o{ PaycheckStatusChangeLog : "history"

  Claim {
    cuid id PK
    cuid userId FK
    cuid teacherEnrolmentListId FK
    cuid staffEnrolmentListId FK
    string claimantType
    string month
    cuid deptId FK
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

  Paycheck {
    cuid id PK
    cuid claimId FK
    cuid recipientId FK
    cuid teacherEnrolmentListId FK
    cuid staffEnrolmentListId FK
    cuid billingMonthId FK
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
    string lineType
    cuid teacherEnrolmentItemId FK
    cuid staffEnrolmentItemId FK
    cuid sessionId FK
    cuid meetingId FK
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

  %% ─── AMBASSADOR CLAIMS & PAYCHECKS ──────────────────────────────

  AmbassadorClaim ||--o{ AmbassadorClaimLineItem : "contains"
  AmbassadorClaim ||--o| AmbassadorPaycheck : "triggers"
  AmbassadorClaim ||--o{ AmbassadorClaimStatusChangeLog : "history"
  AmbassadorCommissionList ||--o{ AmbassadorClaim : "generates"
  AmbassadorEnrolmentList ||--o{ AmbassadorClaim : "generates"
  AmbassadorCommissionItem ||--o{ AmbassadorClaimLineItem : "claimed via"
  StudentEnrolmentItem ||--o{ AmbassadorClaimLineItem : "tracked via"
  AmbassadorEnrolmentItem ||--o{ AmbassadorClaimLineItem : "allowance via"
  AmbassadorPaycheck ||--o{ PaymentRecord : "settled by"
  AmbassadorPaycheck ||--o{ LedgerEntry : "references"
  AmbassadorPaycheck ||--o{ AmbassadorPaycheckStatusChangeLog : "history"

  AmbassadorClaim {
    cuid id PK
    cuid ambassadorId FK
    cuid commissionListId FK
    string month
    float subtotal
    float netAmount
    float dueAmount
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
    string lineType
    cuid commissionItemId FK
    cuid studentEnrolmentItemId FK
    cuid ambassadorEnrolmentItemId FK
    float studentHoursLogged
    float studentAmountPaid
    float commissionPct
    float rateSnapshot
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
    cuid billingMonthId FK
    cuid receivingPaymentMethodId FK
    string month
    float subtotal
    float netAmount
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

  %% ─── PAYMENT METHODS ─────────────────────────────────────────────

  PaymentMethodType ||--o{ PaymentMethod : "types"
  BankAccount ||--o| PaymentMethod : "linked to"
  PaymentMethod ||--o{ PaymentRecord : "used in"
  PaymentMethod ||--o{ PaymentRecord : "paid from"
  PaymentMethod ||--o{ StudentInvoice : "receives into"
  PaymentMethod ||--o{ Paycheck : "receives into"
  PaymentMethod ||--o{ Claim : "receives into"
  PaymentMethod ||--o{ AmbassadorClaim : "receives into"
  PaymentMethod ||--o{ AmbassadorPaycheck : "receives into"

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
    string entityType
    cuid entityId
    cuid receivingPaymentMethodId FK
    cuid paidByUserId FK
    cuid payingPaymentMethodId FK
    float amount
    string currency
    string receiptLink
    string stripePaymentIntentId
    string status
    datetime submittedAt
    datetime paidAt
    bool receiverConfirmed
    cuid confirmedByUserId FK
    datetime confirmedAt
    string disputeReason
    string disputeNotes
  }

  %% ─── FINANCE ─────────────────────────────────────────────────────

  BankAccount ||--o{ AccountTransaction : "records"
  BankAccount ||--o{ LedgerEntry : "affected"
  BankAccount ||--o{ DeptBudget : "funds"
  AccountTransaction ||--o{ LedgerEntry : "splits"
  DeptBudget ||--o{ BudgetSubCategory : "has"
  BudgetSubCategory ||--o{ BudgetUtilisation : "consumed"
  LedgerEntry ||--o{ BudgetUtilisation : "linked"

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
    cuid deptId FK
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

  %% ─── TICKETS ─────────────────────────────────────────────────────

  Ticket ||--o{ TicketMessage : "contains"
  Ticket ||--o{ TicketHistory : "records"
  Ticket ||--o{ StaffRecord : "triggers"

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
    cuid ticketTypeId FK
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

  %% ─── HR & FLAGS ──────────────────────────────────────────────────

  StaffRecord {
    cuid id PK
    cuid userId FK
    cuid recordTypeId FK
    cuid triggeredByTicketId FK
    cuid issuedByUserId FK
    string notes
    string documentLink
    datetime issuedAt
  }

  StudentFlag {
    cuid id PK
    cuid studentId FK
    cuid flaggedByUserId FK
    cuid flagTypeId FK
    string flagSource
    string notes
    bool resolved
    datetime flaggedAt
    datetime resolvedAt
    cuid resolvedByUserId FK
  }

  %% ─── MISC ────────────────────────────────────────────────────────

  GeneralMeeting ||--o{ MeetingParticipant : "has"
  GeneralMeeting ||--o{ BacklogItemChangeLog : "triggers"
  GeneralMeeting ||--o{ GeneralMeetingStatusChangeLog : "history"

  GeneralMeetingStatusChangeLog {
    cuid id PK
    cuid meetingId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  GeneralMeeting {
    cuid id PK
    string title
    datetime dateTime
    string agenda
    string status
    string link
    cuid deptId FK
    bool isActive
  }

  MeetingParticipant {
    cuid id PK
    cuid meetingId FK
    cuid userId FK
    string rsvp
  }

  ContentGroup ||--o{ ContentGroupItem : "contains"
  ContentBankItem ||--o{ ContentGroupItem : "belongs to"

  ContentGroup {
    cuid id PK
    string name
    cuid deptId FK
    bool isActive
  }

  ContentGroupItem {
    cuid id PK
    cuid contentGroupId FK
    cuid contentBankItemId FK
  }

  ContentBankItem {
    cuid id PK
    cuid deptId FK
    string name
    string url
    string description
    cuid addedByUserId FK
    datetime createdAt
    bool isActive
  }

  Announcement {
    cuid id PK
    string title
    string body
    string targets
    string targetDept
    cuid targetUserId FK
    cuid createdByUserId FK
    string priority
    bool emailSent
    datetime createdAt
    datetime expiresAt
    bool isActive
  }

  Recording {
    cuid id PK
    cuid serviceId FK
    cuid sessionId FK
    cuid meetingId FK
    cuid uploadedByUserId FK
    string title
    string subject
    string videoUrl
    datetime date
    float durationHours
    string category
    bool isActive
  }

  SiteLog {
    cuid id PK
    cuid userId FK
    string action
    string entityType
    string entityId
    string ipAddress
    string userAgent
    string device
    string country
    json metaBefore
    json metaAfter
    datetime createdAt
  }

  AccessLog {
    cuid id PK
    cuid staffId FK
    string toolName
    string credential
    datetime dateGranted
    bool revoked
    datetime revokedAt
    cuid revokedByUserId FK
    string notes
  }

  Doubt {
    cuid id PK
    cuid studentId FK
    cuid syllabusItemId FK
    string body
    string response
    cuid answeredByUserId FK
    string status
    datetime createdAt
    datetime answeredAt
  }

  CurrencyRate {
    cuid id PK
    string fromCurrency
    string toCurrency
    float rate
    float reverseRate
    datetime effectiveDate
  }

  MarketingSchedule ||--o{ MarketingScheduleOccurrence : "has"
  MarketingScheduleOccurrence ||--o{ MarketingPostSlot : "generates"
  MarketingScheduleOccurrence ||--o{ MarketingScheduleOccurrenceStatusChangeLog : "history"
  MarketingPostSlot ||--o| MarketingPost : "fulfilled by"
  SocialPostType ||--o{ MarketingScheduleOccurrence : "types"

  MarketingScheduleOccurrenceStatusChangeLog {
    cuid id PK
    cuid occurrenceId FK
    string fromStatus
    string toStatus
    datetime changedAt
    cuid changedByUserId FK
    string reason
  }

  MarketingSchedule {
    cuid id PK
    string name
    cuid deptId FK
    cuid createdByUserId FK
    bool isActive
  }

  MarketingScheduleOccurrence {
    cuid id PK
    cuid scheduleId FK
    cuid postTypeId FK
    string recurrenceType
    string dayOfWeek
    int dayOfMonth
    string monthOfYear
    datetime oneOffDate
    string customPattern
    int quotaPerPeriod
    string status
    datetime activatedAt
    datetime pausedAt
    datetime deactivatedAt
    bool isActive
  }

  MarketingPostSlot {
    cuid id PK
    cuid occurrenceId FK
    datetime dueDate
    string status
    cuid missedTicketId FK
    bool isActive
  }

  MarketingPost {
    cuid id PK
    cuid slotId FK
    cuid platformTypeId FK
    cuid postTypeId FK
    cuid contentTypeId FK
    cuid createdByUserId FK
    string postName
    string postDesc
    string postCaption
    string canvaLink
    string driveLink
    datetime scheduledDate
    string status
    bool isActive
  }

  Lead {
    cuid id PK
    string name
    string email
    string phone
    cuid outreachSourceId FK
    string status
    string notes
    bool passedToPR
    cuid handoffTicketId FK
    bool isActive
  }

  TextFormat {
    cuid id PK
    string name UK
    string text
    string alternateText1
    string alternateText2
    datetime dateAdded
    string use
  }

  %% ─── ROLE RECORDS ────────────────────────────────────────────────

  User ||--o{ StudentRecord : "has record"
  User ||--o{ TeacherRecord : "has record"
  User ||--o{ StaffRecord : "has record"
  User ||--o{ AmbassadorRecord : "has record"
  Ticket ||--o{ StudentRecord : "triggers"
  Ticket ||--o{ TeacherRecord : "triggers"
  Ticket ||--o{ AmbassadorRecord : "triggers"

  StudentRecord {
    cuid id PK
    cuid userId FK
    cuid recordTypeId FK
    cuid triggeredByTicketId FK
    cuid issuedByUserId FK
    string notes
    string documentLink
    datetime issuedAt
  }

  TeacherRecord {
    cuid id PK
    cuid userId FK
    cuid recordTypeId FK
    cuid triggeredByTicketId FK
    cuid issuedByUserId FK
    string notes
    string documentLink
    datetime issuedAt
  }

  AmbassadorRecord {
    cuid id PK
    cuid userId FK
    cuid recordTypeId FK
    cuid triggeredByTicketId FK
    cuid issuedByUserId FK
    string notes
    string documentLink
    datetime issuedAt
  }

  User ||--o{ Recording : "uploaded by"
  User ||--o{ AccessLog : "owns"
  User ||--o{ AccessLog : "revoked by"
  User ||--o{ Announcement : "targeted"
  User ||--o{ Announcement : "created by"
  Ticket ||--o| Lead : "handoff"
  TaskType ||--o{ TaskItem : "types"
  User ||--o{ CalendarItem : "has"
  User ||--o{ StaffService : "provides"
  StaffService ||--o{ StaffEnrolmentItem : "has"
  StaffService ||--|| StaffServiceSchedule : "has"
  StaffService ||--o{ Meeting : "covers"
  StaffService ||--o{ MeetingAttendance : "tracks"

  StaffService {
    cuid id PK
    cuid staffId FK
    string serviceType
    string title
    cuid deptId FK
    string currency
    float rate
    bool isActive
  }

  %% ─── LOOKUP TABLES ───────────────────────────────────────────────

  TicketType ||--o{ Ticket : "types"
  FlagType ||--o{ StudentFlag : "types"
  RecordType ||--o{ StudentRecord : "types"
  RecordType ||--o{ TeacherRecord : "types"
  RecordType ||--o{ StaffRecord : "types"
  RecordType ||--o{ AmbassadorRecord : "types"
  MockType ||--o{ MockItem : "types"
  AmbassadorTestType ||--o{ AmbassadorTestItem : "types"
  OutreachSource ||--o{ Candidate : "types"
  OutreachSource ||--o{ Lead : "sources"

  %% ── Department lookup (replaces all string dept) ──
  Department ||--o{ StaffProfile : "depts"
  Department ||--o{ StaffService : "depts"
  Department ||--o{ Meeting : "depts"
  Department ||--o{ GeneralMeeting : "depts"
  Department ||--o{ Claim : "depts"
  Department ||--o{ DeptBudget : "depts"
  Department ||--o{ ContentGroup : "depts"
  Department ||--o{ ContentBankItem : "depts"
  Department ||--o{ KnowledgeBankList : "depts"
  Department ||--o{ BacklogItem : "depts"
  Department ||--o{ MeetingBacklogItem : "depts"
  Department ||--o{ JobPosting : "depts"
  Department ||--o{ PortalPermission : "depts"
  Department ||--o{ MarketingSchedule : "depts"

  %% ── StaffRole lookup (job roles, replaces string role) ──
  StaffRole ||--o{ StaffProfile : "roles"
  StaffRole ||--o{ Candidate : "roles"
  StaffRole ||--o{ JobPosting : "roles"
  StaffRole ||--o{ PortalPermission : "roles"

  %% ── UserType lookup (user category, replaces targetRole / candidateType) ──
  UserType ||--o{ RecordType : "scopes"
  UserType ||--o{ RegistrationForm : "scopes"
  UserType ||--o{ ChecklistTemplate : "scopes"
  UserType ||--o{ Candidate : "scopes"

  Department {
    cuid id PK
    string name UK
    bool isActive
  }

  StaffRole {
    cuid id PK
    string name UK
    bool isActive
  }

  UserType {
    cuid id PK
    string name UK
    bool isActive
  }

  TicketType {
    cuid id PK
    string name
    bool isActive
  }

  NotificationType {
    cuid id PK
    string name
    bool isActive
  }

  FlagType {
    cuid id PK
    string name
    bool isActive
  }

  RecordType {
    cuid id PK
    string name
    cuid targetUserTypeId FK
    bool isActive
  }

  MockType {
    cuid id PK
    string name
    bool isActive
  }

  AmbassadorTestType {
    cuid id PK
    string name
    bool isActive
  }

  OutreachSource {
    cuid id PK
    string name
    bool isActive
  }

  SocialPlatformType {
    cuid id PK
    string name
    bool isActive
  }

  SocialPostType {
    cuid id PK
    string name
    bool isActive
  }

  CampaignTag {
    cuid id PK
    string name
    bool isActive
  }

  %% ─── NOTIFICATIONS ───────────────────────────────────────────────

  NotificationType ||--o{ Notification : "types"
  User ||--o{ Notification : "receives"

  Notification {
    cuid id PK
    cuid userId FK
    cuid notificationTypeId FK
    string title
    string body
    string entityType
    cuid entityId
    bool read
    datetime readAt
    datetime createdAt
  }

  %% ─── JOB POSTINGS & REGISTRATION ────────────────────────────────

  JobPosting ||--o{ Candidate : "receives"
  RegistrationForm ||--o{ RegistrationFormEntry : "receives"
  RegistrationFormEntry ||--o| Candidate : "converts to"

  JobPosting {
    cuid id PK
    cuid staffRoleId FK
    cuid deptId FK
    string description
    string jobPostingLink
    string jobPostingPosterLink
    string status
    datetime postedAt
    datetime closedAt
    bool isActive
  }

  RegistrationForm {
    cuid id PK
    string name
    cuid targetUserTypeId FK
    string description
    bool isPublic
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
    string cvLink
    json additionalData
    string status
    cuid convertedToCandidateId FK
    datetime submittedAt
  }

  %% ─── CHECKLIST SYSTEM ────────────────────────────────────────────

  ChecklistTemplate ||--o{ ChecklistTemplateItem : "has"
  ChecklistTemplate ||--o{ ChecklistEntry : "generates"
  ChecklistEntry ||--o{ ChecklistItemEntry : "has"
  ChecklistTemplateItem ||--o{ ChecklistItemEntry : "checked via"

  ChecklistTemplate {
    cuid id PK
    string name
    string entityType
    cuid targetUserTypeId FK
    bool isActive
  }

  ChecklistTemplateItem {
    cuid id PK
    cuid templateId FK
    string label
    int order
    bool isActive
  }

  ChecklistEntry {
    cuid id PK
    cuid templateId FK
    string entityType
    cuid entityId
    cuid userId FK
    bool completed
    datetime completedAt
  }

  ChecklistItemEntry {
    cuid id PK
    cuid checklistEntryId FK
    cuid templateItemId FK
    bool checked
    datetime checkedAt
  }

  %% ─── CAMPAIGNS & MARKETING POSTS ────────────────────────────────

  Campaign ||--o{ CampaignItem : "contains"
  CampaignTag ||--o{ Campaign : "tags"
  CampaignItem ||--o| MarketingPost : "references"
  SocialPlatformType ||--o{ MarketingPost : "types"
  SocialPostType ||--o{ MarketingPost : "types"
  Ticket ||--o| MarketingPostSlot : "flags missed"

  Campaign {
    cuid id PK
    string name
    string description
    cuid campaignTagId FK
    datetime startDate
    datetime endDate
    string status
    bool isActive
  }

  CampaignItem {
    cuid id PK
    cuid campaignId FK
    string itemType
    cuid entityId
    string entityType
    string notes
    bool isActive
  }

  %% ─── OUTREACH & EXHIBITION ──────────────────────────────────────

  OutreachType ||--o{ OutreachItem : "types"
  ExhibitionType ||--o{ ExhibitionItem : "types"
  User ||--o{ OutreachItem : "assigned"
  User ||--o{ ExhibitionItem : "assigned"
  CampaignItem ||--o| OutreachItem : "references"
  CampaignItem ||--o| ExhibitionItem : "references"

  OutreachType {
    cuid id PK
    string name
    bool isActive
  }

  ExhibitionType {
    cuid id PK
    string name
    bool isActive
  }

  OutreachItem {
    cuid id PK
    cuid outreachTypeId FK
    string title
    string targetAudience
    cuid assignedToUserId FK
    datetime plannedDate
    datetime completedAt
    int leadCount
    string status
    string notes
    bool isActive
  }

  ExhibitionItem {
    cuid id PK
    cuid exhibitionTypeId FK
    string title
    string venue
    string location
    cuid assignedToUserId FK
    datetime plannedDate
    datetime completedAt
    int leadCount
    string status
    string notes
    bool isActive
  }

  %% ─── CONTENT TYPE ────────────────────────────────────────────────

  ContentType ||--o{ MarketingPost : "types"
  User ||--o{ MarketingPost : "created by"
  User ||--o{ MarketingSchedule : "created by"

  ContentType {
    cuid id PK
    string name
    bool isActive
  }

  %% ─── KNOWLEDGE BANK ──────────────────────────────────────────────

  KnowledgeBankDomain ||--o{ KnowledgeBankList : "types"
  KnowledgeBankList ||--o{ KnowledgeBankItem : "contains"
  Ticket ||--o| KnowledgeBankItem : "sourced by"
  User ||--o{ KnowledgeBankItem : "added by"

  KnowledgeBankDomain {
    cuid id PK
    string name
    bool isActive
  }

  KnowledgeBankList {
    cuid id PK
    cuid domainId FK
    cuid deptId FK
    bool isActive
  }

  KnowledgeBankItem {
    cuid id PK
    cuid listId FK
    string title
    string summary
    cuid sourceTicketId FK
    cuid addedByUserId FK
    datetime createdAt
    bool isActive
  }

  %% ─── ORG BACKLOG BANK ────────────────────────────────────────────

  OrgBacklogBank ||--o{ BacklogItem : "contains"
  Ticket ||--|| BacklogItem : "drives"
  BacklogItem ||--o{ BacklogItemChangeLog : "history"
  BacklogItem ||--o{ MeetingSprintItem : "pulled into"

  OrgBacklogBank {
    cuid id PK
    string name
    bool isActive
  }

  BacklogItem {
    cuid id PK
    cuid orgBacklogBankId FK
    cuid ticketId FK
    cuid deptId FK
    string title
    string priority
    bool isActive
  }

  BacklogItemChangeLog {
    cuid id PK
    cuid backlogItemId FK
    string event
    cuid meetingId FK
    datetime changedAt
    cuid changedByUserId FK
    string notes
  }

  %% ─── MEETING SPRINT & BACKLOG ────────────────────────────────────

  GeneralMeeting ||--|| MeetingSprintList : "has"
  GeneralMeeting ||--|| MeetingBacklogList : "has"
  MeetingSprintList ||--o{ MeetingSprintItem : "contains"
  MeetingBacklogList ||--o{ MeetingBacklogItem : "contains"
  MeetingBacklogItem ||--|| Ticket : "has"

  MeetingSprintList {
    cuid id PK
    cuid meetingId FK
    bool isActive
  }

  MeetingSprintItem {
    cuid id PK
    cuid sprintListId FK
    cuid backlogItemId FK
    string notes
  }

  MeetingBacklogList {
    cuid id PK
    cuid meetingId FK
    bool isActive
  }

  MeetingBacklogItem {
    cuid id PK
    cuid backlogListId FK
    cuid ticketId FK
    string title
    cuid deptId FK
    string priority
    string notes
    bool pushedToBank
    datetime pushedAt
  }

  %% ─── SYLLABUS CHAPTER ───────────────────────────────────────────

  SyllabusChapter ||--|| ChapterRecordingList : "has"
  ChapterRecordingList ||--o{ ChapterRecordingItem : "contains"
  Recording ||--o{ ChapterRecordingItem : "referenced by"

  SyllabusChapter {
    cuid id PK
    cuid syllabusListId FK
    string chapterNum
    string chapterTitle
    int order
    bool isActive
  }

  ChapterRecordingList {
    cuid id PK
    cuid syllabusChapterId FK
    bool isActive
  }

  ChapterRecordingItem {
    cuid id PK
    cuid chapterRecordingListId FK
    cuid recordingId FK
    string notes
    int order
    bool isActive
  }

  %% ─── METRIC SNAPSHOTS & PROGRESS REPORTS ────────────────────────

  MetricSnapshot ||--o{ ProgressReport : "generates"
  User ||--o{ ProgressReport : "receives"
  ProgressReport ||--o{ Notification : "triggers"

  MetricSnapshot {
    cuid id PK
    string entityType
    cuid entityId
    string month
    json metrics
    datetime snapshotAt
  }

  ProgressReport {
    cuid id PK
    cuid studentId FK
    cuid metricSnapshotId FK
    string month
    string pdfLink
    string staffComments
    string status
    cuid reviewedByUserId FK
    datetime reviewedAt
    datetime sentAt
    bool isActive
  }

  %% ─── PORTAL RBAC ─────────────────────────────────────────────────

  User ||--o{ PortalPermission : "has override"

  PortalPermission {
    cuid id PK
    cuid staffRoleId FK
    cuid deptId FK
    cuid userId FK
    string resource
    bool canView
    bool canCreate
    bool canEdit
    bool canDelete
    bool canApprove
    cuid updatedByUserId FK
    datetime updatedAt
  }
```
