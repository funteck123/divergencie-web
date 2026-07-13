# Frontend Code Map — v6

**Scope:** every file under `app/dashboard/**/*.js` (9 files) and `components/*.jsx`/`*.tsx`
(21 files). Companion to `dcp1-uml-v6.md` (System Blueprint) and `dcp1-backend-map-v6.md`
(exhaustive API/lib map) — this document is the same exhaustive treatment for the frontend:
every React component, every prop, every `useState`/`useRef`/`useEffect`, and every internal
handler function is accounted for.

**Convention:** each file is a "module"; each function component inside it is a "class" whose
props are constructor parameters, `useState`/`useRef` are instance attributes, and every
function defined in its body (handlers, computed values, sub-render helpers) is a method. Most
dashboard files export exactly one thing (`export default function <Role>Dashboard()`), which is
a thin wrapper: `<DashboardShell allowedType={...}>{(user) => <Body user={user} />}</DashboardShell>`
— the interesting structure lives in the `Body` component (and its siblings) defined lower in
the same file, which are NOT exported (module-private, only used within that one page).

**History:** accurate as of commit `9397cf1` — same cutoff as `dcp1-uml-v6.md` and
`dcp1-backend-map-v6.md`.

---

## Part 1 — Dashboard Pages (`app/dashboard/**/*.js`, 9 files)

### app/dashboard/ambassador/page.js
- imports: `DashboardShell`, `ScheduleCalendar`, `WeeklyOccurrences`, `MyInfo`,
  `ResourcesSection`, `SortableTh` (components), `api, formatRate, useSort` (@/lib/client),
  `amountDueInOwnCurrency, rateById` (@/lib/billing); React `useEffect, useState`
- `export default function AmbassadorDashboard()` — wraps `Body` in `DashboardShell`, gated
  `allowedType="Ambassador"`.

```
function Body({ user })                                     [module-private]
  props: user
  state: data=useState(null) [/api/me bundle] · error=useState("") · view=useState("weekly")
         ["weekly"|"calendar"|"list"]
  effects: useEffect(load, []) on mount
  functions:
    load() — GET /api/me?userId=...
    attendanceFor(scheduleId) — this user's attendance record for a schedule item
    logAttendance(scheduleItemId, status, loggedDuration) — POST /api/attendance, reload
    markPaycheckReceived(paycheckId) — PATCH /api/paychecks {StaffReceivedFlag:true}, reload
    serviceNameOf(id) — Service Name lookup
    (inline) scheduleRows/paycheckRows via .map(); schedSort/paySort via useSort()
    (inline) enrolledServices — enrollments mapped to Service + the one applicable rate
             (rateById)
  renders: loading guard; MyInfo; "My Enrollments" table (Service/Type/Rate/Occurrences);
           ResourcesSection; "My Schedule" card (Weekly/Calendar/List toggle — WeeklyOccurrences
           / ScheduleCalendar / sortable list with inline AttendanceForm per unlogged row);
           "My Paychecks" sortable table (Mark-as-received button + PDF download link per row)

function AttendanceForm({ defaultHrs, onSubmit })            [module-private]
  props: defaultHrs, onSubmit(status, hrs)
  state: status=useState("Present") · hrs=useState(defaultHrs)
  functions: (inline form submit) preventDefault + onSubmit(status, hrs)
  renders: status select + hours input + "Log" button
```

### app/dashboard/interview/page.js
- imports: `DashboardShell`, `api, groupMatches` (@/lib/client); React `useEffect, useState`
- module-level: `INTERVIEW_ACC_TYPES` (3 types), `INTERVIEW_GROUP` (account type → required
  Service Group), `bookingTypeFor(userType)` (strips trailing "Acc")
- `export default function InterviewDashboard()` — wraps `Body`, gated to the 3 interview
  account types.

```
function Body({ user })                                     [module-private]
  props: user
  state: data=useState(null) [/api/me] · error=useState("") · scheduleById=useState({})
         [ScheduleID→item, from /api/schedule] · serviceId=useState("") [booking dropdown]
  effects: useEffect(load, []) — Promise.all(/api/me, /api/schedule) on mount
  functions:
    load() — fan-out fetch, builds scheduleById map
    book(scheduleId) — POST /api/schedule/pick {type: bookingTypeFor(user.UserType)}, reload
    submitTask(interviewId, link) — POST /api/interview-task, reload
    acceptOffer(interviewId) — POST /api/interview-offer {action:"accept"}, reload
  renders: loading guard; "My Interview" card iterating interviewItems (slot info + status
           badge + status-specific UI: Pending/Rejected/Waitlisted messages, TaskForm when
           Scheduled, TaskSubmitted message, TaskFeedback note, OfferSent Accept button + offer
           letter link, OfferAccepted confirmation); "Available Interview Slots" card (service
           select filtered via groupMatches + table of open slots with Book buttons)

function TaskForm({ onSubmit })                              [module-private]
  props: onSubmit(link)
  state: link=useState("")
  functions: (inline submit) preventDefault, if link.trim() calls onSubmit(link)
  renders: link input + "Submit" button
```

### app/dashboard/parent/page.js
- imports: `DashboardShell`, `ScheduleCalendar`, `WeeklyOccurrences`, `ScheduleImage`, `MyInfo`,
  `SortableTh` (components), `InvoicePaidControl`, `api, useSort` (@/lib/client),
  `amountDueInOwnCurrency` (@/lib/billing); React `useEffect, useState`
- `export default function ParentDashboard()` — wraps `Body`, gated `allowedType="Parent"`.

