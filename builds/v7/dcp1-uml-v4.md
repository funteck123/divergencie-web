# System Blueprint — v4

**History:** accurate as of commit `e25c18f` (security(auth): add server-side session auth +
ownership checks across every API route) — the last code commit reflected in this document.
Superseded by `dcp1-uml-v5.md`, which covers everything committed after this hash.

Reflects the codebase as implemented (not the original v3 pre-build plan). Superseded/renamed
concepts from v3 are noted inline. Legend:

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
+ Currency             (every UserType now — was Student/Teacher/Staff-only in v3)
```

```
Credential
+ UserID
+ Username
+ Password             (plaintext — flagged in audit, not yet hashed)
```

```
Session                (NEW in v4 — did not exist in v3/early builds)
+ userId
+ userType
+ iat
  (HMAC-signed, carried in an httpOnly cookie — not a DB-backed class,
   listed here because it's now a real part of the account model)
```

---

## 2. User Subclasses

v3 planned a single `InterviewAcc` and a single `Staff` class with Teacher/Team/Ambassador as
unrealized subtypes ("later, ignore"). v4 splits both fully: three distinct pending Interview
types converting to three distinct final types, and Teacher/Staff/Ambassador as three real,
separate UserTypes — not a role flag on one Staff class.

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
+ EnrolmentList        ◇→ Enrolment[]
+ InvoiceList          ◇→ Invoice[]
+ ScheduleList         ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetInvoiceList()
+ GetScheduleList()
```

```
Teacher ▷ User          (v3: a subtype note under "Staff", never realized — now a full class)
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
Staff ▷ User            (v3's "StaffRole" attribute renamed to Role; Department added)
+ Timezone
+ Department            (dropdown: Marketing | Finance | HR | IT | PR)
+ Role                  (free text — v3 called this StaffRole)
+ PassportNumber
+ EnrolmentList         ◇→ Enrolment[]
+ PaycheckList          ◇→ Paycheck[]
+ ScheduleList          ◇→ ScheduleItem[]
+ GetEnrolmentList()
+ GetPaycheckList()
+ GetScheduleList()
```

```
Ambassador ▷ User        (v3: a subtype note under "Staff", never realized — now a full class)
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
+ ConvertManager()       (NEW in v4 — the Convert step didn't have its own manager in v3)
```

---

## 3. Manager Classes

```
AccountManager                (app/api/users/route.js)
+ AccountList                 ◇→ User[]
+ DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES
    (shared config, lib/accountTypes.js — single source of truth for
     which fields each UserType carries; previously hand-duplicated
     between this route and the Management dashboard, now imported by both)
+ GetUsers()                  [GET, Management-only, joins Credential for issued creds]
+ MakeUser()                  [POST, Management-only]
+ SetUser()                   [PATCH, Management-only]
- applyBatch(), applyDepartment(), applyRole(), applyPassportNumber(), applyCurrency()
    (per-field setters called from MakeUser/SetUser — each is a no-op/delete
     for UserTypes the field doesn't apply to)
```

```
ConvertManager                (app/api/convert/route.js)  — NEW in v4
+ CONVERT_MAP                 (TrialAcc→Student, TeacherInterviewAcc→Teacher,
                                StaffInterviewAcc→Staff, AmbassadorInterviewAcc→Ambassador)
+ ConvertAccount()            [POST, Management-only]
    - old record kept forever (Status: Converted, ConvertedToUserID set)
    - new record gets the same Department/Role/PassportNumber/Currency
      defaults MakeUser() would set for that UserType (kept in sync
      after an audit finding that convert produced missing keys vs.
      direct-create's empty-string keys)
```

```
RegFormManager                (app/api/register/route.js + app/api/regforms/route.js)
+ RegFormList                 ◇→ RegForm[]
    - RegForm { RegFormID, Name, Email, RequestedType, Status, SubmittedAt, CreatedUserID }
+ SubmitRegForm()             [POST /api/register, public — no session, this IS the entry point]
+ GetRegForms()                [GET /api/regforms, Management-only]
+ ApproveOrRejectRegForm()    [PATCH /api/regforms, Management-only]
    - approve creates the matching pending Acc type via REQUEST_TYPE_MAP
      (mirrors ID_PREFIX in AccountManager)
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
    (v3: Service only had a MonthlyCost field and no Group concept —
     v4 replaced MonthlyCost with Rate+Currency and added Group as an
     array gating which account types can see/book/enroll a Service)
+ GetServices()               [GET, any authenticated session]
+ MakeService()               [POST, Management-only — rejects negative Rate,
                                validates Currency against the whitelist]
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
    (v3 only distinguished Trial vs. one generic Interview)
+ GetSchedule()                [GET, any authenticated session — pending
                                 Trial/Interview accounts browse open slots here]
+ MakeScheduleSlot()           [POST, Management-only — offers a Trial/Interview pool slot]
+ EnsureScheduleGenerated()    (internal — expands Service occurrences into
                                 real dated ScheduleItems, idempotent)
```

```
BookingManager                 (app/api/schedule/pick/route.js + app/api/schedule/requests/route.js)
+ TrialList                    ◇→ TrialItem[]
    - TrialItem { TrialID, TrialAccID, ScheduleItemID, ServiceID, Feedback,
                  Status, ServiceAdded }
+ InterviewList                ◇→ InterviewItem[]
    - InterviewItem { InterviewID, InterviewAccID, ScheduleItemID, ServiceID,
                       TaskSubmissionLink, TaskFeedback, OfferLetterLink, Status }
+ PickSlot()                   [POST /api/schedule/pick, self-or-Management —
                                 records a Pending request, doesn't lock the slot]
+ GetPendingRequests()         [GET /api/schedule/requests, Management-only]
+ ApproveOrRejectRequest()     [PATCH /api/schedule/requests, Management-only —
                                 this is what actually locks the slot]
```

```
AttendanceManager               (app/api/attendance/route.js)
+ AttendanceList                ◇→ AttendanceItem[]
    - AttendanceItem { AttendanceID, ScheduleItemID, UserID, Date, Status,
                        ScheduledDuration, LoggedDuration, LoggedBy }
+ GetAttendance()               [GET, Management-only]
+ LogAttendance()               [POST, self-or-Management — the account
                                  logging attendance must be the session
                                  owner, or Management logging on their behalf]
```

```
TrialManager                    (app/api/trial-enroll/route.js + app/api/trial-feedback/route.js)
+ SubmitFeedback()              [POST /api/trial-feedback, self-or-Management —
                                  the TrialAcc who took the trial, or Management]
+ EnrollFromTrial()             [POST /api/trial-enroll, Management-only —
                                  adds the Service to the converted Student and
                                  bills one month in advance]
```

```
InterviewManager                (app/api/interview-task/route.js + app/api/interview-offer/route.js)
+ SubmitTask()                  [POST /api/interview-task, self-or-Management]
+ RespondToOffer()              [POST /api/interview-offer —
                                  action="accept" is self-or-Management (the
                                  interviewee accepting their own offer);
                                  send/waitlist/reject/unsend are Management-only]
```

```
InvoiceManager                  (app/api/invoices/route.js + app/api/invoices/pdf/route.js)
+ InvoiceList                   ◇→ Invoice[]
    - Invoice { InvoiceID, StudentID, ServiceID, Year, Month, ScheduledHours,
                AttendedHours, Amount, INRAmount, INRDue, Status,
                StudentPaidFlag, Note?  (NEW — flags a $0 draft caused by
                missing schedule data, not a legitimately free service) }
+ GetInvoices()                 [GET, Management-only]
+ GenerateInvoices()            [POST action=generate, Management-only — one
                                  per Student enrollment for {year, month},
                                  Amount via BillingEngine.ComputeHoursAndAmount]
+ MakeManualInvoice()           [POST action=manual, Management-only]
+ SetInvoice()                  [PATCH — field-split: the Student (or their
                                  linked Parent) may only toggle
                                  StudentPaidFlag on their own invoice; every
                                  other field is Management-only]
+ RemoveInvoice()               [DELETE, Management-only]
+ RenderInvoicePDF()            [GET /pdf, self-or-Parent-or-Management —
                                  balance shown in Student.Currency, not
                                  Service.Currency; Quantity always 1, Rate = Amount]
```

```
PaycheckManager                 (app/api/paychecks/route.js + app/api/paychecks/pdf/route.js)
+ PaycheckList                  ◇→ Paycheck[]
    - Paycheck { PaycheckID, StaffID, ServiceID, Year, Month, ScheduledHours,
                 AttendedHours, Amount, INRAmount, INRDue, Status,
                 StaffReceivedFlag, Note? }
+ GetPaychecks()                [GET, Management-only]
+ GeneratePaychecks()           [POST action=generate, Management-only — one
                                  per Teacher/Staff/Ambassador enrollment
                                  (v3/early builds only covered Teacher/Staff;
                                  Ambassador was silently excluded until an
                                  audit pass caught it)]
+ MakeManualPaycheck()          [POST action=manual, Management-only]
+ SetPaycheck()                 [PATCH — same self/Management field-split as
                                  Invoice, gated on StaffReceivedFlag]
+ RemovePaycheck()               [DELETE, Management-only]
+ RenderPaycheckPDF()           [GET /pdf, self-or-Management — plain payslip
                                  layout: header box (Company/Period/Empl No/
                                  Name/Department/Role/Currency/IC-Passport/
                                  EPF/SOCSO/TAX), Earnings/Deductions
                                  S.No/Item/Quantity/Rate/Amount tables,
                                  Employer SOCSO auto-calculated at 1.75% of
                                  Gross Pay, Year-To-Date table]
```

```
BillingEngine                   (lib/billing.js)  — pure calculation, no route of its own
+ ComputeHoursAndAmount()
    Amount = (Service.Rate / ScheduledHours) * AttendedHours
    (undocumented precondition: caller must ensure ScheduledHours > 0 —
     no runtime guard, an enrollment with no schedule data yields Amount: 0
     silently, now flagged via Invoice/Paycheck.Note above)
```

```
DocumentRenderer                (lib/pdfDoc.js)  — pure canvas drawing, no route of its own
+ drawDocumentPDF()             (branded invoice look — logo, brown/tan
                                  accent, used by RenderInvoicePDF)
+ drawPayslipPDF()              (flat statutory-payslip look — boxed
                                  key/value header, gray section bars, used
                                  by RenderPaycheckPDF)
```

```
ScheduleImageRenderer           (lib/scheduleImage.js + app/api/schedule/image/route.js)
+ THEMES                        (student | teacherRole | staff — one template
                                  PNG per role, no Ambassador template exists yet)
+ DrawSchedule()                (redraws the row/time-grid over the template
                                  per-request; Batch shown for Teacher,
                                  Department shown for Staff, in the same slot)
+ GetScheduleImage()            [GET, self-or-Management]
```

```
SessionManager                  (lib/session.js + app/api/login/route.js + app/api/logout/route.js)
    — NEW in v4, did not exist in earlier builds (auth was 100% client-side
      localStorage with zero server-side enforcement until this pass)
+ Login()                       [POST /api/login, public — verifies
                                  Credential, sets an httpOnly signed cookie]
+ Logout()                      [POST /api/logout, public — clears the cookie]
+ CreateSessionCookie()
+ VerifySessionCookie()
+ GetSession()                  (reads + verifies the cookie off a request)
```

```
AuthzManager                    (lib/authz.js)  — NEW in v4
+ RequireSession()              (401 if no valid session)
+ RequireManagement()           (403 if session.userType != Management)
+ RequireSelfOrManagement()     (403 unless session.userId == target or Management)
+ RequireSelfOrParentOrManagement()
    (403 unless self, Management, or a Parent whose StudentIDs includes
     the target — used by RenderInvoicePDF so Parents can download
     their children's invoices)
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
	   (each track converts to exactly one final type, its own ID prefix,
	    its own fixed/blank Department default — v3 had one undifferentiated
	    InterviewAcc -> Staff path)
TrialAcc
	-> ScheduleDisplayer + TrialDatetimeRequestor + FeedbackSubmitter + InvoicePayer
	-> ConvertManager -> Student
Teacher / Staff / Ambassador
	-> ScheduleDisplayer + AttendanceLogger + PaycheckDisplayer
	   (Ambassador dashboard added in v4 — didn't exist before; mirrors
	    Staff/Teacher minus a Schedule Image button, since no Ambassador
	    template PNG exists yet)
Student
	-> ScheduleDisplayer + AttendanceLogger + InvoiceDisplayer
Parent
	-> StudentScheduleDisplayer + InvoiceDisplayer (own children only,
	   enforced server-side via AuthzManager.RequireSelfOrParentOrManagement)

Management
	-> AccountManager (any type, with Role/Department/PassportNumber/Currency
	   as applicable — v3 had no Currency/PassportNumber concept at all)
	-> ServiceManager (Group[] gates who can enroll; Rate+Currency replaced
	   v3's MonthlyCost-only model)
	-> InterviewTracker -> InterviewDatetimeApprover + FeedbackSender -> ConvertManager
	-> TrialTracker -> TrialDatetimeApprover + InvoiceSender -> ConvertManager
	-> EnrolmentManager
	-> StaffTracker -> AttendanceHistory -> PaycheckSender (now includes Ambassador)
	-> StudentTracker -> AttendanceHistory -> InvoiceSender
	-> BillingTable (per-row Amount shown in the billed person's Currency,
	   not the Service's; $0 drafts from missing schedule data flagged)

Every request above
	-> SessionManager.GetSession() -> AuthzManager.RequireX()
	   (v3/early builds had no equivalent step at all — this is the layer
	    that makes every arrow above actually enforced server-side instead
	    of trusted from the client)
```
