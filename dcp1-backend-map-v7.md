# Backend Code Map — v7

**Scope:** every file under `app/api/**/route.js` and `lib/**/*.js`. Companion to `dcp1-uml-v6.md`
(the conceptual System Blueprint) — this document is exhaustive at the function level instead:
every exported function, every module-level constant, and every internal (non-exported) helper
is accounted for, so it can be used as a study reference of "what code constructs exist" rather
than just the domain model.

**Convention:** JS/Next.js doesn't have a real class hierarchy for most of this codebase (no
inheritance), so the UML convention here treats each **file/module** as a "class": its exported
functions are its public "methods," module-level constants are its public "attributes," and
non-exported functions/consts are marked private (`-`) the same way a UML private member would
be. `(async)` is noted where a function returns a Promise.

**History:** accurate as of commit `9397cf1` (the UML v6 commit) — same cutoff as `dcp1-uml-v6.md`
for Parts 1-2 below. **Extended** as of commit `8b49316` (CLI + MCP server) to also cover
`app/api/apikeys/route.js` (added to Part 1), `lib/session.js`'s API-key additions (updated in
place in Part 2), and a new Part 3 covering `cli/**` and `mcp/**` — nothing below was removed or
renumbered from the original v7 cutoff, only added to.

---

## Part 1 — API Routes (`app/api/**/route.js`, 26 files)

Every Next.js route file exports one function per HTTP method it handles (`GET`/`POST`/`PATCH`/
`DELETE`), each receiving `req` and returning a `NextResponse`. Grouped below by domain area.

### Auth / Session

#### app/api/login/route.js
- imports: `NextResponse` (next/server), `readDB` (@/lib/db), `sessionCookieFor` (@/lib/session)
- `POST(req)` (async) — public; body `{ username, password }`; matches credentials, looks up the
  user, sets a session cookie via `sessionCookieFor(user)`, returns the user.
- private: none

#### app/api/logout/route.js
- imports: `NextResponse` (next/server), `clearedSessionCookie` (@/lib/session)
- `POST()` (async) — clears the session cookie, returns `{ ok: true }`.
- private: none

#### app/api/apikeys/route.js  (NEW — commit `8b49316`)
- imports: `NextResponse` (next/server), `readDB, writeDB` (@/lib/db), `signApiKey`
  (@/lib/session), `requireSelfOrManagement, requireManagement` (@/lib/authz)
- `POST(req)` (async) — self-or-management (target user); body `{ userId, label?,
  expiresInDays? }`; validates the target user exists; mints a Bearer token via
  `signApiKey()` (see `lib/session.js`), pushes a bookkeeping record `{ ApiKeyID, UserID,
  UserType, Label, CreatedAt, ExpiresAt }` onto `db.apiKeys`; returns the token (only ever
  returned here, at mint time — never persisted) plus the bookkeeping fields.
- `GET(req)` (async) — Management-only; returns `db.apiKeys || []` (every issued key's
  bookkeeping record, never the tokens themselves).
- `DELETE(req)` (async) — body `{ apiKeyId }`; looks up the record first to determine its
  owner, then self-or-management auth against that owner; removes the bookkeeping record.
  Does NOT cryptographically revoke the token before its own expiry (see `lib/session.js`).
- private: none

### Public Intake

#### app/api/register/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `BOOKING_TYPES` (@/lib/scheduleGen),
  `requireManagement` (@/lib/authz)
- `POST(req)` (async) — public, no auth; body `{ name, email, requestedType }`; validates
  `requestedType` is one of `BOOKING_TYPES`; creates a Pending RegForm.
- `GET(req)` (async) — Management-only; returns `db.regForms`.
- private: none

#### app/api/leads/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement` (@/lib/authz)
- `POST(req)` (async) — public, no auth; body `{ name, email, phone?, source?, notes? }`; requires
  name+email; creates a Lead record with `Status: "new"`.
- `GET(req)` (async) — Management-only; returns all `db.leads`.
- private: none

#### app/api/regforms/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement` (@/lib/authz)
- `GET(req)` (async) — Management-only; returns `db.regForms`, joined with issued
  Username/Password from `db.credentials` for forms that already created an account.
- `PATCH(req)` (async) — Management-only; body `{ regFormId, action: "approve"|"reject" }`;
  "reject" marks the form Rejected; "approve" looks up `REQUEST_TYPE_MAP[form.RequestedType]`,
  creates the corresponding pending account + credentials, marks the form Approved with
  `CreatedUserID`.
- private:
  - `- makeUsername(name, db)` — unique-username generator (lowercase/strip + numeric suffix if
    taken); duplicated verbatim in `convert/route.js` and `users/route.js`.
  - `- randomPassword()` — 8-char random password from `Math.random().toString(36)`; also
    duplicated verbatim in the same two files.
  - `- REQUEST_TYPE_MAP` (module-scoped const) — maps a RegForm's `RequestedType`
    ("Trial"/"TeacherInterview"/"StaffInterview"/"AmbassadorInterview") to `{ userType, prefix }`.

### Accounts

