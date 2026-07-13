# System Blueprint — v6

**History:** accurate as of commit `7428dbd` (feat(resources): Access button always shows,
defaults to google.com) — the last code commit reflected in this document. Any commit after
`7428dbd` may not yet be captured here; check `git log --oneline` against this hash to see
what's newer.

Reflects the codebase as implemented. v5 → v6 changes are called out inline; everything else is
carried forward unchanged from v5. **The big structural change this pass: the app itself was
rebuilt as "v7"** — v6's marketing shell (Hero/Nav/Footer/etc.) merged with the dcp1-app portal
backend into one Next.js app at the repo root, with the JSON-file DB swapped for a real Postgres
backend (Supabase) behind the exact same `readDB()/writeDB()/nextId()` interface, so every API
route below is unchanged in shape despite the storage swap. This document keeps the v3/v4/v5
naming convention ("System Blueprint") even though the app is now called v7 internally, since
it's the same evolving class model. Legend:

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
+ Currency             (every UserType — validated against every active ISO 4217 code)
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

```
DBAdapter                        (lib/db.js — NEW framing in v6, not a new class)
+ readDB() / writeDB(db) / nextId(db, prefix)
    - lib/db.js: same-shape passthrough to either lib/db-supabase.js
      (DB_BACKEND=supabase — one Postgres table per collection, each row
      { id, data: <jsonb> }, aggregated/synced via two Postgres functions,
      read_full_db() and sync_table(), so a full read/write is one round
      trip instead of one per table) or a local data/db.json file (fallback
      when DB_BACKEND isn't set to supabase). No API route needs to know
      which backend is active — this is the only file that does.
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
+ WhatsAppNumber
+ ParentWhatsAppNumber
+ Email
+ School
+ Location
+ Notes                       (free text — Management-only; removed from the
                                Student's own My Info card, still editable/
                                visible on the Accounts tab)
+ TimesheetURL                (Management-set link, not auto-generated)
+ ProgressTrackerURL          (Management-set link, not auto-generated)
+ GroupSent                   (bool, private Management-only onboarding tracker)
+ GCRSent                     (bool, same tracker, for the Google Classroom Room invite)
+ ScheduleSent                (bool, same tracker, for the Schedule)
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
+ DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES_FULL   (lib/accountTypes.js)
+ GetUsers()                  [GET, Management-only, joins Credential for issued creds]
+ MakeUser()                  [POST, Management-only]
+ SetUser()                   [PATCH, Management-only]
- applyBatch(), applyDepartment(), applyRole(), applyPassportNumber(), applyCurrency()
- applyStudentExtras()        (sets/clears the Student-only contact/admin/tracker fields;
    a no-op that strips those keys entirely for every other UserType)
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
ServiceManager                (app/api/services/route.js)                    (CHANGED in v6)
+ ServiceList                 ◇→ Service[]
    - Service { ServiceID, Type, Group[], Name,
                Rates ◆→ Rate[]                     (NEW in v6 — replaces the old
                    singular Currency/Rate pair; a Service now offers one or
                    more rates at once, duplicate currencies allowed, e.g.
                    two different USD tiers)
                    - Rate { RateID, Currency, Rate, Description?,
                             BillingType }           (BillingType NEW in v6:
                        "Monthly" (default, prorated by attendance),
                        "Hourly" (flat per-hour, no proration),
                        "OneOff" (flat one-time charge, generated exactly
                        once ever per enrollment regardless of month))
                Currency, Rate               (kept in sync with Rates[0] —
                    legacy singular fields, for any older display code
                    still reading them directly)
                OccuranceList ◆→ OccuranceItem[],
                Batch?, Board?, CourseClass?, SubjectCode?, SubjectName?,
                FullSubjectName?  (cohort fields — Student/Teacher groups only)
                RecordingsLink?, SyllabusLink?, WorksheetsLink?, GCRLink?
                    (NEW in v6 — Management-set resource links, Student-group
                    services only; surfaced on the Student/Teacher/Staff/
                    Ambassador Resources section, see §5) }
    - OccuranceItem { OccuranceID, Day, Time, Duration, Facilitator }
+ ALL_GROUPS = [Student, Teacher, Staff, Management, Parent, Ambassador]
+ GetServices()               [GET, any authenticated session]
+ MakeService()               [POST, Management-only — rejects negative rate,
                                validates each rate's Currency against CURRENCIES_FULL]
+ SetService()                [PATCH, Management-only — same validation; a rate
                                already carrying a RateID keeps it on edit (so
                                Enrolments already pointing at it stay valid),
                                a new rate gets a fresh one]
- applyStudentLinkFields()    (NEW in v6 — sets/clears the 4 resource-link
    fields; a no-op that strips those keys for services not open to Student)
```