```
function Body({ user })                                     [module-private]
  props: user
  state: data=useState(null) [/api/me, includes data.children[]] · error=useState("")
  effects: useEffect(load, [])
  functions:
    load() — GET /api/me
    setInvoicePaid(invoiceId, paid) — PATCH /api/invoices {studentPaidFlag:paid}, reload
    confirmPaid(invoiceId, file) — FormData + raw fetch("/api/invoices/mark-paid") (not the
      api() helper — multipart), throws on !res.ok, reload
  renders: loading guard; MyInfo (with linkedChildren); empty-state card if no children; else
           one ChildCard per linked child

function ChildCard({ child, services, onSetPaid, onConfirmPaid })  [module-private]
  props: child {student, schedule, attendance, invoices, enrollments}, services (all),
         onSetPaid, onConfirmPaid
  state: view=useState("weekly") ["weekly"|"calendar"|"list"|"image"]
  functions:
    serviceNameOf(id) — Code/Name lookup
    scheduleItemFor(scheduleItemId) — matching schedule entry for an attendance row
    (inline) scheduleRows/invoiceRows/schedSort/invSort via useSort(); enrolledServices from
             child.enrollments
  renders: card per child — header w/ student name; Schedule section (Weekly/Calendar/List/
           Image toggle); Attendance table (Service/Date/Time/Instructor/Status/Hours);
           Invoices section (optional Stripe pay link + sortable table with InvoicePaidControl
           per row + PDF download link)
```

### app/dashboard/resources/[feature]/page.js
- imports: `useRouter, useSearchParams, useParams` (next/navigation), `DashboardShell`
- module-level: `FEATURE_LABELS` (slug → display label: recordings, syllabus, worksheets, gcr,
  timesheet, progress-tracker)
- `export default function ResourceFeaturePage()` — wraps `Body`, gated to
  `["Student","Teacher","Staff","Ambassador"]`. Note: `Body` here declares no props (doesn't use
  the `user` DashboardShell passes it).

```
function Body()                                              [module-private]
  props: (none used)
  state: none — uses useParams/useSearchParams directly instead
  functions: none named; derives inline:
    feature (useParams) · label (FEATURE_LABELS lookup or raw slug) · serviceName/link
    (useSearchParams) · validLink (regex-validates http(s), else falls back to
    "https://google.com" placeholder so the Access button is never hidden)
  renders: "← Back" button (router.back()); card with feature heading (+ optional serviceName),
           "coming soon" text, "Access <Feature>" link (target=_blank) → validLink
```

### app/dashboard/staff/page.js
- imports: `DashboardShell`, `ScheduleCalendar`, `WeeklyOccurrences`, `ScheduleImage`, `MyInfo`,
  `ResourcesSection`, `SortableTh` (components), `api, formatRate, useSort` (@/lib/client),
  `amountDueInOwnCurrency, rateById` (@/lib/billing); React `useEffect, useState`
- `export default function StaffDashboard()` — wraps `Body`, gated `allowedType="Staff"`.
- **Structurally identical to `ambassador/page.js`** (same `Body` shape/handlers, same local
  `AttendanceForm`), just adds an "image" schedule-view option ambassador lacks. See
  cross-cutting notes below — this near-duplication spans 4 files.

```
function Body({ user })                                     [module-private]
  state: data/error/view=useState("weekly") ["weekly"|"calendar"|"list"|"image"]
  effects: useEffect(load, [])
  functions: load / attendanceFor / logAttendance / markPaycheckReceived / serviceNameOf
             (identical contracts to ambassador's Body); enrolledServices via rateById
  renders: MyInfo; My Enrollments; ResourcesSection; My Schedule (4-way toggle incl. Image);
           My Paychecks (Mark-as-received + PDF)

function AttendanceForm({ defaultHrs, onSubmit })             [module-private]
  — byte-for-byte identical implementation to ambassador's/teacher's/student's
```

### app/dashboard/student/page.js
- imports: `DashboardShell`, `ScheduleCalendar`, `WeeklyOccurrences`, `ScheduleImage`, `MyInfo`,
  `ResourcesSection`, `SortableTh` (components), `InvoicePaidControl`,
  `api, formatRate, useSort` (@/lib/client), `amountDueInOwnCurrency, rateById` (@/lib/billing);
  React `useEffect, useState`
- `export default function StudentDashboard()` — wraps `Body`, gated `allowedType="Student"`.
- Near-duplicate of teacher/staff/ambassador's `Body`, but tracks **invoices** (not paychecks)
  and adds payment confirmation instead of a "received" toggle.

```
function Body({ user })                                     [module-private]
  state: data/error/view=useState("weekly") ["weekly"|"calendar"|"list"|"image"]
  effects: useEffect(load, [])
  functions:
    load / attendanceFor / logAttendance / serviceNameOf (same as the Staff/Teacher/Ambassador
      trio)
    setInvoicePaid(invoiceId, paid) — PATCH /api/invoices {studentPaidFlag:paid}, reload
    confirmPaid(invoiceId, file) — FormData + raw fetch("/api/invoices/mark-paid"), reload
    (inline) enrolledServices via rateById
  renders: MyInfo; My Enrollments; ResourcesSection; My Schedule (4-way toggle w/ inline
           AttendanceForm on unlogged rows); My Invoices (optional Stripe pay link + sortable
           table with InvoicePaidControl per row + PDF download link)

function AttendanceForm({ defaultHrs, onSubmit })             [module-private]
  — identical implementation, same as the other 3
```

### app/dashboard/teacher/page.js
- imports: same set as staff/page.js
- `export default function TeacherDashboard()` — wraps `Body`, gated `allowedType="Teacher"`.
- Identical in shape to `staff/page.js`/`ambassador/page.js` (paychecks, not invoices).

```
function Body({ user })                                     [module-private]
  state: data/error/view=useState("weekly") ["weekly"|"calendar"|"list"|"image"]
  functions: load / attendanceFor / logAttendance / markPaycheckReceived / serviceNameOf
             (identical contracts); enrolledServices via rateById
  renders: MyInfo; My Enrollments; ResourcesSection; My Schedule (4-way toggle); My Paychecks

function AttendanceForm({ defaultHrs, onSubmit })             [module-private]
  — identical implementation, same as the other 3
```