#### app/api/users/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `isValidTimezone,
  normalizeTimezone` (@/lib/timezones), `requireManagement` (@/lib/authz), `DEPARTMENTS,
  ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES` (@/lib/accountTypes)
- `GET(req)` (async) — Management-only; returns all users joined with their Username/Password
  from `db.credentials`.
- `POST(req)` (async) — Management-only; body `{ userType, name, studentIds?, role?,
  passportNumber?, course?, batch?, department?, timezone?, currency? }`; validates `userType`
  against `ID_PREFIX`, name non-blank, Parent requires studentIds, timezone/department/currency
  validity; creates the user applying Batch/Department/Role/PassportNumber/Currency/StudentExtras
  per type, mints credentials.
- `PATCH(req)` (async) — Management-only; body `{ userId, name?, status?, timezone?, course?,
  role?, passportNumber?, batch?, department?, currency?, studentIds?, username?, password?, +
  student-extras fields }`; requires at least one field, validates name/status/timezone/
  studentIds/username/password formats, blocks status edits on Converted accounts, validates
  department/currency; applies only the provided field updates (re-using the `apply*` helpers)
  and optionally updates credentials (checking username uniqueness).
- `export { DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT }` — re-exported pass-through from
  `@/lib/accountTypes` so other files (e.g. `app/api/paychecks/pdf/route.js`) can import
  `FIXED_DEPARTMENT` from this route file without a separate import path.
- private:
  - `- ID_PREFIX` (const) — maps each UserType to its ID prefix (Management→MGT, Teacher→TCH,
    Staff→STF, Student→STU, Parent→PAR, TrialAcc→TRL, TeacherInterviewAcc→TIN,
    StaffInterviewAcc→SIN, AmbassadorInterviewAcc→AIN, Ambassador→AMB).
  - `- makeUsername(name, db)` / `- randomPassword()` — same as above.
  - `- applyBatch(user, userType, batch)` — sets Batch for Student/Teacher, else deletes it.
  - `- applyDepartment(user, userType, department)` — sets fixed Department for
    FIXED_DEPARTMENT types, freeform for Staff, else deletes it.
  - `- applyRole(user, userType, role)` — sets Role for ROLE_ELIGIBLE types, else deletes it.
  - `- applyPassportNumber(user, userType, passportNumber)` — sets PassportNumber for
    ROLE_ELIGIBLE types, else deletes it.
  - `- applyCurrency(user, currency)` — sets `user.Currency`, defaulting to "INR".
  - `- applyStudentExtras(user, userType, fields)` — for Student: conditionally sets
    WhatsAppNumber/ParentWhatsAppNumber/Email/School/Location/Notes/TimesheetURL/
    ProgressTrackerURL/GroupSent/GCRSent/ScheduleSent from `fields` (only if defined); for
    non-Student: deletes all those keys.

#### app/api/convert/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement` (@/lib/authz)
- `POST(req)` (async) — Management-only; body `{ accountId }`; converts a pending account
  (TrialAcc/TeacherInterviewAcc/StaffInterviewAcc/AmbassadorInterviewAcc) into its final UserType
  via `CONVERT_MAP`, generates new credentials, reassigns any invoices billed to the old ID
  (Student case only), marks the old user "Converted".
- private:
  - `- makeUsername(name, db)` / `- randomPassword()` — same as above.
  - `- CONVERT_MAP` (const) — pending→final account-type mapping table with prefix and an
    `extra()` fields factory per type.

### Services / Billing Config

#### app/api/services/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `ensureScheduleGenerated`
  (@/lib/scheduleGen), `requireSession, requireManagement` (@/lib/authz), `CURRENCIES`
  (@/lib/accountTypes), `BILLING_TYPES` (@/lib/billing)
- `GET(req)` (async) — any logged-in session; regenerates schedule if needed; returns all
  `db.services`.
- `POST(req)` (async) — Management-only; body `{ name, type, group, rates:[{currency,rate,
  description?,billingType?}], batch?, board?, courseClass?, subjectCode?, subjectName?,
  fullSubjectName?, occurrences:[{day,time,duration,facilitator}], recordingsLink?, syllabusLink?,
  worksheetsLink?, gcrLink? }`; validates name/type/group/occurrences presence and rates
  validity; creates a Service with generated OccuranceList and stored Rates, applies cohort and
  student-link fields conditionally on Group, regenerates schedule.
- `PATCH(req)` (async) — Management-only; body adds `serviceId` plus the same shape as POST
  (occurrences/rates may each carry an existing id to preserve identity); re-validates, replaces
  Name/Type/Group/Rates/OccuranceList wholesale (existing ids preserved, new ones minted),
  reapplies cohort/student-link fields, regenerates schedule.
- `export const ALL_GROUPS` — the six valid account-type group values
  (`["Student","Teacher","Staff","Management","Parent","Ambassador"]`).
- private:
  - `- isValidGroup(group)` — non-empty array whose every entry is in ALL_GROUPS.
  - `- normalizeRates(body)` — normalizes a request body's rates into `{currency,rate}[]` shape,
    accepting either the new `rates` array or a legacy single top-level currency/rate pair.
  - `- validateRates(rates)` — non-empty; each currency in CURRENCIES; rate non-negative;
    description ≤40 chars; billingType (if given) in BILLING_TYPES.
  - `- toStoredRates(db, rates)` — converts normalized rate input into stored
    `{RateID, Currency, Rate, Description, BillingType}` objects, reusing an existing rateId or
    minting a new one.
  - `- hasCohortFields(group)` — true if Group includes "Student" or "Teacher".
  - `- applyCohortServiceFields(service, body, group)` — sets/clears Batch/Board/CourseClass/
    SubjectCode/SubjectName/FullSubjectName.
  - `- applyStudentLinkFields(service, body, group)` — sets/clears RecordingsLink/SyllabusLink/
    WorksheetsLink/GCRLink (Student-group services only).

#### app/api/enrollments/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement` (@/lib/authz),
  `ratesOf` (@/lib/billing)
- `GET(req)` (async) — Management-only; returns all `db.enrollments`.
- `POST(req)` (async) — Management-only; body `{ userId, serviceId, rateId?, startDate?,
  endDate? }`; validates user/service exist, no duplicate enrollment, resolves rate, validates
  date range; creates the enrollment record.
- `PATCH(req)` (async) — Management-only; body `{ enrolmentId, userId, serviceId, rateId?,
  startDate?, endDate? }`; re-validates against merged old+new values, updates in place
  (start/end date fully replaceable, including clearing back to `""`).
- `DELETE(req)` (async) — Management-only; body `{ enrolmentId }`; removes by id.
- private:
  - `- resolveRate(service, rateId)` — picks the matching rate (or first rate if none given);
    returns `{error}` if `rateId` doesn't match any of the service's rates.
  - `- validateDateRange(startDate, endDate)` — both dates (if present) match `YYYY-MM-DD` and
    `startDate ≤ endDate`.

### Schedule / Booking

