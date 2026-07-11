# System Blueprint — v5

**History:** accurate as of commit `febee0c` (rebrand: rename "Education Management" to "DC
Portal") — the last code commit reflected in this document. Any commit after `febee0c` may not
yet be captured here; check `git log --oneline` against this hash to see what's newer.

Reflects the codebase as implemented. v4 → v5 changes are called out inline; everything else is
carried forward unchanged from v4 (which itself superseded the v3 pre-build plan — see that
document's inline notes for the v3→v4 diff). The app itself was rebranded from "Education
Management" to **DC Portal** in this pass (login page heading + browser tab title only — no
class/data-model impact). Legend:

- `+` public, `-` private (not specified in source, left as `+` placeholder)
- `▷` inheritance (extends)
- `◇→` aggregation (holds reference to)
- `◆→` composition (owns / contains)
- `┄▷` interface realization

---

## 1. Base Class

```
User
+ UserID
+ UserType
+ Name
+ Status              (Active | Inactive | Converted)
+ ConvertedToUserID    (set only when Status = Converted)
+ Currency             (every UserType — now validated against every active
                         ISO 4217 code, ~168 total; v4 only whitelisted 10)
```

```
Credential
+ UserID
+ Username
+ Password             (plaintext — flagged in audit, not yet hashed)
```

```
Session
+ userId
+ userType
+ iat
  (HMAC-signed, carried in an httpOnly cookie — not a DB-backed class)
```

---

## 2. User Subclasses

```
TrialAcc ▷ User
+ TrialList            ◇→ TrialItem[]
+ InvoiceList          ◇→ Invoice[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetTrialList()
+ GetInvoiceList()
+ GetScheduleList()
  converts to: Student  (via ConvertManager)
```

```
TeacherInterviewAcc ▷ User
+ InterviewList        ◇→ InterviewItem[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetInterviewList()
+ GetScheduleList()
  converts to: Teacher, with Department fixed to "Teacher" and blank Role/PassportNumber
```

```
StaffInterviewAcc ▷ User
+ InterviewList        ◇→ InterviewItem[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetInterviewList()
+ GetScheduleList()
  converts to: Staff, with blank Department/Role/PassportNumber (Department picked later)
```

```
AmbassadorInterviewAcc ▷ User
+ InterviewList        ◇→ InterviewItem[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetInterviewList()
+ GetScheduleList()
  converts to: Ambassador, with Department fixed to "Ambassador" and blank Role/PassportNumber
```

```
Student ▷ User
+ Course
+ Batch
+ Timezone
+ WhatsAppNumber              (NEW in v5)
+ ParentWhatsAppNumber        (NEW in v5)
+ Email                       (NEW in v5)
+ School                      (NEW in v5)
+ Location                    (NEW in v5)
+ Notes                       (NEW in v5 — free text)
+ TimesheetURL                (NEW in v5 — Management-set link, not auto-generated)
+ ProgressTrackerURL          (NEW in v5 — Management-set link, not auto-generated)
+ GroupSent                   (NEW in v5 — bool, private Management-only onboarding
                                tracker: "has the Group actually been sent to the
                                student yet". Not shown on the Student's own My Info.)
+ GCRSent                     (NEW in v5 — bool, same tracker, for the Google
                                Classroom Room invite)
+ ScheduleSent                (NEW in v5 — bool, same tracker, for the Schedule)
+ EnrolmentList        ◇→ Enrolment[]
+ InvoiceList          ◇→ Invoice[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetInvoiceList()
+ GetScheduleList()
```

```
Teacher ▷ User
+ Batch
+ Timezone
+ Department            (fixed = "Teacher", not user-editable)
+ Role                  (free text)
+ PassportNumber
+ EnrolmentList         ◇→ Enrolment[]
+ PaycheckList          ◇→ Paycheck[]
+ ScheduleList          ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetPaycheckList()
+ GetScheduleList()
```

```
Staff ▷ User
+ Timezone
+ Department            (dropdown: Marketing | Finance | HR | IT | PR)
+ Role                  (free text)
+ PassportNumber
+ EnrolmentList         ◇→ Enrolment[]
+ PaycheckList          ◇→ Paycheck[]
+ ScheduleList          ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetPaycheckList()
+ GetScheduleList()
```

```
Ambassador ▷ User
+ Timezone
+ Department            (fixed = "Ambassador", not user-editable)
+ Role                  (free text)
+ PassportNumber
+ EnrolmentList         ◇→ Enrolment[]
+ PaycheckList          ◇→ Paycheck[]
+ ScheduleList          ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetPaycheckList()
+ GetScheduleList()
```

```
Parent ▷ User
+ StudentIDs[]
+ GetLinkedChildren()   (each child's own EnrolmentList/InvoiceList/ScheduleList/AttendanceList)
```

```
Management ▷ User
+ AccountManager()
+ ServiceManager()
+ EnrolmentManager()
+ ScheduleManager()
+ InterviewManager()
+ TrialManager()
+ InvoiceManager()
+ PaycheckManager()
+ ConvertManager()
```

---

## 3. Manager Classes

```
AccountManager                (app/api/users/route.js)
+ AccountList                 ◇→ User[]
+ DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES_FULL
    (shared config, lib/accountTypes.js. CURRENCIES_FULL is NEW in v5 —
     every active ISO 4217 { code, name } pair, ~168 entries, replacing
     v4's hand-picked 10-currency array. CURRENCIES (bare code list)
     stays exported for validation call sites.)
+ GetUsers()                  [GET, Management-only, joins Credential for issued creds]
+ MakeUser()                  [POST, Management-only]
+ SetUser()                   [PATCH, Management-only]
- applyBatch(), applyDepartment(), applyRole(), applyPassportNumber(), applyCurrency()
- applyStudentExtras()        (NEW in v5 — sets/clears the 11 new Student-only
    fields above; a no-op that strips those keys entirely for every other
    UserType, same pattern as the other per-field appliers)
```

```
ConvertManager                (app/api/convert/route.js)
+ CONVERT_MAP                 (TrialAcc→Student, TeacherInterviewAcc→Teacher,
                                StaffInterviewAcc→Staff, AmbassadorInterviewAcc→Ambassador)
+ ConvertAccount()            [POST, Management-only]
    - old record kept forever (Status: Converted, ConvertedToUserID set)
    - new record gets the same Department/Role/PassportNumber/Currency
      defaults MakeUser() would set for that UserType
```

```
RegFormManager                (app/api/register/route.js + app/api/regforms/route.js)
+ RegFormList                 ◇→ RegForm[]
    - RegForm { RegFormID, Name, Email, RequestedType, Status, SubmittedAt, CreatedUserID }
+ SubmitRegForm()             [POST /api/register, public — no session, this IS the entry point]
+ GetRegForms()                [GET /api/regforms, Management-only]
+ ApproveOrRejectRegForm()    [PATCH /api/regforms, Management-only]
```

```
ServiceManager                (app/api/services/route.js)
+ ServiceList                 ◇→ Service[]
    - Service { ServiceID, Type, Group[], Name, Currency, Rate,
                OccuranceList ◆→ OccuranceItem[],
                Batch?, Board?, CourseClass?, SubjectCode?, SubjectName?,
                FullSubjectName?  (cohort fields — Student/Teacher groups only) }
    - OccuranceItem { OccuranceID, Day, Time, Duration, Facilitator }
+ ALL_GROUPS = [Student, Teacher, Staff, Management, Parent, Ambassador]
+ GetServices()               [GET, any authenticated session]
+ MakeService()               [POST, Management-only — rejects negative Rate,
                                validates Currency against CURRENCIES_FULL (~168 codes, v5)]
+ SetService()                [PATCH, Management-only — same validation]
```

```
EnrolmentManager               (app/api/enrollments/route.js)
+ EnrolmentList                ◇→ Enrolment[]
    - Enrolment { EnrolmentID, UserID, ServiceID }
+ GetEnrolments()              [GET, Management-only]
+ MakeEnrolment()              [POST, Management-only]
+ SetEnrolment()               [PATCH, Management-only]
+ RemoveEnrolment()            [DELETE, Management-only]
```

```
ScheduleManager                (app/api/schedule/route.js + lib/scheduleGen.js)
+ ScheduleItemList             ◇→ ScheduleItem[]
    - ScheduleItem { ScheduleID, ServiceID, ServiceName, ServiceType,
                      ServiceGroup, OccuranceID, Date, Time, Duration, Facilitator }
+ BOOKING_TYPES = [Trial, TeacherInterview, StaffInterview, AmbassadorInterview]
+ GetSchedule()                [GET, any authenticated session]
+ MakeScheduleSlot()           [POST, Management-only]
+ EnsureScheduleGenerated()    (internal, idempotent)
```

```
BookingManager                 (app/api/schedule/pick/route.js + app/api/schedule/requests/route.js)
+ TrialList                    ◇→ TrialItem[]
    - TrialItem { TrialID, TrialAccID, ScheduleItemID, ServiceID, Feedback,
                  Status, ServiceAdded }
+ InterviewList                ◇→ InterviewItem[]
    - InterviewItem { InterviewID, InterviewAccID, ScheduleItemID, ServiceID,
                       TaskSubmissionLink, TaskFeedback, OfferLetterLink, Status }
+ PickSlot()                   [POST /api/schedule/pick, self-or-Management]
+ GetPendingRequests()         [GET /api/schedule/requests, Management-only]
+ ApproveOrRejectRequest()     [PATCH /api/schedule/requests, Management-only]
```

```
AttendanceManager               (app/api/attendance/route.js)
+ AttendanceList                ◇→ AttendanceItem[]
    - AttendanceItem { AttendanceID, ScheduleItemID, UserID, Date, Status,
                        ScheduledDuration, LoggedDuration, LoggedBy }
+ GetAttendance()               [GET, Management-only]
+ LogAttendance()               [POST, self-or-Management]
```

```
TrialManager                    (app/api/trial-enroll/route.js + app/api/trial-feedback/route.js)
+ SubmitFeedback()              [POST /api/trial-feedback, self-or-Management]
+ EnrollFromTrial()             [POST /api/trial-enroll, Management-only]
```

```
InterviewManager                (app/api/interview-task/route.js + app/api/interview-offer/route.js)
+ SubmitTask()                  [POST /api/interview-task, self-or-Management]
+ RespondToOffer()              [POST /api/interview-offer — "accept" is
                                  self-or-Management, everything else Management-only]
```

```
InvoiceManager                  (app/api/invoices/route.js + app/api/invoices/pdf/route.js)
+ InvoiceList                   ◇→ Invoice[]
    - Invoice { InvoiceID, StudentID, ServiceID, Year, Month, ScheduledHours,
                AttendedHours, Amount, INRAmount, INRDue, Status,
                StudentPaidFlag, Note? }
+ GetInvoices()                 [GET, Management-only]
+ GenerateInvoices()            [POST action=generate, Management-only]
+ MakeManualInvoice()           [POST action=manual, Management-only]
+ SetInvoice()                  [PATCH — field-split: Student/Parent may only
                                  toggle StudentPaidFlag, rest is Management-only]
+ RemoveInvoice()               [DELETE, Management-only]
+ RenderInvoicePDF()            [GET /pdf, self-or-Parent-or-Management —
                                  balance shown in Student.Currency;
                                  Quantity always 1, Rate = Amount]
```

```
PaycheckManager                 (app/api/paychecks/route.js + app/api/paychecks/pdf/route.js)
+ PaycheckList                  ◇→ Paycheck[]
    - Paycheck { PaycheckID, StaffID, ServiceID, Year, Month, ScheduledHours,
                 AttendedHours, Amount, INRAmount, INRDue, Status,
                 StaffReceivedFlag, Note? }
+ GetPaychecks()                [GET, Management-only]
+ GeneratePaychecks()           [POST action=generate, Management-only — one
                                  per Teacher/Staff/Ambassador enrollment]
+ MakeManualPaycheck()          [POST action=manual, Management-only]
+ SetPaycheck()                 [PATCH — same self/Management field-split as Invoice]
+ RemovePaycheck()               [DELETE, Management-only]
+ RenderPaycheckPDF()           [GET /pdf, self-or-Management — payslip layout
                                  with Employer SOCSO auto-calculated at 1.75%
                                  of Gross Pay, Year-To-Date table]
```

```
BillingEngine                   (lib/billing.js)
+ ComputeHoursAndAmount()
    Amount = (Service.Rate / ScheduledHours) * AttendedHours
```

```
DocumentRenderer                (lib/pdfDoc.js)
+ drawDocumentPDF()             (branded invoice look, used by RenderInvoicePDF)
+ drawPayslipPDF()              (flat statutory-payslip look, used by RenderPaycheckPDF)
```

```
ScheduleImageRenderer           (lib/scheduleImage.js + app/api/schedule/image/route.js)
+ THEMES                        (student | teacherRole | staff — no Ambassador template)
+ DrawSchedule()
+ GetScheduleImage()            [GET, self-or-Management]
```

```
SessionManager                  (lib/session.js + app/api/login/route.js + app/api/logout/route.js)
+ Login()                       [POST /api/login, public]
+ Logout()                      [POST /api/logout, public]
+ CreateSessionCookie()
+ VerifySessionCookie()
+ GetSession()
```

```
AuthzManager                    (lib/authz.js)
+ RequireSession()
+ RequireManagement()
+ RequireSelfOrManagement()
+ RequireSelfOrParentOrManagement()
```

---

## 4. Top-level Workflow

```
RegForm
	-> Management -> IntervAccMaker -> InterScheduler -> TaskCollector* -> OfferLetterSender -> {Teacher|Staff|Ambassador}Acc
    -> TrialAccMaker -> TrialScheduler -> TrialFeedbackCollector -> InvoiceSender -> StudentAccount

TeacherInterviewAcc / StaffInterviewAcc / AmbassadorInterviewAcc
	-> ScheduleDisplayer + InterviewDatetimeRequestor + TaskSubmitter* + OfferLetterAcceptor
	-> ConvertManager -> {Teacher | Staff | Ambassador}
TrialAcc
	-> ScheduleDisplayer + TrialDatetimeRequestor + FeedbackSubmitter + InvoicePayer
	-> ConvertManager -> Student
Teacher / Staff / Ambassador
	-> ScheduleDisplayer + AttendanceLogger + PaycheckDisplayer
Student
	-> ScheduleDisplayer + AttendanceLogger + InvoiceDisplayer
	-> My Info now also surfaces WhatsApp/Parent WhatsApp/Email/School/
	   Location/Notes/Timesheet/Progress Tracker (v5) — the private
	   Group/GCR/Schedule "sent" tracker stays Management-only
Parent
	-> StudentScheduleDisplayer + InvoiceDisplayer (own children only,
	   enforced server-side via AuthzManager.RequireSelfOrParentOrManagement)

Management
	-> AccountManager (any type, with Role/Department/PassportNumber/Currency
	   as applicable, plus the 11 new Student-only contact/admin/tracker
	   fields (v5) editable from the Accounts tab)
	-> ServiceManager (Group[] gates who can enroll; Currency now validated
	   against the full ISO 4217 list, v5)
	-> InterviewTracker -> InterviewDatetimeApprover + FeedbackSender -> ConvertManager
	-> TrialTracker -> TrialDatetimeApprover + InvoiceSender -> ConvertManager
	-> EnrolmentManager
	-> StaffTracker -> AttendanceHistory -> PaycheckSender (includes Ambassador)
	-> StudentTracker -> AttendanceHistory -> InvoiceSender
	-> BillingTable (per-row Amount shown in the billed person's Currency;
	   $0 drafts from missing schedule data flagged)

Every request above
	-> SessionManager.GetSession() -> AuthzManager.RequireX()
```
