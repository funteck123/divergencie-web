# DCP1 — Education Management System

A working local build of the DCP1 UML blueprint (v3). Next.js for both
frontend and backend, a single JSON file (`data/db.json`) as the datastore.

## Setup

```
npm install
npm run dev
```

Open http://localhost:3000

First login (seeded automatically the first time you run the app):

```
Management — username: admin / password: admin123
```

If you ever want to wipe all data and start over:

```
rm data/db.json
npm run seed
```

## How the pieces map to the UML doc (dcp1-uml-v3.md)

| UML class | Where it lives in this build |
|---|---|
| User / Credential | `users` + `credentials` arrays in `data/db.json` |
| RegFormManager | `/api/register` (public submit), `/api/regforms` (Management approve/reject) |
| TrialManager / InterviewManager | `/api/schedule/pick`, `/api/trial-feedback`, `/api/interview-task`, `/api/interview-offer` |
| ServiceManager / ScheduleManager | `/api/services` (create + occurrences), `/api/schedule` (auto-generated + open pool), `lib/scheduleGen.js` |
| EnrolmentManager | `/api/enrollments` |
| AttendanceManager | `/api/attendance` |
| InvoiceManager / PaycheckManager | `/api/invoices`, `/api/paychecks`, prorate math in `lib/billing.js` |

## Walkthrough (matches the flow we designed)

1. **Sign in as Management** (`admin` / `admin123`).
2. Go to **Services** → create a Service with at least one recurring
   occurrence (day/time/duration/facilitator). The schedule generates itself
   automatically — a rolling 4-week window, topped up every time it's read.
3. Go to **Schedule Pool** → offer a Trial or Interview slot. Every slot must
   be tied to a real Service you already created — Trial and Interview are
   never generic, they're always "trying out" or "interviewing for" a
   specific Service.
4. Open `/register` in a new tab (or incognito) → submit an application as
   Trial or Interview.
5. Back in Management → **Applications** → Approve it. Copy the generated
   username/password shown in that row.
6. Sign in as that TrialAcc/InterviewAcc → book the open slot you offered in
   step 3.
   - Trial flow: booking auto-generates a one-month advance Invoice for that
     Service's `MonthlyCost` (flat — there's no attendance yet to prorate
     against). It shows up as a Draft in Management's Billing tab like any
     other invoice: fill INR Amount/Due, Send, and the TrialAcc can mark it
     Paid from their dashboard. After the session, they submit feedback.
   - Interview flow: submit a task link → Management sends the offer letter
     (Pipeline tab) → the InterviewAcc accepts it.
7. Back in Management → **Accounts** → click "Convert to Student/Staff".
   The old TrialAcc/InterviewAcc record stays forever (now locked out of
   login); a brand-new Student/Staff account is issued with fresh
   credentials and nothing carried over.
8. **Enrollments** → enroll the new Student/Staff into the Service.
9. Sign in as that Student/Staff → their schedule now shows the Service's
   sessions → log attendance against one (status + actual hours logged,
   which can differ from the scheduled duration).
10. Back in Management → **Billing** → pick a year/month → "Generate drafts".
    Amount is computed automatically as
    `(Service.MonthlyCost ÷ ScheduledHours) × AttendedHours`. Fill in
    INR Amount / INR Due manually, then Send.
11. The Student/Staff sees the sent invoice/paycheck on their dashboard.
    Students can mark an invoice "Paid".
12. Optional: create a **Parent** account (Accounts tab) linked to a Student
    — it's read-only, showing that child's schedule/attendance/invoices.

## Checklist — things to be able to explain before you consider this "done"

Use this the way we agreed: if you can't explain *why*, not just *that it
works*, go re-read the relevant file before moving on.

- [ ] Why is there one `db.json` instead of one file per class? What would
      change if you split it into `users.json`, `services.json`, etc.?
- [ ] Walk through `ensureScheduleGenerated` in `lib/scheduleGen.js` — why is
      it called on every read instead of on a timer/cron? What's the
      trade-off?
- [ ] Why does the open-pool Trial/Interview slot use `ServiceID: null`
      instead of pointing at a real Service?
- [ ] In `lib/billing.js`, explain each line of `computeHoursAndAmount`
      out loud — what happens if `scheduledHours` is 0, and why did we
      guard for that?
- [ ] Why does converting a TrialAcc set `Status: "Converted"` on the old
      record instead of deleting it or mutating it into the new type?
- [ ] The login endpoint blocks converted accounts — where exactly is that
      check, and what would happen if it were removed?
- [ ] `nextId()` in `lib/db.js` — why prefix-based sequential IDs instead of
      random UUIDs? What would break if two people hit "Create" at the
      exact same millisecond (this app has no lock/transaction — is that a
      real problem here, and why or why not)?
- [ ] Every dashboard passes `userId` as a plain query param / body field
      with no real session or password check after login — find that in the
      code and explain why that's an acceptable shortcut for a local
      learning build, and what would have to change before this touched
      the real internet.

## Known simplifications (flagged on purpose, not accidental gaps)

- **Auth is not secure.** Login checks username/password once, then the
  frontend just remembers `{UserID, UserType, Name}` in `localStorage` and
  trusts it on every subsequent request. Fine for `localhost`; not fine for
  deployment.
- **No concurrent-write protection** on `data/db.json` — every request does
  a full read-modify-write. Fine for one person clicking around; would race
  under real concurrent load.
- **Rolling schedule window is fixed at 4 weeks** (`ROLLING_WEEKS_AHEAD` in
  `lib/scheduleGen.js`), not configurable from the UI yet.