#### app/api/schedule/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `ensureScheduleGenerated,
  isSlotBooked, requiredGroupForBookingType, groupMatches, normalizeGroup, sortByDateTime,
  BOOKING_TYPES` (@/lib/scheduleGen), `requireSession, requireManagement` (@/lib/authz)
- `GET(req)` (async) — any logged-in session; regenerates schedule if needed; returns all
  scheduleItems (sorted) plus the unbooked "openPoolSlots" subset.
- `POST(req)` (async) — Management-only; body `{ serviceType, serviceId, date, time, duration,
  facilitator }`; validates serviceType is a BOOKING_TYPES value with required fields, validates
  the target service's Group matches the required group for that booking type; creates a
  manually-offered pool ScheduleItem (`OccuranceID: null`).
- private: none

#### app/api/schedule/pick/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `serviceGroupOf,
  requiredGroupForBookingType, groupMatches, BOOKING_TYPES` (@/lib/scheduleGen),
  `requireSelfOrManagement` (@/lib/authz)
- `POST(req)` (async) — body `{ scheduleId, userId, type }`; self-or-management auth; validates
  slot exists, `type` is valid, and the slot's service group matches the required group; blocks
  duplicate active requests by the same user; creates a Pending TrialItem (type "Trial") or
  InterviewItem (the three Interview types).
- private: none

#### app/api/schedule/requests/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `BOOKING_TYPES` (@/lib/scheduleGen),
  `requireManagement` (@/lib/authz)
- `GET(req)` (async) — Management-only; returns pending Trial/Interview requests joined with
  requester name/type and slot details for the approval UI.
- `PATCH(req)` (async) — Management-only; body `{ type, id, action: "approve"|"reject" }`;
  validates type/action; approve→"Scheduled" / reject→"Rejected" on the matching trial or
  interview item.
- private (defined inside `GET`, closing over `db`):
  - `- nameOf(userId)` — user Name lookup (falls back to the ID).
  - `- typeOf(userId)` — user UserType lookup (used as RequesterType).
  - `- slotOf(scheduleId)` — schedule item lookup by ScheduleID.

#### app/api/schedule/image/route.js
- imports: `NextResponse`, `readDB` (@/lib/db), `drawSchedule` (@/lib/scheduleImage),
  `normalizeTimezone` (@/lib/timezones), `requireSelfOrParentOrManagement` (@/lib/authz)
- `GET(req)` (async) — query `?userId=&download=`; self/parent/management auth; only
  Student/Teacher/Staff supported; builds an "entity" (name, role, timezone, className) and
  weekly schedule entries from the user's enrolled services' OccuranceList, renders a PNG via
  `drawSchedule`, streams it back (inline or attachment per `download`).
- private:
  - `- buildEntries(db, userId)` — collects `{name, day, time}` entries from every occurrence of
    every service the user is enrolled in.

### Trial / Interview Flows

#### app/api/trial-feedback/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `requireSelfOrManagement` (@/lib/authz)
- `POST(req)` (async) — body `{ trialId, feedback }`; self-or-management auth against
  `trial.TrialAccID`; sets Feedback and `Status: "FeedbackSubmitted"`.
- private: none

#### app/api/trial-enroll/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement`
  (@/lib/authz), `ratesOf, rateById` (@/lib/billing)
- `POST(req)` (async) — Management-only; body `{ trialId }`; requires
  `trial.Status === "FeedbackSubmitted"`, not already `ServiceAdded`, and the TrialAcc already
  Converted to a Student; creates (or reuses) an Enrollment at the trialed Service's default
  rate, creates (or reuses) a one-month-advance Draft Invoice for the current year/month, marks
  `trial.ServiceAdded = true`.
- private: none

#### app/api/interview-task/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `requireSelfOrManagement` (@/lib/authz)
- `POST(req)` (async) — body `{ interviewId, link }`; self-or-management auth (the interviewee);
  sets TaskSubmissionLink and `Status: "TaskSubmitted"`.
- private: none