### app/dashboard/trial/page.js
- imports: `DashboardShell`, `api, groupMatches` (@/lib/client), `amountDueInOwnCurrency`
  (@/lib/billing); React `useEffect, useState`
- `export default function TrialDashboard()` — wraps `Body`, gated `allowedType="TrialAcc"`.

```
function Body({ user })                                     [module-private]
  props: user
  state: data=useState(null) [/api/me] · error=useState("") · scheduleById=useState({})
         [from /api/schedule] · serviceId=useState("")
  effects: useEffect(load, []) — Promise.all(/api/me, /api/schedule)
  functions:
    load() — fan-out fetch, builds scheduleById map
    book(scheduleId) — POST /api/schedule/pick {type:"Trial"}, reload
    submitFeedback(trialId, feedback) — POST /api/trial-feedback, reload
    payInvoice(invoiceId) — PATCH /api/invoices {status:"Paid"}, reload
    (inline) myTrials=data.trialItems; eligibleServices=data.services filtered via
             groupMatches(Group,"Student"); slotsForService=availableTrialSlots filtered
  renders: loading guard; "My Trial Sessions" card (slot info + status badge + status-specific
           UI: Pending/Rejected messages, FeedbackForm when Scheduled, FeedbackSubmitted
           display); "Available Trial Slots" card (service select + open-slot table w/ Book);
           "My Invoices" table (Period/Amount/Amount Due/Total Due/Status badge/"Mark as paid")

function FeedbackForm({ onSubmit })                          [module-private]
  props: onSubmit(text)
  state: text=useState("")
  functions: (inline submit) preventDefault, if text.trim() calls onSubmit(text)
  renders: text input + "Submit" button
```

### app/dashboard/management/page.js  (2705 lines — largest file, tab-based)
- imports: React `Fragment, useEffect, useState`, `DashboardShell`, `SortableTh`,
  `ScheduleCalendar` (components), `api, formatRates, groupMatches, normalizeGroup, roleGroupOf,
  useSort` (@/lib/client), `ratesOf, rateById, BILLING_TYPES, amountDueInOwnCurrency`
  (@/lib/billing), `TIMEZONE_GROUPS, normalizeTimezone, timezoneLabel` (@/lib/timezones),
  `DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES_FULL` (@/lib/accountTypes)
- module-level: `TABS` (7 names), `INTERVIEW_ACC_TYPES`, `INTERVIEW_ACC_LABEL`, `CONVERT_LABEL`,
  `BOOKING_TYPES`, `REQUIRED_GROUP_FOR_BOOKING_TYPE`, `BOOKING_TYPE_LABEL`, `EMPTY_OCC`
  (blank occurrence template), `ALL_GROUPS` (6), `CREATABLE_TYPES` (10 account types)
- `export default function ManagementDashboard()` — wraps `Body`, gated `allowedType="Management"`.

```
function Body()                                              [module-private]
  props: (none used — receives `user` from DashboardShell but doesn't use it)
  state: tab=useState("Applications")
  functions: none named — tab switching is inline onClick
  renders: 7-button tab nav; conditionally renders one of Applications / Pipeline / Accounts /
           Services / SchedulePool / Enrollments / Billing based on `tab`

function TimezoneSelect({ value, onChange })                  [module-private]
  renders: <select> with an <optgroup> per TIMEZONE_GROUPS entry

function Badge({ children, kind = "info" })                   [module-private]
  renders: <span className={`badge badge-${kind}`}>{children}</span> — shared across every tab
```

**Applications tab**
```
function Applications()                                       [module-private]
  state: regForms=useState([]) · issued=useState({}) [regFormId→{username,password}] ·
         error=useState("")
  effects: useEffect(load, [])
  functions:
    load() — GET /api/regforms
    act(regFormId, action) — PATCH /api/regforms {regFormId,action}; stores issued creds if
      returned; reload
  renders: "RegForm Applications" card — table (ID/Name/Type/Status/Credentials/
           Approve+Reject for Pending rows)
```

**Pipeline tab**
```
function Pipeline()                                           [module-private]
  state: trialItems, interviewItems, users, services, invoices = useState([]) each ·
         issued=useState({}) [accountId→credentials] · pendingTrials, pendingInterviews =
         useState([]) · error=useState("")
  effects: useEffect(load, []) — parallel-fetches users/services/invoices/schedule-requests,
           THEN concurrently fetches /api/me for every Trial/Interview account (explicit
           anti-N+1 comment in source)
  functions:
    load() — as above (2-phase Promise.all fan-out)
    nameOf(id) / serviceNameOf(id) / accountOf(id) — lookups
    invoiceFor(trial) — finds the invoice tied to a trial's converted student + service
    addService(trialId) — POST /api/trial-enroll, reload
    sendOffer(interviewId, feedback, offerLetterLink) — POST /api/interview-offer
      {action:"send"}, reload
    setInterviewOutcome(interviewId, action, feedback) — POST /api/interview-offer
      {action: waitlist|reject|unsend}, reload
    convert(accountId) — POST /api/convert, stores issued creds, reload
    actOnRequest(type, id, action) — PATCH /api/schedule/requests, reload
  sub-component AccountCell({ accountId }) — closure over accountOf/issued/convert; renders
    issued creds, or "→ convertedId", or a "Convert" button
  renders: "Trial Pipeline" table (Name/Service/Status/Feedback/Add-Service/Invoice badge/
           AccountCell); "Interview Pipeline" table (Name/Service/Status/Task link/Offer link/
           status-dependent controls [InterviewOutcomeForm when TaskSubmitted, OfferSentControls
           when OfferSent]/AccountCell); "Pending Requests" table (trials+interviews, Approve/
           Reject)

function InterviewOutcomeForm({ initialFeedback, initialLink, onSendOffer, onWaitlist, onReject })  [module-private]
  state: feedback=useState(initialFeedback||"") · offerLetterLink=useState(initialLink||"")
  functions: none named — inline onClick calls onSendOffer/onWaitlist/onReject
  renders: feedback input, offer-letter-link input, Send-offer(disabled until link
           filled)/Waitlist/Reject buttons

function OfferSentControls({ item, onSave, onUnsend })         [module-private]
  state: editing=useState(false) · feedback=useState(item.TaskFeedback||"") ·
         offerLetterLink=useState(item.OfferLetterLink||"")
  functions: none named — inline handlers for Save/Cancel/Edit/Unsend
  renders: editing → feedback/link inputs + Save/Cancel; else → Edit/Unsend buttons
```

