# DivergenCIE — Content Population Guide
**For: Platform Admin / Management**  
**After completing this guide, every portal will show real operational data.**

---

## How to Use This Guide

Each section lists:
- **What dummy data exists** (seeded automatically — works but not real)
- **How to replace it** (where in the portal or DB)
- **Who is responsible**

Run seed once to populate all dummy data:
```bash
npx tsx prisma/seed.ts
```

Login with any seeded email + password `demo`.

---

## 1. USERS — Replace Dummy Accounts

| Dummy Account | Email | Purpose | Replace by |
|---|---|---|---|
| Admin User | admin@divergencie.co.uk | Management portal | Go to `/portal/management/users` → Add real management user → deactivate dummy |
| Ms Priya Sharma | teacher@divergencie.co.uk | Teacher portal demo | Add real teacher via user management |
| Aryan Patel | pr@divergencie.co.uk | PR staff | Replace with real PR staff |
| Aanya Sharma | student@example.com | Student portal demo | Add real students via management |
| Rajesh Sharma | parent@example.com | Parent portal demo | Add real parents, link to student via `parentId` field |
| Zara Khan | ambassador@example.com | Ambassador portal | Replace when first real ambassador joins |
| James Wilson | candidate@example.com | Candidate portal | Candidates come from careers form |

**How to add real users:** `/portal/management/users` → Add New User → Generate Invite Link → Send to person.

**How to link parent to student:** Currently done via DB. Go to `/portal/management/database` → find parent record → set `parentId` to student's ID.

---

## 2. SYLLABUS ITEMS — Replace with Real Curriculum

**Current dummy:** 11 chapters across IGCSE Maths, A Level Chemistry, IGCSE Physics.

**Replace with real curriculum:**
1. Go to `/portal/management/database` (management only)
2. Or seed directly — edit `prisma/seed.ts` → `mathChapters` array
3. Each item needs: `subject`, `chapterNum`, `title`, `milestone` (`core` | `a*` | `topper`), `order`

**Real subjects to add:** All subjects DC teaches — IGCSE Biology, A Level Biology, SAT Math, IELTS, etc.

**Milestone guide:**
- `core` = must-pass chapter (blue)
- `a*` = required for A* (amber)  
- `topper` = distinction/world-rank level (purple)

---

## 3. ACADEMIC SESSIONS — Teacher Must Submit After Every Class

**Current dummy:** 2 past sessions + 1 upcoming, all for student@example.com.

**How real sessions are created:**
- PR staff creates schedules via `/portal/staff/pr/mapping` (teacher ↔ student assignment)
- When PR creates a group and assigns a student, future sessions can be added
- Teacher submits attendance after class → session marked `completed` → recording auto-published

**TODO for PR team:** Use `/portal/staff/shared/schedule` to add weekly recurring sessions for each teacher-student pair.

---

## 4. RECORDINGS — Auto-Populated from Attendance

**Current dummy:** 2 recordings pointing to Miro board links (placeholder URLs).

**How real recordings appear:**
1. Teacher submits attendance at `/portal/teacher/attendance`
2. Fills in **Whiteboard / Recording Link** field (Zoom recording URL or YouTube)
3. System automatically creates a Recording entry → appears in student `/portal/student/recordings`

**Replace dummy recordings:** After first real session, dummy recordings can be deleted via DB or `/portal/management/database`.

---

## 5. INVOICES — Finance Must Create Real Invoices

**Current dummy:** 1 due invoice (£450, May 2026) + 1 paid (April 2026) for demo student.

**How to create real invoices:**
1. Go to `/portal/staff/finance/invoices` → Generate Invoice
2. Enter Student DB ID (find at `/portal/management/users` → copy cuid from URL or table)
3. Enter month (YYYY-MM format, e.g. `2026-06`), amount in GBP

**Note:** Student ID is the internal cuid (e.g. `clx8abc123...`). Will be made user-friendly in next iteration with a student name search.

---

## 6. RATE CARDS — Finance to Set Real Rates

**Current dummy:** 5 rate cards (IGCSE Foundation, A* Track, World Topper for UK/MY/IN/KSA/PK).

**Replace:** Go to `/portal/staff/finance/rates` → Edit each rate or add new course+country combinations.

**Rate format:** All stored in GBP equivalent. Display currency conversion is frontend-only (not yet implemented — Phase 2).

---

## 7. HR CANDIDATES — Replace with Real Pipeline

**Current dummy:** Sarah Miller (Interview stage) + Linda Chen (Offer Sent).

**Replace:** Go to `/portal/staff/hr/candidates` → Add Candidate → fill real name/email/role/CV link.

**Status flow:** `active` → `Interest` → `Interview` → `Trial Task` → `Offer Sent` → activate as real user.

---

## 8. MARKETING POSTS — Replace with Real Schedule

**Current dummy:** 1 scheduled post, 1 posted, 1 missed.

**Replace:** Go to `/portal/staff/marketing/calendar` → Schedule Post → fill Canva/Drive links + date.

**Mandatory frequency (per PRD):**
- Story: every other day
- Reel: minimum 1/week
- Post: minimum 1/week

When a post is missed, system flags it. Future: auto-creates action ticket to PR/Ops.