#### app/api/interview-offer/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `requireManagement,
  requireSelfOrManagement` (@/lib/authz)
- `POST(req)` (async) — body `{ interviewId, action: "send"|"accept"|"waitlist"|"reject"|
  "unsend", feedback?, offerLetterLink? }`; "accept" requires self-or-management, everything else
  Management-only; transitions the interviewItem's Status accordingly.
- private: none

### Attendance

#### app/api/attendance/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `requireManagement,
  requireSelfOrManagement` (@/lib/authz)
- `GET(req)` (async) — Management-only; returns all `db.attendanceItems`.
- `POST(req)` (async) — body `{ scheduleItemId, userId, status, loggedDuration }`; self-or-
  management auth; validates the slot exists and no duplicate attendance record exists;
  creates an AttendanceItem (defaults Status "Present", LoggedDuration to the slot's Duration).
- private: none

### Billing (Invoices / Paychecks)

#### app/api/invoices/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `computeHoursAndAmount,
  ratesOf, rateById, isEnrollmentActiveForMonth` (@/lib/billing), `getRateToINR`
  (@/lib/fxRates), `requireManagement, requireSelfOrParentOrManagement` (@/lib/authz)
- `GET(req)` (async) — Management-only; returns all `db.invoices`.
- `POST(req)` (async) — Management-only; body `{ action: "manual"|"generate", ... }`. "manual":
  one ad-hoc invoice for `{studentId, serviceId, year, month, amount}` (blocks duplicates and
  enrollment-inactive/OneOff-already-billed cases), auto-fills INRAmount via FX rate.
  "generate": bulk-drafts one Draft invoice per active Student enrollment for `{year, month}`
  (skipping existing/OneOff-already-billed), computing hours/amount via `lib/billing`.
- `PATCH(req)` (async) — body `{ invoiceId, scheduledHours?, attendedHours?, amount?,
  inrAmount?, inrDue?, status?, studentPaidFlag? }`; management-only fields require management
  auth, else self/parent/management (studentPaidFlag-only edits); updates whichever fields are
  provided.
- `DELETE(req)` (async) — Management-only; body `{ invoiceId }`; removes by id.
- private: none (relies on imported `lib/billing` helpers).

#### app/api/invoices/pdf/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `drawDocumentPDF` (@/lib/pdfDoc),
  `requireSelfOrParentOrManagement` (@/lib/authz), `convertRecordTotal, convertINRAmount`
  (@/lib/fxRates), `amountDueInOwnCurrency` (@/lib/billing)
- `GET(req)` (async) — query `?invoiceId=`; self/parent/management auth; resolves invoice/
  service currency, converts total & due amounts into the student's own currency (persisting
  any new FX cache entries), renders and streams back an Invoice PDF via `drawDocumentPDF`
  (`Content-Disposition: attachment`).
- `export const TERMS` — the fixed payment terms/refund policy text block used on every invoice.
- private: none (all logic inline in `GET`).

#### app/api/invoices/mark-paid/route.js
- imports: `NextResponse`, `readDB, writeDB` (@/lib/db), `requireSelfOrParentOrManagement`
  (@/lib/authz), `uploadPaymentProof` (@/lib/storage)
- `POST(req)` (async) — multipart form `{ invoiceId, file }`; requires a non-empty file
  attachment; self/parent/management auth; uploads the proof file, sets `StudentPaidFlag=true`
  and `PaymentProofPath` on the invoice.
- private: none

#### app/api/invoices/proof/route.js
- imports: `NextResponse`, `readDB` (@/lib/db), `requireSelfOrParentOrManagement` (@/lib/authz),
  `signedProofUrl` (@/lib/storage)
- `GET(req)` (async) — query `?invoiceId=`; requires a PaymentProofPath to exist, self/parent/
  management auth, then 302-redirects to a short-lived signed URL for the proof file.
- private: none

#### app/api/paychecks/route.js
- imports: `NextResponse`, `readDB, writeDB, nextId` (@/lib/db), `computeHoursAndAmount,
  ratesOf, rateById, isEnrollmentActiveForMonth` (@/lib/billing), `getRateToINR`
  (@/lib/fxRates), `requireManagement, requireSelfOrManagement` (@/lib/authz)
- `GET(req)` (async) — Management-only; returns all `db.paychecks`.
- `POST(req)` (async) — Management-only; mirror of invoices POST but for Staff/Teacher/
  Ambassador: "manual" creates one ad-hoc paycheck, "generate" bulk-drafts one per active staff
  enrollment for `{year, month}`.
- `PATCH(req)` (async) — same self/management field-split as invoices PATCH, toggling
  `staffReceivedFlag` instead of `studentPaidFlag`.
- `DELETE(req)` (async) — Management-only; body `{ paycheckId }`; removes by id.
- private: none

#### app/api/paychecks/pdf/route.js
- imports: `NextResponse`, `readDB` (@/lib/db), `drawPayslipPDF` (@/lib/pdfDoc),
  `FIXED_DEPARTMENT` (@/app/api/users/route), `requireSelfOrManagement` (@/lib/authz)
- `GET(req)` (async) — query `?paycheckId=`; self-or-management auth; computes department
  fallback, YTD gross/employer SOCSO figures, an optional converted-total line, renders and
  streams a Payslip PDF via `drawPayslipPDF`.
- `MONTH_ABBR` / `EMPLOYER_SOCSO_RATE` (module-level, not exported) — 3-letter month codes /
  flat 0.0175 statutory rate.
- private: none (all logic inline in `GET`).

---

**Cross-cutting patterns across app/api:** Nearly every handler starts with
`const { error } = requireX(req); if (error) return error;` before touching `db`, using one of
four `@/lib/authz` guards: `requireManagement` (admin-only), `requireSelfOrManagement` (an
account acting on its own record or Management), `requireSelfOrParentOrManagement` (adds a
paying parent), and `requireSession` (any logged-in user — only `/api/schedule` GET and
`/api/services` GET). PATCH handlers mixing Management-only fields with a self-toggleable flag
(invoices, paychecks) branch auth dynamically on which fields are present. `readDB`/`writeDB`/
`nextId` from `@/lib/db` are the universal persistence primitives — nearly every POST/PATCH/
DELETE ends with `await writeDB(db)` then returns the affected record as JSON. A shared unique-
username/random-password pair (`makeUsername`/`randomPassword`) is duplicated verbatim across
`convert`, `regforms`, and `users` rather than factored into a shared module. Bulk "generate" vs
single "manual" POST actions in `invoices`/`paychecks` are structurally identical (same dedup/
OneOff/enrollment-active checks, same FX auto-fill). PDF-producing GET routes both stream a
Buffer with `Content-Disposition: attachment` and `Cache-Control: no-store`.

---

## Part 2 — lib/ Modules (13 files)

### lib/accountTypes.js
- imports: none (pure data module)
- `export const DEPARTMENTS` = `["Marketing", "Finance", "HR", "IT", "PR"]`
- `export const ROLE_ELIGIBLE` = `["Teacher", "Staff", "Ambassador"]`
- `export const FIXED_DEPARTMENT` = `{ Teacher: "Teacher", Ambassador: "Ambassador" }`
- `export const CURRENCIES_FULL` = array of `{ code, name }` — every active ISO 4217 code
  (~170 entries)
- `export const CURRENCIES` = `CURRENCIES_FULL.map((c) => c.code)` (bare code list)
- private: none

### lib/authz.js
- imports: `NextResponse` (next/server), `getSession` (@/lib/session)
- `requireSession(req)` — `{ session, error: null }` or `{ session: null, error: 401 }`
- `requireManagement(req)` — as above + `session.userType === "Management"` check (403)
- `requireSelfOrManagement(req, targetUserId)` — Management OR `session.userId === targetUserId`
- `requireSelfOrParentOrManagement(req, db, targetUserId)` — adds: caller is a Parent whose
  `StudentIDs` includes `targetUserId`
- private: none

### lib/billing.js
- imports: none (pure logic module)
- `export const BILLING_TYPES` = `["Monthly", "Hourly", "OneOff"]`
- `ratesOf(service)` — returns `service.Rates`, or synthesizes a one-entry legacy array
- `rateById(service, rateId)` — finds the matching rate in `ratesOf(service)`, falling back to
  the first rate
- `amountDueInOwnCurrency(record, fallbackCurrency = "INR")` — derives the outstanding balance
  in the record's own currency from `INRDue`, via the FX rate implied by `Amount`/`INRAmount`
- `isEnrollmentActiveForMonth(enrollment, year, month)` — month-granularity StartDate/EndDate
  check (true if unbounded)
- `computeHoursAndAmount(db, { userId, serviceId, year, month })` (returns object, not a
  Promise — no I/O) — sums ScheduleItem.Duration (scheduledHours) and AttendanceItem.
  LoggedDuration (attendedHours), computes `amount` per billingType (Hourly:
  `rate*attended`; OneOff: flat `rate`; Monthly: `(rate/scheduledHours)*attendedHours`);
  returns `{ scheduledHours, attendedHours, amount, currency, billingType }`
- private: none

### lib/fxRates.js
- imports: none
- `getRateToINR(db, currency, year, month)` (async) — `1` if currency is falsy/"INR"; checks
  `db.fxRates` cache; on miss, tries each `SOURCES` mirror (jsdelivr, then pages.dev) for the
  1st of that month, caches and returns the rate, or `null` if every source fails
- `convertRecordTotal(db, record, toCurrency)` (async) — converts an invoice/paycheck's
  `Amount` into `toCurrency`; pivots through `Amount` directly if the record's own currency IS
  INR, else through the frozen `INRAmount`; returns `null` if the target-side rate lookup fails
- `convertINRAmount(db, inrAmount, toCurrency, year, month)` (async) — converts an
  INR-denominated figure to `toCurrency`; short-circuits to the amount unchanged if target is
  INR or amount is 0 (no FX lookup needed); else does one live/cached lookup
- private:
  - `- SOURCES` (const array of URL-builder functions, not exported)
  - `- cacheKey(currency, year, month)` — builds `"{currency}-{year}-{MM}"`

### lib/db.js  (EXTENDED — commit `8b49316`, new `apiKeys` collection)
- imports: `fs`, `path`, `* as supabaseBackend` (./db-supabase)
- `readDB()` (async) — delegates to `supabaseBackend.readDB()` if `DB_BACKEND=supabase`, else
  `readDBJson()`
- `writeDB(db)` (async) — same delegation pattern
- `nextId(db, prefix)` — increments `db.counters[prefix]`, returns zero-padded ID like
  `"STU-0001"` (mutates in-memory only; caller must persist via `writeDB`)
- private:
  - `- readDBJson()` — creates `data/db.json` with an `EMPTY` shape if missing, reads/parses it,
    merges onto `EMPTY` to backfill missing keys
  - `- writeDBJson(db)` — `JSON.stringify`s and writes to `DB_PATH`
  - `- DB_PATH`, `- EMPTY`, `- BACKEND` (module-local, not exported) — `EMPTY` gained a 13th
    key, `apiKeys: []`, for `app/api/apikeys/route.js`'s bookkeeping records.

### lib/db-supabase.js  (EXTENDED — commit `8b49316`, new `apiKeys` collection)
- imports: `createClient` (@supabase/supabase-js)
- `readDB()` (async) — calls Postgres RPC `read_full_db()`; returns the aggregated DB JSON blob
  (this RPC's own SQL definition was separately updated, outside this file, to also aggregate
  the new `apikeys` table into the `apiKeys` key of its returned JSON — see `CLI.md`)
- `writeDB(db)` (async) — for each `COLLECTIONS` entry, concurrently calls RPC
  `sync_table(p_table, p_rows, p_ids)` (upsert+delete-stale in one round trip); then upserts
  `counters` rows; then upserts `fxrates` rows and deletes stale ones no longer in the current
  key set
- `nextId(db, prefix)` — identical contract to `lib/db.js`'s version
- `- COLLECTIONS` (module-local map, not exported) — collection name → `[table name, ID field]`:
  `users→[users,UserID]`, `credentials→[credentials,UserID]`, `regForms→[regforms,RegFormID]`,
  `services→[services,ServiceID]`, `scheduleItems→[scheduleitems,ScheduleID]`,
  `enrollments→[enrollments,EnrolmentID]`, `trialItems→[trialitems,TrialID]`,
  `interviewItems→[interviewitems,InterviewID]`, `attendanceItems→[attendanceitems,
  AttendanceID]`, `invoices→[invoices,InvoiceID]`, `paychecks→[paychecks,PaycheckID]`,
  `leads→[leads,LeadID]`, `apiKeys→[apikeys,ApiKeyID]` (NEW) (counters/fxRates handled
  separately, not part of COLLECTIONS)
- private: none besides COLLECTIONS/supabase client

### lib/client.js  ("use client" — the one lib/ file meant for browser use)
- imports: `"use client"`, `useState` (react)
- `getCurrentUser()` — reads/parses `dcp1_user` from `localStorage`; `null` on SSR/absent
- `setCurrentUser(user)` — writes `JSON.stringify(user)` to `localStorage`
- `logout()` — clears `localStorage`, fires `POST /api/logout` fire-and-forget
- `roleHomePath(userType)` — UserType → dashboard path string (`"/"` default)
- `normalizeGroup(raw)` — array passthrough / legacy `"Both"` → `["Student","Teacher"]` / wrap
  single value (default `"Student"`)
- `groupMatches(serviceGroup, requiredGroup)` — boolean membership check via `normalizeGroup`
- `roleGroupOf(user)` — returns `user.UserType`
- `useSort(items, initialKey, initialDir = "asc")` (React hook) — holds sort state, returns
  `{ sorted, sortKey, sortDir, toggleSort }` (case-insensitive sort, nulls last)
- `api(path, options = {})` (async) — `fetch` wrapper; on 401 clears localStorage + redirects to
  `/login` (never-resolving Promise); throws `Error(data.error)` on non-ok; else returns parsed JSON
- `formatRate(r, { showDescription = false } = {})` — `"CURRENCY Rate"` or `"CURRENCY Rate
  (Description)"`; `"—"` if falsy