**Accounts tab**
```
function Accounts()                                            [module-private]
  state: users=useState([]) · issued=useState({}) [accountId→credentials] · error=useState("")
         · editingId=useState(null) [which row's EditAccountForm is open]
  effects: useEffect(load, [])
  functions:
    load() — GET /api/users
    convert(accountId) — POST /api/convert, stores issued creds, reload
    saveEdit(userId, fields) — PATCH /api/users {userId,...fields}, closes edit row, reload
    studentNamesOf(studentIds) — joins linked-student names for Parent accounts
    (inline) filters users into studentUsers/teacherUsers/otherStaffUsers/managementUsers/
             parentUsers/ambassadorUsers/trialPendingUsers; builds a shared `sharedProps` bundle
  renders: CreateAccount form; one AccountGroupTable per account-type group (each with
           type-specific `columns` — e.g. Student gets Course/Batch/Timezone/Currency/WhatsApp/
           Parent WhatsApp/Email/School/Location/Notes/Timesheet/Progress Tracker/onboarding
           flags), plus Pending Trial + one Pending-Interview table per INTERVIEW_ACC_TYPES

function AccountGroupTable({ title, rows, columns, users, issued, editingId, setEditingId, convert, saveEdit, showSchedule, showConvert })  [module-private]
  props: as listed — columns is an array of {header, render(u)}
  state: none — controlled by parent's editingId
  functions: none named — colSpan computed inline
  renders: card w/ horizontally-scrollable table — ID/Name/Status + caller columns + "New
           credentials" cell + optional schedule PNG-download link + Convert/Edit-Close button;
           expands an inline EditAccountForm row (Fragment) when editingId matches

function EditAccountForm({ user, users, onSave, onCancel })    [module-private]
  props: user, users (full list — Parent's linked-student picker), onSave(fields), onCancel()
  state (one useState per editable field, ~22 total): name, status, role, passportNumber,
         course, batch, department, currency, timezone, studentIds, username, password,
         whatsappNumber, parentWhatsappNumber, email, school, location, notes, timesheetUrl,
         progressTrackerUrl, groupSent, gcrSent, scheduleSent
  functions:
    toggleStudent(id) — add/remove id from studentIds
    submit(e) — preventDefault; builds a `fields` object conditioned on user.UserType (role/
      passport for ROLE_ELIGIBLE, department for Staff, batch for Teacher, full Student field
      set, timezone for Student/Teacher/Staff/Ambassador, studentIds for Parent, password only
      if non-blank); calls onSave(fields)
  renders: form — Name, Status(or locked-message if Converted), Username, New-password, Currency
           select; conditionally: Role+Passport, Department select/fixed note, Course, WhatsApp/
           Parent-WhatsApp/Email/School/Location/Notes/Timesheet/Progress-Tracker + 3 onboarding
           checkboxes (Student), Batch, TimezoneSelect, linked-student checkboxes (Parent);
           Save/Cancel

function CreateAccount({ onCreated, users })                   [module-private]
  props: onCreated(), users (Parent's student picker)
  state: userType=useState("Parent") · name, role, passportNumber, course, batch, department =
         useState("") each · studentIds=useState([]) · currency=useState("INR") ·
         timezone=useState("Asia/Kolkata") · issued=useState(null) · error=useState("")
  functions:
    toggleStudent(id) — toggles id in studentIds
    reset() — clears all fields except userType
    submit(e) — preventDefault; builds POST body conditioned on userType (mirrors
      EditAccountForm's conditional logic); POSTs /api/users, stores issued creds, resets,
      calls onCreated()
  renders: "Create Account" card — type select (CREATABLE_TYPES), Name, Currency select;
           conditional fields per userType; Create button; issued-credentials display
```

**Services tab**
```
function Services()                                            [module-private]
  state: services=useState([]) · editingId=useState(null) · name, type("Class"), batch, board,
         courseClass, subjectCode, subjectName, fullSubjectName, recordingsLink, syllabusLink,
         worksheetsLink, gcrLink = useState("") each · group=useState(["Student"]) ·
         rates=useState([{currency:"INR",rate:"",description:"",billingType:"Monthly"}]) ·
         occurrences=useState([{...EMPTY_OCC}]) · error=useState("")
  effects: useEffect(load, [])
  functions:
    toggleGroup(g) — add/remove g from `group`
    load() — GET /api/services
    resetForm() — clears create/edit form, exits edit mode
    startEdit(s) — populates all form state from an existing service (maps s.Rates/
      s.OccuranceList into local editable arrays), sets editingId
    updateOcc(i,field,value) / addOcc() / removeOcc(i) — mutate the occurrences array
    updateRate(i,field,value) / addRate() / removeRate(i) — mutate the rates array
    submit(e) — preventDefault; validates group.length>0 && rates.length>0; POSTs (create) or
      PATCHes (edit) /api/services with the full payload; resetForm + reload
    (inline) cohortEligible = group includes Student/Teacher; studentLinksEligible = group
             includes Student
  renders: two-column grid — left: Create/Edit Service form (name, type, group checkboxes,
           conditional cohort fields, conditional resource-link fields [Recordings/Syllabus/
           Worksheets/GCR], dynamic Rates list, dynamic Occurrences list, Submit/Cancel); right:
           one ServiceGroupTable per ALL_GROUPS entry

function ServiceGroupTable({ groupName, services, onEdit })    [module-private]
  props: groupName, services (pre-filtered via groupMatches), onEdit(service)
  functions: none named — isCohort/colSpan computed inline
  renders: card w/ scrollable table — ID/Name/Type/Group + (Student/Teacher group) Batch/Board/
           Course-Class/Subject Code/Name/Full Name columns + Rate (formatRates) + Occurrences
           summary + Edit button
```