```
BillingEngine                   (lib/billing.js)                            (CHANGED in v6)
+ BILLING_TYPES = [Monthly, Hourly, OneOff]
+ ratesOf(service)              (returns Service.Rates, synthesizing a
                                  one-entry legacy list for any service
                                  predating the Rates[] field)
+ rateById(service, rateId)     (falls back to Rates[0] if rateId doesn't
                                  match — same resolution used by real
                                  billing AND by each dashboard's own "My
                                  Enrollments" rate display, see §5)
+ isEnrollmentActiveForMonth()  (month-granularity StartDate/EndDate check;
                                  no dates on an enrollment = always active)
+ ComputeHoursAndAmount()
    Monthly: (Rate / ScheduledHours) * AttendedHours
    Hourly:  Rate * AttendedHours
    OneOff:  Rate (flat, once ever per enrollment)
+ amountDueInOwnCurrency(record)   (NEW in v6 — derives the outstanding
    balance in the record's OWN Currency from the manually-entered INRDue,
    via the FX rate implied by Amount/INRAmount; used for the "Amount Due"
    column, see §5)
```

```
FXRateEngine                    (lib/fxRates.js)                            (NEW in v6)
+ getRateToINR(db, currency, year, month)
    - fawazahmed0/currency-api (free, ~340 currencies, jsdelivr + pages.dev
      mirror), rate as of the 1st of that invoice's/paycheck's own month
      (not "today"), cached in db.fxRates keyed "CURRENCY-YYYY-MM" so a
      given currency+month is only ever fetched once; returns null (not 0)
      on a genuine lookup failure, leaving INRAmount at 0 for manual entry
+ convertRecordTotal(db, record, toCurrency)
    - converts an Invoice's/Paycheck's Amount into any target currency,
      pivoting through the record's own frozen INRAmount — except when the
      record's own Currency IS ALREADY INR, where it uses Amount directly
      rather than trusting a possibly-never-backfilled INRAmount field
+ convertINRAmount(db, inrAmount, toCurrency, year, month)
    - converts an already-INR figure (INRDue) into any target currency;
      short-circuits to 0 for a zero amount without any FX lookup at all
```