- `formatRates(s)` — every rate on a service, joined `" / "`, each via `formatRate(r,
  {showDescription:true})`
- private: `- KEY = "dcp1_user"` (module-local, not exported)

### lib/pdfDoc.js
- imports: `path`, `createCanvas, loadImage, registerFont` (canvas)
- `drawDocumentPDF(data)` (async) — Invoice/Paycheck-style branded A4 PDF (logo, title, date/
  terms meta, company line + Balance Due box, party block, fixed-10-row line-item table,
  Tax/Discount/Total summary, wrapped Terms paragraph); returns a `Buffer`
- `drawPayslipPDF(data)` (async) — flat statutory-style payslip (boxed key/value header,
  "CURRENT MONTH PAYROLL DETAIL" Earnings/Deductions via `payrollTable`, Employer SOCSO line,
  optional converted-total line, optional YTD section gated by `data.showYtd`); returns a `Buffer`
- private:
  - `- fmtDate(d)` — `"Mon D, YYYY"` (drawDocumentPDF only)
  - `- rightText(ctx, text, x, y)` — right-aligned `fillText` (drawDocumentPDF only)
  - `- psRow(ctx, x, y, w, h, fill)` — filled+bordered rect (drawPayslipPDF only)
  - `- payrollTable(title, rows, totalLabel, totalValue)` — closure inside `drawPayslipPDF`
    (captures ctx/y/columns/currency), draws one Earnings/Deductions section
  - layout/color consts (not exported): `ASSETS_DIR`, `FONT_PATH`, `FONT_BOLD_PATH`, `PAGE_W`,
    `PAGE_H`, `MARGIN_L`, `MARGIN_R`, `BROWN`, `BROWN_DARK`, `TAN`, `BORDER`, `TABLE_ROWS`,
    `PS_GRAY`, `PS_GRAY_LIGHT`, `PS_BORDER`, `PS_TEXT`, `PS_TABLE_W`