---

## 9. CONTENT BANK — Add Real Shared Resources

**Current dummy:** Teacher Onboarding Protocol, Course Catalogue, Finance Claim Guidebook.

**Replace:** Go to `/portal/staff/shared/content-bank` → Add Resource → paste real Drive/Notion/Canva link.

**Per-dept visibility:** Currently all staff see all. Supervisor-only filtering planned for Phase 2.

---

## 10. ANNOUNCEMENTS — Replace Dummy Announcements

**Current dummy:** "May Mock Exam Schedule" + "New Whiteboard Protocol"

**How to add real announcements:** Currently DB only — go to `/portal/management/database` → Announcements table → add rows.

**Future:** Management will have an announcement composer in the dashboard.

---

## 11. CLAIMS — Real Claims Come from Teachers

**Current dummy:** April 2026 approved claim + May 2026 pending claim for demo teacher.

**How real claims work:**
1. Teacher goes to `/portal/teacher/payment-claims` → Submit Claim for the month
2. System auto-populates session count from Attendance records
3. Claim goes to Management → approved → Finance pays

**Dummy claims will be replaced** as real teachers submit their first claims.

---

## 12. TICKET PERMISSIONS — Review Default Matrix

**Current:** All departments can target all other departments by default.

**How to restrict:** Go to `/portal/management/permissions` → toggle per-dept targeting.

**Recommended first change:** Set `isInternalOnly: true` for HR (complaint sub-type should be HR+Management only).

---

## 13. PORTAL CREDENTIALS SUMMARY

| Role | Email | Password | Portal URL |
|---|---|---|---|
| Management | admin@divergencie.co.uk | demo | /portal/management |
| Teacher | teacher@divergencie.co.uk | demo | /portal/teacher |
| PR Staff | pr@divergencie.co.uk | demo | /portal/staff (dept=PR) |
| HR Staff | hr@divergencie.co.uk | demo | /portal/staff (dept=HR) |
| Finance | finance@divergencie.co.uk | demo | /portal/staff (dept=Finance) |
| Marketing | marketing@divergencie.co.uk | demo | /portal/staff (dept=Marketing) |
| IT | it@divergencie.co.uk | demo | /portal/staff (dept=IT) |
| Student | student@example.com | demo | /portal/student |
| Parent | parent@example.com | demo | /portal/parent |
| Ambassador | ambassador@example.com | demo | /portal/ambassador |
| Candidate | candidate@example.com | demo | /portal/candidate |

**Change the auth password check** in `src/lib/auth.ts` line ~27 before going to production:
```ts
// Replace: if (!email || password !== "demo")
// With real bcrypt check against a hashed password stored in User.hashedPassword
```

---

## 14. WHAT IS NOT YET IMPLEMENTED (Phase 2)

These features are in the PRD but intentionally deferred — UI placeholders exist:

- **Payment gateways** (Stripe, FPX, Razorpay) — `billing.ts` has stub `payInvoice`
- **Google OAuth** — NextAuth config ready, just needs Google credentials in `.env`
- **Notification system** (SHR-06) — no in-app notifications yet, WhatsApp only
- **Automated attendance alerts** to parents (PAR-08)
- **FIN-05 Reminder Stage Tracker** — 5-stage WA chain UI not built
- **FIN-06 Pre-Check Gate** — student activation gate not enforced
- **PR-02 Schedule Manager** — full conflict-check calendar not built
- **HR-03 Interview Scheduler** — calendar self-service not built
- **Zoom webhook** — recording auto-import not built
- **Invoice PDF generation** (PAY-09)
- **WhatsApp Business API** integration

---

*Generated by Antigravity agent — DivergenCIE v1 implementation.*  
*Last updated: 2026-05-20*


---

## 15. ANNOUNCEMENTS — Compose via Management Portal

Go to `/portal/management/announcements` → New Announcement → select target role + priority → Publish.

Appears immediately on all targeted user portals under "Announcements" section.

Recommended first announcements to create:
- Welcome message targeting `all` (priority: medium)
- Exam schedule targeting `student` (priority: high)
- Teacher submission protocol targeting `teacher` (priority: high)
- Finance rate update targeting `staff` (priority: low)

---

## 16. TREND DATA — Auto-Populates

The 8-week trend chart on management dashboard pulls from:
- `AcademicSession` (sessions completed per week)
- `Ticket` (tickets created per week)
- `Lead` (new leads per week)

No manual population needed — data builds up as platform is used.

---

## 17. PR TRACKER — Monitoring Config

`/portal/staff/pr/tracker` auto-flags:
- Sessions that ended >24h ago with no attendance record
- Students with attendance <80%, overdue assignments, or progress <50%

No config needed — runs on live DB. Check daily after every class day.

---

## 18. IT ROADMAP — Add Real Tasks

Go to `/portal/staff/it/roadmap` → Add Task → set status (Planned/In Progress/Done/Blocked).

The integration status board (9 built-in items) shows real implementation status.
Add any additional integrations/tasks for Phase 2 (Stripe, WA API, Zoom webhook, etc.).

---

*Updated: 2026-05-20 — commits 11–14 additions*