```
EnrolmentManager               (app/api/enrollments/route.js)               (CHANGED in v6)
+ EnrolmentList                ◇→ Enrolment[]
    - Enrolment { EnrolmentID, UserID, ServiceID,
                  RateID          (NEW in v6 — which specific Rate this
                      person is billed at; defaults to the service's
                      first/only rate if none given),
                  Currency        (cached from the resolved Rate, purely
                      for display — RateID is what billing actually uses),
                  StartDate?, EndDate?   (NEW in v6 — "YYYY-MM-DD",
                      both optional; no StartDate = active since always, no
                      EndDate = still ongoing; freely editable, including
                      clearing back to "") }
+ GetEnrolments()              [GET, Management-only]
+ MakeEnrolment()              [POST, Management-only — validates rateId
                                 against the service's own Rates[], and
                                 startDate/endDate format+order]
+ SetEnrolment()               [PATCH, Management-only — same validation]
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
+ EnsureScheduleGenerated()    (internal, idempotent — resolves a
                                 ScheduleItem's open-pool eligibility against
                                 the Service's CURRENT Group, not its own
                                 stale baked-in ServiceGroup snapshot)
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
InvoiceManager                  (app/api/invoices/route.js + app/api/invoices/pdf/route.js)  (CHANGED in v6)
+ InvoiceList                   ◇→ Invoice[]
    - Invoice { InvoiceID, StudentID, ServiceID, Year, Month, ScheduledHours,
                AttendedHours, Amount,
                Currency        (NEW in v6 — the currency this invoice was
                    ACTUALLY billed in, from the enrollment's resolved Rate;
                    legacy invoices predating this field are treated as INR,
                    never as the student's current profile Currency, which
                    may have changed since),
                INRAmount       (auto-computed at generation time via
                    FXRateEngine.getRateToINR, using the rate as of the 1st
                    of the invoice's own month; 0 if unresolvable, Management
                    can always override by hand),
                INRDue          (manually entered by Management — the
                    admin-only outstanding balance in INR; independent of
                    INRAmount, not derived from it),
                Status, StudentPaidFlag, Note? }
+ GetInvoices()                 [GET, Management-only]
+ GenerateInvoices()            [POST action=generate, Management-only —
                                  skips a Service/month with an already-generated
                                  OneOff charge, regardless of month]
+ MakeManualInvoice()           [POST action=manual, Management-only]
+ SetInvoice()                  [PATCH — field-split: Student/Parent may only
                                  toggle StudentPaidFlag, rest is Management-only]
+ RemoveInvoice()               [DELETE, Management-only]
+ RenderInvoicePDF()            [GET /pdf, self-or-Parent-or-Management —
                                  item table stays in the invoice's own native
                                  billed Currency (unconverted — the invoice's
                                  own record of what was charged); Balance Due
                                  (outstanding, from INRDue) and the final
                                  Total (full charge, from Amount/INRAmount)
                                  are BOTH converted into and shown only in
                                  the student's own Currency (FXRateEngine),
                                  each independently falling back to the
                                  native currency/amount if a rate lookup
                                  fails; Quantity always 1, Rate = Amount]
```