### lib/scheduleGen.js
- imports: `nextId` (./db)
- `export const BOOKING_TYPES` = `Object.keys(REQUIRED_GROUP)` = `["Trial",
  "TeacherInterview", "StaffInterview", "AmbassadorInterview"]`
- `normalizeGroup(raw)` — same logic as `lib/client.js`'s version (duplicated, not shared)
- `serviceGroupOf(db, serviceId)` — `normalizeGroup(service.Group)` by ServiceID lookup
- `requiredGroupForBookingType(type)` — `REQUIRED_GROUP[type]`, default `"Staff"`
- `groupMatches(serviceGroup, requiredGroup)` — same logic as `lib/client.js`'s version
- `sortByDateTime(items)` — new array sorted ascending by `Date+Time` (localeCompare)
- `isSlotBooked(db, scheduleId)` — true if any trial/interview item references it with
  `Status === "Scheduled"`
- `ensureScheduleGenerated(db)` — for every service occurrence, advances weekly from the latest
  already-generated date (or a week before today) through "end of next calendar month",
  pushing new ScheduleItem records; mutates `db` in place; returns count of newly generated items
- private:
  - `- nextDateForDay(fromDate, dayName)` — next date on/after `fromDate` on the given weekday
  - `- fmtDate(d)` — local (not UTC) `"YYYY-MM-DD"`
  - `- REQUIRED_GROUP` (module-local map, not exported) — booking type → required Service Group

### lib/scheduleImage.js
- imports: `path`, `createCanvas, loadImage, registerFont` (canvas), `timezoneLabel as
  lookupTimezoneLabel` (@/lib/timezones)
- `drawSchedule(entity, entries)` (async) — loads the role's template PNG
  (student/teacherRole/staff), draws Name/Class/Timezone onto fixed coordinates, computes the
  distinct times actually used (or `FALLBACK_TIMES`), repaints the row area fresh, fills each
  entry's word-wrapped class label into its day/time cell; returns a `Buffer` (PNG)
- private:
  - `- themeFor(role)` — picks `THEMES.teacherRole`/`.staff`/`.student` (default)
  - `- shortTimezoneLabel(tz)` — truncates a timezone label to 19 chars + "..." if >22
  - `- fitText(ctx, text, maxWidth)` — shrinks text char-by-char with `…` until it fits
  - `- colLeft(col)` — x-coordinate of a day column index
  - `- to12Hour(time24)` — `"HH:MM"` → `"H:MM AM/PM"`
  - `- wrapText(text, width = 15)` — greedy word-wrap into ~width-char lines
  - layout consts (not exported): `ASSETS_DIR`, `FONT_PATH`, `DAYS`, `DAY_TO_COL`, `NUM_COLS`,
    `GRID_TOP_LEFT_X`, `GRID_COL_WIDTH`, `GRID_COL_PADDING`, `ROW_AREA`, `TIME_COL_LEFT`,
    `TIME_COL_WIDTH`, `FALLBACK_TIMES`, `THEMES`

### lib/session.js  (EXTENDED — commit `8b49316`, API-key additions)
- imports: `crypto`
- `export const SESSION_COOKIE` = `"dcp1_session"`
- `sessionCookieFor(user)` — HMAC-SHA256-signs `{userId, userType, iat}`; returns a cookie
  descriptor (`httpOnly`, `sameSite: "lax"`, `path: "/"`, `maxAge: 604800`)
- `clearedSessionCookie()` — same shape, empty value, `maxAge: 0`
- `signApiKey({ userId, userType, expiresInSeconds = API_KEY_DEFAULT_TTL_SECONDS })` (NEW) —
  mints a long-lived Bearer token using the exact same `sign()` used for session cookies, just
  with a `kind: "apikey"` marker, a random `apiKeyId` (embedded in the token AND meant to be
  stored separately as a DB bookkeeping record — see `app/api/apikeys/route.js`), and an `exp`
  timestamp (default 90 days out); returns `{ token, apiKeyId, iat, exp }`.