**Schedule Pool tab**
```
function SchedulePool()                                         [module-private]
  state: items=useState([]) [all schedule items] · openPoolSlots=useState([]) ·
         poolView=useState("calendar") · serviceView=useState("calendar") · services=useState([])
         · serviceType=useState("Trial") · serviceId, date, time, facilitator = useState("") ·
         duration=useState(1) · error=useState("")
  effects: useEffect(load, []) — parallel-fetches /api/schedule + /api/services
  functions:
    load() — fan-out fetch, sets items/openPoolSlots/services
    submit(e) — preventDefault; POST /api/schedule with the offered-slot fields; resets
      date/time/facilitator; reload
    (inline) serviceSlots = items filtered to OccuranceID!==null; requiredGroup/
             eligibleServices derived from serviceType
  renders: two-column grid — left: "Offer a Trial/Interview Slot" form (booking-type select,
           service select, date/time/duration/instructor, Submit) + "Open pool slots"
           (List/Calendar toggle); right: "Service Schedule (auto-generated)" (List/Calendar
           toggle, read-only)
```

**Enrollments tab**
```
function Enrollments()                                          [module-private]
  state: users, services, enrollments = useState([]) each · error=useState("")
  effects: useEffect(load, []) — parallel-fetches /api/users, /api/services, /api/enrollments
  functions:
    load() — fan-out fetch; filters users to those whose roleGroupOf() is in ALL_GROUPS
    enroll(userId, serviceId, rateId, startDate, endDate) — POST /api/enrollments, reload
    updateEnrollment(enrolmentId, patch) — PATCH /api/enrollments, reload
    deleteEnrollment(enrolmentId) — DELETE /api/enrollments, reload
    nameOf(id) / serviceNameOf(id) — lookups
  renders: one EnrollmentGroup per ALL_GROUPS entry (people/eligibleServices/enrollments
           filtered to that group)

function EnrollmentGroup({ title, people, eligibleServices, enrollments, onEnroll, users, services, nameOf, serviceNameOf, onUpdate, onDelete })  [module-private]
  state: userId, serviceId, rateId, startDate, endDate = useState("") each
  functions:
    pickService(id) — sets serviceId, auto-selects the service's first rate as default rateId
    submit(e) — preventDefault; calls onEnroll(...); clears form fields
    (inline) selectedService / availableRates via ratesOf()
  renders: two-column grid — "Enroll a {title}" form (person/service/rate selects, start/end
           date, Enroll button); "Current {title} Enrollments" table (one EnrollmentRow each)

function EnrollmentRow({ enrollment, users, services, nameOf, serviceNameOf, onUpdate, onDelete })  [module-private]
  state: editing=useState(false) · userId, serviceId = useState(enrollment.X) ·
         rateId=useState(enrollment.RateID||"") · startDate/endDate=useState(enrollment.X||"") ·
         error=useState("")
  functions:
    pickService(id) — sets serviceId + resets rateId to that service's first rate
    cancel() — resets fields to the original enrollment values, exits editing
    save() — async; onUpdate(enrolmentId, {...fields}), catches/displays error, exits editing
      on success
    remove() — window.confirm() guard, then onDelete(enrolmentId)
  renders: editing → person/service/rate selects + date inputs + Save/Cancel; else → read-only
           Person/Service/Rate(via rateById)/Start/End + Edit/Delete
```

**Billing tab**
```
function Billing()                                              [module-private]
  state: invoices, paychecks, users, services = useState([]) each · year=useState(now.year) ·
         month=useState(now.month+1) · error=useState("")
  effects: useEffect(load, []) — parallel-fetches /api/invoices, /api/paychecks, /api/users,
           /api/services
  functions:
    load() — 4-endpoint fan-out fetch
    nameOf(id) / serviceNameOf(id) — lookups
    generate() — sequentially POSTs /api/invoices and /api/paychecks {action:"generate"} for
      the chosen year/month, reload
    patchInvoice(id, patch) / patchPaycheck(id, patch) — PATCH respective endpoint, reload
    deleteInvoice(id) / deletePaycheck(id) — DELETE respective endpoint, reload
  renders: "Generate Drafts" card (year/month + Generate button); two-column grid of
           ManualBillingForm (Invoices/Students, Paychecks/Staff+Teacher+Ambassador);
           "Invoices (Students)" BillingTable; "Paychecks (Staff)" BillingTable

function ManualBillingForm({ title, personLabel, people, services, onSubmit })  [module-private]
  state: personId, serviceId = useState("") · year=useState(now.year) ·
         month=useState(now.month+1) · amount=useState("") · error=useState("")
  functions: submit(e) — preventDefault; async onSubmit({personId,serviceId,year,month,amount});
             clears fields on success, sets error on catch
  renders: person select, service select, year+month inputs, amount input, "Create draft"

function BillingTable({ rows, idKey, nameOf, personKey, serviceNameOf, onPatch, onDelete, flagKey, flagLabel })  [module-private]
  props: rows (invoices|paychecks), idKey ("InvoiceID"|"PaycheckID"), personKey
         ("StudentID"|"StaffID"), flagKey ("StudentPaidFlag"|"StaffReceivedFlag"), flagLabel
         ("Paid"|"Received")
  state: none — uses useSort hook, not raw useState
  functions: none named — decorates rows with `_person`/`_period`, then useSort(decorated,
             "_period","desc")
  renders: sortable table — Person/Service/Period/Scheduled hrs/Attended hrs/Amount/Amount Due/
           INR Amount/INR Due/Status/{flagLabel} columns, one <Row> per record

function Row({ row, idKey, nameOf, personKey, serviceNameOf, onPatch, onDelete, flagKey, flagLabel })  [module-private]
  state: editing=useState(false) · scheduledHours, attendedHours, amount, inrAmount, inrDue =
         useState(row.X) each
  functions:
    cancel() — resets edit-state to row's original values, exits editing
    save() — onPatch(row[idKey], {...fields}), exits editing
    remove() — window.confirm() guard (dynamic "invoice"/"paycheck" message), then
      onDelete(row[idKey])
    (inline) isDraft = row.Status === "Draft"
  renders: Person name + optional warning badge (row.Note); Service; Period; editable-or-plain
           ScheduledHours/AttendedHours/Amount/INRAmount/INRDue cells (Amount Due computed via
           amountDueInOwnCurrency); Status badge; paid/received flag badge + optional "Proof"
           link; Save/Cancel when editing, else Edit / Send-or-Unsend (toggles Draft↔Sent) / PDF
           link / Delete (confirm-gated)
```