```
PaycheckManager                 (app/api/paychecks/route.js + app/api/paychecks/pdf/route.js)  (CHANGED in v6)
+ PaycheckList                  ◇→ Paycheck[]
    - Paycheck { PaycheckID, StaffID, ServiceID, Year, Month, ScheduledHours,
                 AttendedHours, Amount, Currency, INRAmount, INRDue,
                 Status, StaffReceivedFlag, Note?   (same field semantics as
                     Invoice above) }
+ GetPaychecks()                [GET, Management-only]
+ GeneratePaychecks()           [POST action=generate, Management-only — one
                                  per Teacher/Staff/Ambassador enrollment,
                                  skips an already-active-for-month check via
                                  BillingEngine.isEnrollmentActiveForMonth,
                                  and skips an already-generated OneOff]
+ MakeManualPaycheck()          [POST action=manual, Management-only]
+ SetPaycheck()                 [PATCH — same self/Management field-split as Invoice]
+ RemovePaycheck()               [DELETE, Management-only]
+ RenderPaycheckPDF()           [GET /pdf, self-or-Management — payslip layout
                                  with Employer SOCSO auto-calculated at 1.75%
                                  of Gross Pay; header "Currency:" row shows
                                  the STAFF's own home/payroll Currency (a
                                  separate concept from the billed Currency
                                  driving Gross/Nett Pay below it — a USD-
                                  billed class for an INR-paid teacher shows
                                  "USD 63.00" as Gross Pay but "Currency: INR"
                                  in the header); optional "Total (INR)" line
                                  at the end when the staff's own Currency is
                                  INR but the paycheck was billed in something
                                  else, using the frozen INRAmount; Year-to-
                                  Date Payroll Detail section is now OFF by
                                  default (data.showYtd, opt back in later)]
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
	-> My Enrollments now shows ONLY the one Rate this account is actually
	   enrolled at (BillingEngine.rateById), not every rate the Service
	   offers, and no Rate Description (Management-only label) (v6)
	-> Resources section (NEW in v6) — Timesheet/Progress Tracker buttons
	   (account-level, not per service) plus Recordings/Syllabus/
	   Worksheets/Google Classroom buttons per enrolled Service; every
	   button opens a placeholder page (app/dashboard/resources/[feature])
	   with an "Access <Feature>" button to the Service's real link if
	   Management set one, else a stand-in default
Student
	-> ScheduleDisplayer + AttendanceLogger + InvoiceDisplayer
	-> My Enrollments / Resources section: same v6 behavior as above
	-> My Invoices table (v6): Amount shown in the invoice's own Currency
	   (never the student's current profile Currency as a fallback for a
	   legacy record); new "Amount Due" column (own currency, derived from
	   INRDue) and "Total Due (<own currency>)" column (INRDue converted
	   into the student's own Currency); INR Due column removed (admin-only
	   now, see BillingTable below)
Parent
	-> StudentScheduleDisplayer + InvoiceDisplayer (own children only,
	   enforced server-side via AuthzManager.RequireSelfOrParentOrManagement)
	-> same Amount Due / Total Due columns as Student, per child (v6)

Management
	-> AccountManager (any type, with Role/Department/PassportNumber/Currency
	   as applicable, plus the Student-only contact/admin/tracker fields)
	-> ServiceManager (Group[] gates who can enroll; a Service now offers one
	   or more Rates at once, each with its own Currency/BillingType/
	   Description; Student-group services also get 4 optional resource
	   links, v6)
	-> InterviewTracker -> InterviewDatetimeApprover + FeedbackSender -> ConvertManager
	-> TrialTracker -> TrialDatetimeApprover + InvoiceSender -> ConvertManager
	-> EnrolmentManager (now records which specific Rate + an optional
	   active StartDate/EndDate window per enrollment, v6)
	-> StaffTracker -> AttendanceHistory -> PaycheckSender (includes Ambassador)
	-> StudentTracker -> AttendanceHistory -> InvoiceSender
	-> BillingTable (v6): per-row Amount + new "Amount Due" column both
	   shown in the record's own Currency (never a fallback to the billed
	   person's CURRENT profile Currency); INR Amount + INR Due columns
	   stay admin-only, unchanged; $0 drafts from missing schedule data
	   still flagged

Every request above
	-> SessionManager.GetSession() -> AuthzManager.RequireX()
```

---

## 5. Resources Section  (NEW in v6)

```
ResourcesSection                (components/ResourcesSection.jsx)
    - rendered on Student/Teacher/Staff/Ambassador dashboards, right after
      "My Enrollments"
    - user-based buttons (apply once, not per service): Timesheet,
      Progress Tracker
    - service-based buttons (one row per enrolled Service): Recordings,
      Syllabus, Worksheets, Google Classroom — each maps to a Service field
      (RecordingsLink/SyllabusLink/WorksheetsLink/GCRLink)
    - every button links to app/dashboard/resources/[feature], passing
      serviceId/serviceName/link (if the Service field is set) as query params
```

```
ResourceFeaturePage             (app/dashboard/resources/[feature]/page.js)
    - one dynamic route reused for every feature slug; shows the feature
      label (+ service name if applicable), a Back button (router.back()),
      an "In-app <Feature> is coming soon" note, and an "Access <Feature>"
      button — opens the Service's real link in a new tab if one's set and
      passes an http(s)-only guard (defends against a stray non-URL value
      ending up in an href), else falls back to a stand-in destination so
      the button is never hidden
```