- `getSession(req)` (CHANGED) — now checks TWO sources in order: (1) the session cookie, same
  as before; (2) if no valid cookie, an `Authorization: Bearer <token>` header, verified the
  same way but additionally requiring `kind === "apikey"`. Returns `{userId, userType}` from
  whichever source verified, or `null` if neither did. A cookie is preferred when both happen
  to be present. Every existing caller (`lib/authz.js`'s `requireX` functions, unchanged) keeps
  working exactly as before — this function's contract/shape didn't change, only what it checks.
- private:
  - `- API_KEY_DEFAULT_TTL_SECONDS = 60*60*24*90` (NEW, module-local const, not exported) — 90
    days.
  - `- base64url(input)` — `Buffer.from(input).toString("base64url")`
  - `- sign(payload)` — base64url-encodes + HMAC-SHA256-signs (env `SESSION_SECRET`, warns on an
    insecure dev fallback in production); returns `"{body}.{sig}"`
  - `- verify(token)` (CHANGED) — recomputes HMAC, compares via `crypto.timingSafeEqual`
    (constant-time); parses the payload and NEW: additionally checks a `payload.exp` field if
    present (only ever set on API-key tokens — session cookies rely on the cookie's own
    `maxAge` instead) and returns `null` if expired; returns the parsed payload or `null`
    (never throws) otherwise. This is the ONLY place API-key revocation-by-expiry is enforced —
    there is no database lookup anywhere in this verification path (see
    `app/api/apikeys/route.js`'s DELETE for what deleting a key's bookkeeping record does and
    does NOT do).

### lib/storage.js
- imports: `createClient` (@supabase/supabase-js)
- `uploadPaymentProof(invoiceId, file)` (async) — derives a lowercase extension, builds path
  `"{invoiceId}/{timestamp}.{ext}"`, uploads to the `payment-proofs` Supabase Storage bucket;
  throws on failure; returns the storage path string
- `signedProofUrl(path, expiresInSeconds = 3600)` (async) — creates a signed URL (default
  1-hour expiry); throws on failure; returns the signed URL string
- private: `- supabase` (client), `- BUCKET = "payment-proofs"` (module-local, not exported)

### lib/timezones.js
- imports: none
- `export const TIMEZONE_GROUPS` = `[{label:"Common", options: COMMON}, {label:"All timezones",
  options: OTHERS}]` — `COMMON` is 5 curated zones (UK, India, Saudi, Pakistan, UAE), `OTHERS`
  is every other IANA timezone id from `Intl.supportedValuesOf("timeZone")`
- `isValidTimezone(tz)` — boolean membership in the combined common+other set
- `normalizeTimezone(tz)` — maps legacy `"India"`/`"Saudi"` to IANA equivalents, else passes
  through (default `"Asia/Kolkata"` if falsy)
- `timezoneLabel(tz)` — normalizes, then returns the curated COMMON label or a friendly
  (underscore-replaced) IANA id
- private: `- friendlyLabel(id)` — underscore→space replacement

*(Note: `lib/schedule-image/` contains only an `assets/` subdirectory — fonts, template PNGs,
logo — referenced by `lib/pdfDoc.js` and `lib/scheduleImage.js` via
`path.join(process.cwd(), "lib", "schedule-image", "assets")`; no additional JS modules there.)*

---

## Part 3 — CLI & MCP (`cli/**`, `mcp/**`, 3 files)  (NEW — commit `8b49316`)

Full-parity terminal/agent access to the same `app/api/**` routes documented in Part 1,
authenticated via the `apikeys` mechanism documented in Part 2's `lib/session.js` entry. Not
Next.js route files — plain Node ESM scripts, run directly (`node cli/dcp1.mjs ...`) or as a
long-running stdio process (`node mcp/server.mjs`). See `CLI.md` for user-facing usage docs;
this section is the same exhaustive function-level treatment as Parts 1-2.

### cli/core.mjs
- imports: `fs`, `path`, `os` (Node built-ins only — no npm dependencies)
- `loadConfig()` — reads/parses `~/.dcp1/config.json`; returns `{}` on any read/parse failure
  (missing file, corrupt JSON, etc.) rather than throwing.
- `saveConfig(config)` — `mkdir -p ~/.dcp1`, then writes `config` as pretty-printed JSON with
  file mode `0o600` (owner-read/write only — the file holds a Bearer credential).
- `clearConfig()` — deletes `~/.dcp1/config.json`; swallows the error if it's already gone
  (idempotent).
- `resolveAuth()` — merges config: `DCP1_API_URL`/`DCP1_API_KEY` env vars take priority over
  `loadConfig()`'s `baseUrl`/`token`, falling back to `http://localhost:3000` if neither is set;
  returns `{ baseUrl, token, config }`.
- `apiRequest(method, urlPath, body)` (async) — the JSON request/response client every CLI
  command and MCP tool goes through: throws if no token is resolved; sends
  `Authorization: Bearer <token>` + JSON body; parses the response JSON; throws
  `Error(data.error || "... failed (HTTP <status>)")` on any non-2xx response; else returns the
  parsed data.
- `apiRequestBinary(urlPath)` (async) — same auth/error-handling shape as `apiRequest`, but for
  the 3 binary-response GET routes (invoice/paycheck PDFs, schedule PNG); returns a `Buffer`
  instead of parsed JSON; on error, tries to parse the response body as JSON for an `.error`
  field, falling back to the raw text.
- `loginAndMintKey(baseUrl, username, password, { label, expiresInDays } = {})` (async) — the
  CLI/MCP bootstrap flow: `POST /api/login` with the given credentials (real password, used
  once), extracts the `Set-Cookie` session cookie from the raw response headers (this is the
  ONE place in the whole CLI/MCP layer that ever holds a session cookie — everywhere else uses
  only the minted API key), immediately uses that cookie for one `POST /api/apikeys` call
  (`{ userId: <from login response>, label, expiresInDays }`), then calls `saveConfig()` with
  the resulting token/apiKeyId/userId/userType and returns that same data. The cookie is never
  stored or reused after this function returns.
- private: `- CONFIG_DIR = ~/.dcp1`, `- CONFIG_PATH = ~/.dcp1/config.json` (module-local, not
  exported)

### cli/dcp1.mjs  (executable, `#!/usr/bin/env node`; `package.json`'s `bin.dcp1`)
- imports: `apiRequest, apiRequestBinary, loginAndMintKey, loadConfig, clearConfig, resolveAuth`
  (./core.mjs), `fs`
- `main()` (async, not exported — the script's own entry point, invoked unconditionally at the
  bottom of the file via `main().catch(...)`) — parses `process.argv`, dispatches to one of 15
  command groups (see below), prints the result as pretty JSON via `print()`, and on any thrown
  `Error` prints `"Error: <message>"` to stderr and exits with code 1.
- private (all non-exported — this file has no exports, it's a script, not a module others
  import):
  - `- parseArgs(argv)` — hand-rolled flag parser (no npm dependency): splits `argv` into
    `positional` (non-`--` args) and `flags` (`--key value`, `--key=value`, or bare `--key` as
    `true`); returns `{ positional, flags }`.
  - `- bodyFromFlags(flags)` — the `--json '<raw JSON>'` escape hatch used by most create/update
    commands (rather than a hand-rolled `--flag` per field, since body shapes vary a lot between
    routes — Users/Services especially); `JSON.parse`s `flags.json`, throwing a clearer error
    message on invalid JSON; returns `undefined` if `--json` wasn't passed at all.
  - `- print(data)` — `console.log(JSON.stringify(data, null, 2))`.
  - `- writeBinary(buffer, outPath, defaultName)` (async) — writes a `Buffer` to `outPath` (or
    `defaultName` if `--out` wasn't given) via `fs.writeFileSync`; logs the byte count and path.
  - `- HELP` (const, not exported) — the full usage string printed by `dcp1 help`.
  - **Command dispatch inside `main()`** (all inline `if (group === "...")` branches, not
    separate named functions — listed here as the effective command surface):
    - `login <username> <password> [--label] [--expires-days]` → `loginAndMintKey()`
    - `logout` → `clearConfig()`
    - `whoami` → prints the cached `loadConfig()` identity
    - `apikeys create --user <id> [--label] [--expires-days]` / `list` / `delete <id>` →
      `POST`/`GET`/`DELETE /api/apikeys`
    - `users list` / `create --json` / `update <userId> --json` → `/api/users`
    - `services list` / `create --json` / `update <serviceId> --json` → `/api/services`
    - `enrollments list` / `create --json` / `update <id> --json` / `delete <id>` →
      `/api/enrollments`
    - `schedule list` / `create --json` / `pick --json` / `requests list` / `requests review
      --json` / `image <userId> [--out]` → `/api/schedule`, `/api/schedule/pick`,
      `/api/schedule/requests`, `/api/schedule/image` (binary)
    - `attendance list` / `log --json` → `/api/attendance`
    - `invoices list` / `generate --year --month` / `manual --json` / `update <id> --json` /
      `delete <id>` / `pdf <id> [--out]` → `/api/invoices`, `/api/invoices/pdf` (binary)
    - `paychecks list` / `generate --year --month` / `manual --json` / `update <id> --json` /
      `delete <id>` / `pdf <id> [--out]` → `/api/paychecks`, `/api/paychecks/pdf` (binary)
    - `trial feedback --json` / `enroll --json` → `/api/trial-feedback`, `/api/trial-enroll`
    - `interview task --json` / `offer --json` → `/api/interview-task`, `/api/interview-offer`
    - `convert <accountId>` → `/api/convert`
    - `regforms list` / `review --json` → `/api/regforms`
    - `leads list` / `create --json` → `/api/leads`
    - `me [<userId>]` (defaults to the logged-in account's own id) → `/api/me`
    - `help` / `--help` / `-h` / no args → prints `HELP`
    - anything else → throws "Unknown command"

### mcp/server.mjs  (executable, `#!/usr/bin/env node`; run via `npm run mcp`)
- imports: `McpServer` (@modelcontextprotocol/sdk/server/mcp.js), `StdioServerTransport`
  (@modelcontextprotocol/sdk/server/stdio.js), `z` (zod), `apiRequest, apiRequestBinary,
  loginAndMintKey, loadConfig, resolveAuth` (../cli/core.mjs)
- Not a set of exported functions — a script that constructs one `McpServer` instance,
  registers 5 tools on it, and connects it to a `StdioServerTransport` (unconditional top-level
  `await server.connect(transport)` at the bottom of the file, same "runs immediately" shape as
  `cli/dcp1.mjs`'s `main()`).
- Registered tools (each via `server.registerTool(name, {title, description, inputSchema}, cb)`):
  - `dcp1_api_catalog` — no input; returns the module-level `API_CATALOG` string (a condensed,
    hand-written route reference covering every group documented in Part 1, kept in sync
    manually rather than generated).
  - `dcp1_whoami` — no input; throws if `resolveAuth()` has no token; else returns
    `{ userId, userType, baseUrl }` from `loadConfig()`/`resolveAuth()`.
  - `dcp1_login` — input `{ username, password, label?, expiresInDays? }`; calls
    `loginAndMintKey()`, returns `{ loggedInAs, userType, expiresAt }`.
  - `dcp1_request` — input `{ method: "GET"|"POST"|"PATCH"|"DELETE", path, body? }`; the one
    full-parity tool — calls `apiRequest(method, path, body)` directly and returns its result.
    Every other tool exists to make this one discoverable/usable, not to duplicate its coverage.
  - `dcp1_download` — input `{ path }`; calls `apiRequestBinary(path)`, returns
    `{ bytes, base64 }`.
- private:
  - `- callTool(fn)` (async) — shared wrapper every tool callback goes through: awaits `fn()`,
    wraps a successful result as MCP's `{ content: [{ type: "text", text: JSON.stringify(...) }] }`
    shape; on a thrown error, returns the same shape with the error message and `isError: true`
    instead of letting the exception propagate to the MCP transport.
  - `- API_CATALOG` (const, not exported) — the multi-paragraph route-reference string returned
    by `dcp1_api_catalog`.