---

**Cross-cutting patterns across app/dashboard:**
- **DashboardShell + gated Body**: all 9 files export a thin default component whose only job
  is `<DashboardShell allowedType={...}>{(user) => <Body user={user} />}</DashboardShell>`.
- **`load()` + `useEffect(() => { load() }, [])` on mount**: virtually every stateful component
  defines an async `load()` closure calling `api()` and storing the result, fired once on mount.
  Every mutation handler re-invokes `load()` after a successful call instead of local optimistic
  updates — "mutate then refetch" throughout.
- **`api()` helper vs raw `fetch`**: all JSON calls go through `@/lib/client`'s `api()` except
  the two file-upload flows (`confirmPaid` in parent/student), which build `FormData` and call
  `fetch()` directly.
- **4 near-duplicate role dashboards**: `ambassador/page.js`, `staff/page.js`, `teacher/page.js`,
  and `student/page.js` (which swaps invoices for paychecks) share the same `Body` shape and a
  byte-for-byte identical local `AttendanceForm` component — a strong refactor candidate,
  currently 4 near-copies.
- **Error state pattern**: nearly every component keeps a local `error` string, sets it in a
  try/catch around the mutating `api()` call, renders it as `<p style={{color:"var(--bad)"}}>`.
- **`useSort()` for tables**: sortable tables decorate rows with a derived sort field (e.g.
  `_dt = Date+Time`, `_period = Year*100+Month`) and pass it into `useSort()`, rendering
  `<SortableTh>` headers wired to `sortKey/sortDir/toggleSort`.
- **View-toggle button groups**: schedule sections consistently render a small toggle group
  (Weekly/Calendar/List[/Image]) swapping between `WeeklyOccurrences`, `ScheduleCalendar`, a
  local sortable `<table>`, and (where applicable) `ScheduleImage`.
- **Rate resolution**: role dashboards attach "my rate" to each enrolled service via
  `rateById(service, enrollment.RateID)`, since a Service can expose multiple rates but a given
  enrollee only sees the one they're enrolled at.
- **Management's tab architecture**: `Body` is just a tab switcher rendering one of 7 large
  sibling components, each independently fetching its own data — unlike the single-role
  dashboards, which fetch one `/api/me` bundle for everything.
- **Confirm-before-delete**: `EnrollmentRow.remove` and Billing's `Row.remove` gate on
  `window.confirm(...)` — no other file uses it.
- **PDF/PNG download links**: rendered as `<a href="/api/.../pdf?...Id=..." download>` rather
  than JS-driven downloads.

---

## Part 2 — Components (`components/*.jsx` / `*.tsx`, 21 files)

### Dashboard-utility components

#### components/DashboardShell.jsx
- imports: `useEffect, useState` (react), `useRouter` (next/navigation), `getCurrentUser, logout`
  (@/lib/client)
- `export default function DashboardShell({ allowedType, children })`
  - props: `allowedType` (UserType string or array), `children` (render-prop `(user) => ReactNode`)
  - state: `user = useState(undefined)` (`undefined`=checking, `null`=unauthorized, object=ok)
  - effects: `useEffect([allowedType, router])` — reads `getCurrentUser()`, checks membership,
    redirects to `/login` via `router.replace` if unauthorized, else sets `user`
  - functions: Sign-out button `onClick` — `logout()` then `router.push("/login")`
  - renders: "Loading…" while checking; `null` if unauthorized; else a `<main>` with a header bar
    (`DCP1 · {UserType}`, Name, Sign out) and a content area invoking `children(user)`

#### components/MyInfo.jsx
- imports: `timezoneLabel` (@/lib/timezones)
- module-level: `ROLE_ELIGIBLE` (duplicated from a server constant — client components can't
  import server modules)
- `export default function MyInfo({ user, linkedChildren })`
  - props: `user` (full `/api/me` record), `linkedChildren` (optional Parent's linked children)
  - state/effects: none — builds a `rows` array of `[label, value]` pairs via inline conditional
    `.push()` calls based on `user.UserType` (no named function)
  - renders: a `.card` "My Info" table — always Account ID/Name/Type/Status; conditionally
    Timezone, Course, Batch, Role/Department/Passport-IC, Currency (always), and for Students:
    WhatsApp/Parent-WhatsApp/Email/School/Location/Timesheet/Progress-Tracker links; "Linked
    children" row if `linkedChildren` provided

#### components/ScheduleCalendar.jsx
- imports: `useMemo, useState` (react)
- module-level: `DAY_LABELS`, `MONTH_LABELS`, `fmtDate(y,m,d)`
- `export default function ScheduleCalendar({ scheduleItems, attendanceItems, onLogAttendance, readOnly = false })`
  - props: as named — `readOnly` disables click-to-expand attendance logging
  - state: `year=useState(today.year)` · `month=useState(today.month)` [0-based] ·
    `expandedId=useState(null)` [ScheduleID of expanded session]
  - effects: none (uses `useMemo`)
  - functions:
    - `itemsByDate` (useMemo) — groups scheduleItems into `{date: [items]}`, sorted by Time
    - `occNumberByScheduleId` (useMemo) — sequential occurrence number per shared OccuranceID
    - `attendanceFor(scheduleId)` — matching attendance record
    - `goPrev()` / `goNext()` / `goToday()` — month navigation, clearing `expandedId`
    - session chip `onClick` — toggles `expandedId` if clickable
    - `MiniAttendanceForm`'s `onSubmit` closure — calls `onLogAttendance`, clears `expandedId`
  - renders: month-nav header, day-label row, 7-col day-cell grid (color-coded session badges by
    attendance status), expandable `MiniAttendanceForm` beneath a clicked unlogged session
  - also defines (not exported) `function MiniAttendanceForm({ defaultHrs, onSubmit })`:
    state `status=useState("Present")`, `hrs=useState(defaultHrs)`; renders a status
    select + hours input + "Log" button

#### components/ScheduleImage.jsx
- imports: none beyond implicit React
- `export default function ScheduleImage({ userId, userName, thumbnail = false })`
  - props: as named
  - state/effects: none — builds `viewSrc`/`downloadSrc` URL strings inline
  - renders: `<img>` pointing at `/api/schedule/image?userId=...` (sized per `thumbnail`), plus
    (when not thumbnail) a "Download PNG" link to `...&download=1`

#### components/WeeklyOccurrences.jsx
- imports: none beyond implicit React
- module-level: `DAY_ORDER`
- `export default function WeeklyOccurrences({ services })`
  - props: `services` — enrolled Service records with `OccuranceList`
  - state/effects: none — builds a `byDay` grouping via a plain `for` loop (computes
    `serviceLabel = "{Code} · {Name}"` or just `Name`), sorts each day's list by Time; `hasAny`
    decides the empty state
  - renders: empty-state message, or a 7-column day grid of badge chips
    (`Time serviceLabel (Durationh) · Facilitator`)

#### components/SortableTh.jsx
- imports: none beyond implicit React
- `export default function SortableTh({ label, sortKeyName, sortKey, sortDir, onSort })`
  - props: as named
  - functions: `<th>` `onClick` — `onSort(sortKeyName)`
  - renders: a sortable `<th>` with a ▲/▼ arrow when active

#### components/InvoicePaidControl.jsx
- imports: `useState` (react)
- `export default function InvoicePaidControl({ invoice, onMarkUnpaid, onConfirmPaid })`
  - props: `invoice`, `onMarkUnpaid(invoiceId)`, `onConfirmPaid(invoiceId, file)` (async)
  - state: `confirming=useState(false)` · `file=useState(null)` · `busy=useState(false)` ·
    `error=useState("")`
  - functions: file input `onChange` (sets file); Confirm `onClick` (async — sets busy, calls
    `onConfirmPaid`, resets on success, sets error on throw); Cancel `onClick` (resets state);
    "Mark as paid" `onClick` (`confirming(true)`); "Mark as unpaid" `onClick` (calls
    `onMarkUnpaid`)
  - renders: three mutually-exclusive states — Paid badge + optional proof link + unpaid button;
    a single "Mark as paid" button; or a file-input + Confirm/Cancel form

#### components/ResourcesSection.jsx
- imports: `Link` (next/link)
- module-level: `SERVICE_FEATURES` (4 entries: recordings/syllabus/worksheets/gcr, each
  `{slug, label, linkField}` mapping to a Service field like `RecordingsLink`), `USER_FEATURES`
  (2 entries: timesheet, progress-tracker)
- `export default function ResourcesSection({ services })`
  - props: `services` — enrolled Service objects (`ServiceID`, `Name`, optional link fields)
  - state/effects: none — inline `.map()`s; per-service-feature link building constructs a
    `URLSearchParams` with `serviceId`/`serviceName`/optional `link`, inline in the map callback
  - renders: `.card` "Resources" — top row of always-shown user-level feature links; below, an
    empty-state message or one block per enrolled service (name + feature-link row)

### Marketing / homepage sections (pure presentational, mostly no state)

#### components/Nav.tsx
- imports: `Link`, `Image`, `useState, useEffect` (react), `useTheme` (@/components/ThemeProvider),
  lucide-react icons
- module-level: `navLinks` (7 items)
- `export default function Nav()`
  - state: `mounted=useState(false)` [SSR guard] · `isOpen=useState(false)` [mobile menu] ·
    `isScrolled=useState(false)` [>50px scroll] · (`theme, toggle` from `useTheme()` context)
  - effects: `useEffect([])` — sets `mounted(true)`, attaches/cleans up a `window` scroll
    listener updating `isScrolled`
  - functions: scroll handler; theme-toggle `onClick={toggle}`; hamburger toggle; backdrop close;
    per-link close-on-navigate
  - renders: `null` until mounted; fixed `<nav>` with logo, desktop links, theme toggle,
    Portal-Login/Get-Started links, hamburger + mobile drawer; transparent-vs-opaque styling
    based on `isScrolled`

#### components/Footer.tsx
- imports: `Link`, `Image`, lucide-react icons (`Send`/`MapPin` imported but unused)
- `export default function Footer()` — no state/effects; `currentYear` hardcoded `2026`
  (commented-out `new Date().getFullYear()` alternative; also has commented-out `"use client"`/
  `"use cache"` directives suggesting an abandoned caching migration)
  - renders: 4-column grid footer (Brand/Institution/Support/Get-in-Touch) + bottom bar
    (copyright, "System Online" indicator, "Built with Next.js 15" label)

#### components/ThemeProvider.tsx
- imports: `createContext, useContext, useEffect, useState` (react)
- module-level: `ThemeContext = createContext({theme:"light", toggle:()=>{}})`
- `export function ThemeProvider({ children })`
  - state: `theme=useState<Theme>("light")`
  - effects: `useEffect([])` — reads `localStorage["dc-theme"]` on mount, applies "dark" class if set
  - functions: `toggle()` — flips theme, persists to localStorage, toggles the `dark` class on
    `document.documentElement`
  - renders: `<ThemeContext.Provider>{children}</ThemeContext.Provider>` — no own DOM
- other export: `export const useTheme = () => useContext(ThemeContext)`

#### components/Hero.tsx
- imports: `Link`, `ArrowRight` (lucide-react) — no state/effects, pure presentational
- renders: full-viewport `<section>` with a background video, gradient overlays, heading/
  subheading, two CTA links, scroll indicator, and (desktop) two floating stat cards

#### components/AboutSection.tsx
- imports: lucide-react icons, `Link` — module-level `traits` (4 items) — pure presentational
- renders: two-column section — trait cards + a "Sounds Like Me" CTA; decorative stacked-card
  visual with quote/tag-pills/mini-stat-grid on the right

#### components/ServicesGrid.tsx
- imports: `useEffect, useState` (react), lucide-react icons, `Link`
- types: `ServiceGroup`, `ApiGroups`, `CardData` (not exported)
- module-level: `TYPE_META` (icon/title/desc/popular per service-type key), `STATIC_FALLBACK`
  (3 hardcoded cards), `buildCards(groups: ApiGroups): CardData[]` (merges API groups into cards,
  capping at 7 unique subjects + "+ more")
- `export default function ServicesGrid()`
  - state: `cards = useState<CardData[]>(STATIC_FALLBACK)`
  - effects: `useEffect([])` — fetches `/api/public/services`; on success with non-empty
    `data.groups`, calls `buildCards` and sets `cards`; silently keeps fallback on error
  - renders: responsive grid of service cards (icon/title/desc/subject pills/"Enrol Now" link;
    `popular` card gets a gold ring + badge) + closing CTA banner

#### components/Stats.tsx
- imports: `useState, useEffect, useRef` (react), `ShieldCheck` (lucide-react)
- module-level: `allStats` (8 stat entries)
- `function Counter({ value, duration = 2000 })` [not default-exported, internal helper]
  - state: `count=useState(0)` · `isVisible=useState(false)`
  - refs: `ref = useRef<HTMLSpanElement>(null)`
  - effects: IntersectionObserver effect (sets `isVisible` true once in view, disconnects on
    unmount); animation effect (deps `[isVisible, target, duration]`) — `requestAnimationFrame`
    loop (`step`) counting 0→target over `duration`ms
  - functions: `step(timestamp)` — rAF callback
  - renders: `<span ref={ref}>{count}{suffix}</span>`
- `export default function Stats()` — no own state; `.map()` over `allStats` rendering a
  `Counter` per numeric stat (the "1st" cell is static text since it isn't purely numeric)
  - renders: bordered 8-cell stat grid + "CERTIFIED BY" row

#### components/Testimonials.tsx
- imports: `useState, useEffect` (react), lucide-react icons
- module-level: `testimonials` (3 entries)
- `export default function Testimonials()`
  - state: `current = useState(0)`
  - effects: `useEffect([current])` — `setInterval` auto-advancing every 8000ms via `next()`,
    reset on every dependency change
  - functions: `next()` / `prev()` (modular index arithmetic); chevron `onClick`s; indicator-dot
    `onClick` (direct index jump)
  - renders: heading + chevron nav; horizontally-sliding testimonial track (stars, quote,
    decorative Quote icon, avatar, name/detail, badge); indicator dots

#### components/Partners.tsx
- imports: lucide-react icons — no state/effects, fully static JSX (no data array)
- renders: 3-card grid (Cambridge, CollegeBoard, Zoom/Classroom infra) + certification disclaimer

#### components/Press.tsx
- imports: lucide-react icons — module-level `pressLogos` (8 entries) — no state/effects
- renders: "THEY'RE WATCHING" heading + press-outlet chip grid + italic disclaimer

#### components/GlobalReach.tsx
- imports: `Globe` (lucide-react), `Link` — module-level `locations` (10 map-pin entries) — no
  state/effects
- renders: heading + inline SVG world map with pulsing pin markers (HQ styled larger/gold) + CTA

#### components/AcademicResults.tsx
- imports: `Landmark, Plus` (lucide-react) — module-level `resultsData` (6), `unis` (10) — no
  state/effects
- renders: subject percentage-bar rows + university chip list ("30+ more" static chip)

#### components/ResultsTicker.tsx
- imports: none — module-level `results` (10 entries) — no state/effects
- renders: fixed label + horizontally auto-scrolling marquee (`styled-jsx` keyframes, tripled
  list for a seamless loop)

---

**Cross-cutting notes on components/:** The dashboard-utility components (DashboardShell,
MyInfo, ScheduleCalendar, ScheduleImage, WeeklyOccurrences, SortableTh, InvoicePaidControl,
ResourcesSection) are all consumed exclusively by `app/dashboard/**` pages and hold real
interactive state. The marketing/homepage components (everything else — Hero, AboutSection,
ServicesGrid, Stats, Testimonials, Partners, Press, GlobalReach, AcademicResults, ResultsTicker,
Nav, Footer, ThemeProvider) are almost entirely presentational, with the notable exceptions of
`Stats.tsx`'s `Counter` (IntersectionObserver + rAF animation), `Testimonials.tsx` (auto-
advancing carousel via `setInterval`), `Nav.tsx` (scroll-position + mobile-menu state), and
`ServicesGrid.tsx` (one live API fetch with a static fallback). `ThemeProvider` is the one
component providing app-wide React Context (`useTheme`), consumed by `Nav.tsx`.
