# DivergenCIE Coaching — User Journey Map

**Document Ref:** UJM-v3.0
**Version:** 3.0 — Draft
**Date:** May 2026
**Roles Covered:** Prospective Student / Visitor, Enrolled Student, Parent / Guardian, Teacher, Hiring Candidate, Staff: PR / Operations, Staff: HR, Staff: Finance, Staff: Marketing, Staff: IT, Ambassador, Management
**Related Docs:** PRD-v1.0, SRS-v1.0, RPM-v1.0

---

## 1. Overview

This document maps the end-to-end journeys for each user type interacting with the DivergenCIE platform. Each journey captures stages from first contact through key actions to post-engagement outcomes. Findings feed directly into UX design, feature prioritisation, and support workflows.

---

## 2. Journey 1 — Prospective Student / Visitor

**Goal:** Discover DivergenCIE, assess credibility, and enrol for coaching.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Discovery** | Searches Google for IGCSE/A Level coaching; sees Instagram ad or WhatsApp referral | Google, Instagram, WhatsApp, Google Reviews | Curious / Unsure | Too many coaching options; unclear quality signals | Strong SEO, A* testimonials, social proof on home page |
| **Awareness** | Visits divergencie.co.uk; reads About and Services pages | Website Home, About, Services | Evaluating | Hard to find pricing; teachers not clearly profiled | Clear pricing page; teacher profiles with credentials |
| **Consideration** | Compares packages; checks A* results and testimonials | Pricing Page, Testimonials | Interested | Unsure if package fits budget or exam timeline | Tiered packages; exam-date-based onboarding guide |
| **Intent** | Tries Free Mock Simulator to gauge teaching quality | Mock Simulator Page | Engaged / Testing | Mock may feel disconnected from actual class quality | Personalised result feedback + upsell prompt to enrol |
| **Enquiry** | Clicks Enrol Now or WhatsApp; fills form or messages DC | Enrolment Form, WhatsApp Chat | Hopeful / Anxious | Slow response; unclear next steps after form submit | Auto-reply with next steps; 2-hour response SLA |
| **Onboarding** | Receives welcome message; joins WhatsApp group; gets GCR invite | WhatsApp, GCR, Email, Portal | Excited / Overwhelmed | Too many platforms to set up simultaneously | Single onboarding checklist page in student portal |

---

## 3. Journey 2 — Enrolled Student

**Goal:** Attend classes, access materials, and track progress toward A*.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Login** | Opens platform; logs in with email or Google OAuth | Login Page, Student Portal | Routine | Forgot password; session expired on mobile | Persistent sessions; Google OAuth; password reset flow |
| **Pre-Class** | Checks schedule; receives 15-min reminder; locates Zoom link | Dashboard, Schedule, WhatsApp/Email | Focused | Reminder not received; wrong timezone displayed | Automated reminder; timezone-aware schedule display |
| **In-Class** | Attends Zoom; interacts with whiteboard; asks questions | Zoom, MS Whiteboard | Engaged | Connection drops; whiteboard link hard to find | Recording auto-linked post-class; whiteboard link in portal |
| **Post-Class** | Reviews recording; downloads notes; attempts past paper | Recordings Page, Materials | Reflective | Recording not uploaded promptly; notes not organised | Teacher timesheet triggers auto-publish of recording link |
| **Progress Check** | Opens A* tracker; marks chapters done; views score analytics | Progress Tracker, Dashboard | Motivated / Anxious | Tracker not updated; no clear path to A* | Chapter-wise checklist; monthly score trend chart |
| **Doubts** | Flags doubt in tracker; messages teacher via support ticket | Doubts Tracker, Support Tickets | Frustrated | No structured channel for doubt resolution | Doubt tagging per chapter; ticket with teacher assignment |
| **Missed Class** | Views missed class; follows reschedule guide; watches recording; PR/TA notified and responsible for resolving missed class (rescheduling or providing recording) | Attendance, Recordings, Support | Guilty / Worried | No rescheduling guidance; recording hard to find | Missed class alert + one-click reschedule request |
| **Exam Prep** | Downloads past papers; attempts mock simulator; reviews notes | Mock Simulator, Materials, GCR | High Pressure | Past papers scattered; no personalised weak-area report | Past paper checklist; mock score analytics by topic |

---

## 4. Journey 3 — Parent / Guardian

**Goal:** Monitor child's progress, pay fees on time, and stay informed.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Onboarding** | Receives login credentials; links to child's account | Email, Portal Setup | Cautious | Unclear how parent account differs from student | Clear parent onboarding guide; linked account view |
| **Progress Check** | Opens parent dashboard; views attendance and grades | Parent Dashboard, Progress Report | Concerned / Reassured | Report only available monthly; no real-time view | Live attendance widget; chapter progress summary |
| **Fee Payment** | Receives invoice; selects payment method by region; pays | Fee Page, Stripe/FPX/PayTM etc. | Transactional | Unsure which payment method to use; no receipt | Region-detected gateway suggestion; instant email receipt |
| **Communication** | Receives class update or attendance alert via email/WhatsApp | Email, WhatsApp Notification | Informed | Updates informal; no structured communication | Automated attendance alerts; monthly report email |
| **Support** | Raises ticket for schedule change or fee query | Support Tickets | Seeking Help | No clear channel; relies on WhatsApp informally | Support ticket form with category selection |

---

## 5. Journey 4 — Teacher / Staff

**Goal:** Deliver classes, submit records accurately, and track students.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Onboarding** | Receives staff credentials; reads Tutor Protocols doc; sets up Zoom and Whiteboard | Email, Teacher Portal, Zoom, WBD | Eager / Uncertain | Multiple tools to set up; protocols document long | Digital onboarding checklist in staff portal |
| **Pre-Class** | Checks staff schedule; prepares whiteboard; joins Zoom 5 min early | Teacher Dashboard, Zoom, WBD | Prepared | Schedule not updated; host key not accessible | Schedule auto-synced; host key accessible in portal |
| **In-Class** | Hosts Zoom breakout room; runs whiteboard; starts recording | Zoom, MS Whiteboard | Focused | Recording forgotten; breakout room not set up | Pre-class checklist reminder: record + breakout room |
| **Post-Class** | Submits timesheet: whiteboard name, link, duration, attendance, recording link | Teacher Portal, Timesheet Form | Administrative | Format errors in submission; link forgotten | Smart form with format validation and link checker |
| **Attendance** | Marks student attendance; submits monthly report | Attendance Module, Teacher Portal | Routine | Attendance not submitted on time; affects pay claims | Monthly report reminder; pay claim auto-linked to attendance |
| **Support** | Replies to forwarded student support tickets; PR/TA closes ticket | Support Ticket System | Helpful | Ticket priority unclear; no status tracking | Ticket queue with priority tags and status updates |
| **Payment Claim** | Submits monthly payment claim; views approval status | Payment Claim Module | Motivated | Claim delayed due to incomplete attendance records | Claim auto-populated from submitted timesheets |

---

## 6. Journey 5 — Hiring Candidate

**Goal:** Discover a role at DivergenCIE, apply, and complete the interview process.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Discovery** | Finds job listing via Instagram, LinkedIn, or careers page | LinkedIn, Instagram, Careers Page | Interested | Role requirements unclear; salary not mentioned | Clear JD with responsibilities, skills, and time commitment |
| **Application** | Submits application via careers form on website | Careers/Hiring Page, Application Form | Hopeful | No confirmation email after submission | Auto-confirmation email with expected timeline |
| **Screening** | Receives interview invite; picks time slot via calendar | Email, Interview Scheduler | Nervous / Excited | Long wait for response; no calendar self-scheduling | Interview scheduler with self-service time slot picker |
| **Interview** | Attends Zoom interview with DC team | Zoom | High Stakes | Interview format not communicated in advance | Pre-interview brief sent via email 24 hrs prior |
| **Outcome** | Receives offer or rejection email; onboards if accepted | Email, Staff Portal Onboarding | Relieved / Disappointed | No feedback given on rejection | Outcome email within 5 working days; feedback option |

---

## 7. Key Cross-Journey Insights

| **Theme** | **Observation** | **Recommendation** |
| --- | --- | --- |
| WhatsApp Dependency | All roles currently rely on WhatsApp for critical updates | Build in-platform notifications to reduce WhatsApp load |
| Scattered Resources | Students access recordings, notes, and GCR from 3+ places | Unify all resources in the student portal dashboard |
| Manual Processes | Timesheets, attendance, and payment claims are submitted manually | Auto-populate from class completion data where possible |
| Timezone Friction | Students in MY, IN, SA, UK face timezone confusion on schedules | Auto-detect and display all times in user local timezone |
| Missed Class Recovery | No structured flow for rescheduling after absence | Build missed class alert + reschedule request in one click |
| Onboarding Overload | Both students and staff face multi-platform setup on day one | Single onboarding checklist page per role in portal |
| Payment Confusion | Parents unsure which payment method applies to their region | Auto-detect region and surface relevant gateways first |

---

## 8. Journey 6 — Staff: PR / Operations

**Goal:** Manage teacher schedules, monitor class delivery, resolve student/parent tickets, track teacher and student metrics, run training workshops, maintain dept content bank.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Onboarding** | Receives staff credentials; reads DC Guidebook + protocols; attends onboarding meeting (Zoom, supervisor present) | Staff Portal, Email, Zoom | Eager / Uncertain | Protocols doc long; multiple tools to configure at once | Digital onboarding checklist in staff portal with step-by-step tool setup |
| **Schedule Management** | Creates + issues teacher schedules (schedules are created for teachers only; students are assigned to courses and teachers, not given independent schedules); checks conflicts via scheduling system (auto-flags one person doing two things simultaneously); assigns students to teachers; updates batch/group codes (B-groups=annual batch e.g. B8, B14; C-groups=1on1; T-groups=teacher-student on-demand e.g. T1, T2, T3) | Staff Portal – Schedule, Google Calendar | Focused / Pressured | Conflicts not auto-flagged; manual cross-referencing | Conflict-check system; auto-flag overlapping slots; batch assignment view |
| **Post-Class Tracking** | Checks teacher submission: whiteboard name, WBD link, duration, attendee list, recording upload (all 3 mandatory, 24hr SLA); sends remind if missing | Staff Portal – Teacher Metrics, WA Group | Vigilant / Frustrated | No centralised tracker; must check WA group manually per teacher after every class | Post-class submission form; dashboard flags overdue; remind button per teacher |
| **Ticket Management** | Receives student/parent tickets routed to PR; forwards to teacher for comment; reads reply; closes ticket; routes to Finance/IT/HR/Marketing as needed | Staff Portal – Tickets | Helpful / Overloaded | Priority unclear; no status tracking; WA still used for urgent cases | Ticket queue with priority tags, dept routing, status pipeline, teacher forward-reply flow |
| **Student Monitoring** | Tracks missing assignments, missing class, poor progress; sends reminders; flags at-risk students to management | Staff Portal – Student Tracker | Concerned / Proactive | No real-time feed; must check GCR and sheets separately | At-risk widget; missing activity auto-flagged; one-click remind button |
| **Workshops & Townhall** | Conducts bimonthly Teacher Training Workshop (teachers + PR + TA); conducts bimonthly Company Townhall (all staff); each dept holds 2 internal dept meetings per week (mandatory for all dept members) | Staff Portal – Meetings, Calendar | Leadership | No in-portal scheduling; relies on WA and email threads | Interdept meeting request flow: create → accept/reschedule/decline → confirmed |
| **Content Bank** | Adds and maintains shared links (name, URL, date, desc) for PR dept; supervisor can access all dept banks | Staff Portal – Content Bank | Organised | Links scattered across WA and Drive | Dept content bank with add/search/filter; supervisor sees all depts |
| **Claims** | Logs meeting/event attendance; submits attendance-based monthly claim; awaits management approval | Staff Portal – Attendance, Claims | Routine / Waiting | Claim delayed if attendance log incomplete | Claim auto-populated from attendance log; live approval status badge |

---

## 9. Journey 7 — Staff: HR

**Goal:** Hire qualified teachers and staff, manage candidate pipeline, issue contracts and onboarding materials, handle complaints and disciplinary actions, maintain staff records.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Job Posting** | Posts role listings (TA, SM, HR, IT, Accounts, Teacher) on careers page + LinkedIn; maintains candidate bank (active/inactive) | Careers Page, LinkedIn, Staff Portal | Proactive | No in-portal candidate tracking; managed via spreadsheet | Candidate bank: name, role, status, CV link, notes |
| **Screening & Interview** | Reviews CVs; sends WA interview invite (template with time-slot menu); schedules via Google Calendar; assigns trial task (trial class for teachers; demo task for marketing) | WA Template, Google Calendar, Staff Portal | Methodical | Manual WA formatting; no self-service scheduling for candidates | WA template with time-slot picker; interview scheduler; trial task assignment form |
| **Trial & Feedback** | Collects trial class feedback (student + parent: stars + text); HR receives aggregated result; passes to hiring decision | Trial Feedback Form, Staff Portal | Evaluating | Feedback collected informally; no structured scoring | Star rating + text form; HR sees aggregated result in portal |
| **Offer & Onboarding** | Sends offer letter + T&C via email template; runs onboarding meeting (Zoom, 30 min, supervisor present); issues DC Guidebook + IT/Data Policy | Email Template, Staff Portal, Zoom | Welcoming | Offer letter manual; onboarding materials scattered | Offer letter generator; onboarding checklist per role in portal |
| **Staff Records** | Maintains active/inactive status; issues warning letters; processes termination letter (triggered by management ticket); issues LinkedIn cert / LoR | Staff Portal – HR Records, Mgmt Tickets | Responsible / Sensitive | No in-portal warning/termination log; paper or email-based | Warning + termination log; management-triggered disciplinary ticket auto-routes to HR |
| **Complaint Handling** | Receives staff complaint tickets (staff → HR); handles disciplinary action tickets (management → HR); resolves or escalates | Staff Portal – Tickets | Diplomatic | Complaint tickets mixed with general tickets; no confidential channel | HR ticket sub-type: complaint/disciplinary; restricted to HR + management only |
| **Topper Hunt** | Proactively searches for country/world topper candidates; contacts via LinkedIn or social; adds to candidate bank | LinkedIn, Instagram, Staff Portal | Strategic | No tracking of outreach attempts | Candidate outreach log: status contacted/responded/invited |
| **Claims & Meetings** | Logs meeting/event attendance; submits claim; accepts/reschedules/declines meeting requests; attends 2 mandatory dept-internal meetings per week | Staff Portal – Attendance, Claims, Meetings | Routine | Attendance log incomplete delays claim | Claim auto-populated from attendance log; meeting request flow in portal |

---

## 10. Journey 8 — Staff: Finance

**Goal:** Set service rates, issue invoices, track payments, chase arrears, allocate budgets per dept, process approved staff claims, pre-check student payment capability at onboarding.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Rate Setting** | Sets service rates by course + country + batch/group code (B-groups=batch, C-groups=1on1, T-groups=teacher-student on-demand); updates when needed | Staff Portal – Finance Rates | Precise | Rates stored in spreadsheet; no single source of truth | Rate card manager: course + country + group code matrix; edit in-place |
| **Invoice Issuance** | Issues monthly invoices per student; prefers advance payments; generates from rate card; sends to parent via portal/email | Staff Portal – Invoice Manager, Email | Organised | Manual invoice creation; no auto-generation from enrolment data | Invoice generator linked to student enrolment + rate card; one-click issue |
| **Payment Tracking** | Tracks payment history per student; flags overdue; escalates to deactivation chain if unpaid | Staff Portal – Payment Tracker | Vigilant | Payment status spread across emails and sheets | Payment dashboard: Paid/Due/Overdue/Deactivated per student; colour-coded |
| **Payment Reminder Chain** | Sends staged WA reminders: Stage 1 due soon → Stage 2 overdue deactivate in 3 days → Stage 3 deactivated → Stage 4 receipt acknowledged → Stage 5 payment plan | WA Template Button, Staff Portal | Persistent / Empathetic | Must manually track stage per parent; risk of skipping stages | Reminder stage tracker per student; WA button auto-selects correct stage message |
| **Student Pre-Check** | At onboarding, pre-checks student payment capability (MUST — prevents teach 4 months then no pay); confirms advance payment collected | Staff Portal – Finance, Onboarding | Risk-Aware | Pre-check informal; no documented gate before student activation | Pre-check form at activation: payment method confirmed, first invoice paid, advance collected |
| **Budget Planning** | Quarterly: management gives target → finance checks → adjusts dept allocations → sends back for approval | Staff Portal – Budget Tracker, Mgmt Portal | Strategic | Budget planning via email/sheets; no in-portal tool | Budget planner: dept allocation table, submission to management, approval status |
| **Claims Processing** | Processes approved staff/teacher claims (payment out); maintains bank account records per staff | Staff Portal – Claims Outgoing | Meticulous | Must wait for approval before paying; no live status view | Approved claims queue: pull approved, mark paid, upload payment confirmation |
| **Scholarships & Discounts** | Allocates scholarships, discounts, coupons to specific students; applies to invoice | Staff Portal – Finance | Flexible | Discounts applied manually per invoice; risk of error | Discount/coupon manager: assign to student; auto-applies to next invoice |

---

## 11. Journey 9 — Staff: Marketing

**Goal:** Run social media calendar, manage asset bank, grow leads via campaigns and ambassador programme, maintain info channels, pass leads to PR.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Content Calendar** | Plans and maintains posting calendar: Canva link + Drive link + caption + date per post; must post story every other day, min 1 reel + 1 post/week; missed → PR/Ops action ticket auto-created | Staff Portal – Marketing Calendar, Canva, Drive | Creative / Pressured | Calendar tracked manually in sheets; missed posts hard to flag | Posting calendar in portal: post row with Canva link, Drive link, caption, date, status (Scheduled/Posted/Missed); auto-flag if missed |
| **Asset Bank** | Manages creative asset repository: images, videos, carousels, vlogs, alumni stories, competition prizes | Staff Portal – Content Bank (Marketing) | Organised | Assets scattered in Drive; no searchable index | Content bank for marketing: name, type (image/video/carousel), Drive link, date, campaign tag |
| **Lead Generation** | Runs ad campaigns (Google Ads, Reddit Ads, IG Reels); manages info WA channel + Telegram group; school visits + admission notice outreach; passes leads to PR. Note: Marketing cannot see student tickets or student data unless forwarded by PR/staff. | Google Ads, Reddit, IG, WA Channel, Staff Portal | Ambitious | No lead tracking in portal; leads passed informally to PR via WA | Lead log: source, name, contact, date, passed to PR flag; handoff button triggers PR ticket |
| **Ambassador Programme** | Runs referral + ambassador programme; oversees ambassador status (active/inactive/rewarded); tracks commission per successful enrolment | Staff Portal – Ambassador Tracker | Strategic | Status tracked in spreadsheet; commission calculations manual | Ambassador tracker: name, cohort (3mo/6mo), referrals, enrolments, commission, status; auto-compute commission |
| **Social Content Types** | Posts carousels, vlogs, documentaries, alumni stories, success stories, staff stories, literature; reels; manages Telegram/WA news auto-updates | Canva, Drive, IG, Telegram, WA | Storytelling | No content type tracking; unclear which types underperforming | Calendar filter by content type; performance notes field per post |
| **Claims & Meetings** | Logs meeting/event attendance; submits claim; accepts/reschedules/declines meeting requests; attends 2 mandatory dept-internal meetings per week | Staff Portal – Attendance, Claims, Meetings | Routine | Same attendance-claim gap as other depts | Claim auto-populated from attendance log; meeting request flow in portal |

---

## 12. Journey 10 — Staff: IT

**Goal:** Maintain website, resolve IT support tickets from all roles, manage software/tool access, plan future tech integrations.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Ticket Intake** | Receives IT tickets routed from student/parent/staff/teacher; reviews, prioritises, assigns; updates status. Note: IT cannot see student tickets unless explicitly forwarded to the IT dept by PR/staff. | Staff Portal – Tickets (IT queue) | Problem-Solver | IT tickets mixed with all ticket types; no dedicated IT queue view | IT dept ticket view: filter by dept=IT; priority sort; assign to IT team member; status pipeline |
| **Website Maintenance** | Maintains divergencie.co.uk (ticket-based); receives change requests via ticket; implements, tests, closes | Staff Portal – Tickets, Codebase | Technical | No formal change-request process; ad hoc WA requests | Website change-request ticket type: page, change desc, priority, before/after screenshots |
| **Tool & Access Management** | Manages DC-assigned credentials (MS Whiteboard, Zoom, GCR); sets up new accounts; revokes access on offboarding | Staff Portal – IT Records | Meticulous | No in-portal access log; managed via email threads | Access log: staff name, tools assigned, date granted, revoked flag; linked to HR onboarding/offboarding |
| **Future Integrations** | Plans integrations: GCR, Zoom, Google Drive, payment gateways, WhatsApp Business API; documents tech debt | Staff Portal – IT Roadmap (future) | Visionary | No roadmap tracking tool currently | IT roadmap widget: task list with status (planned/in progress/done); links to tickets |
| **Claims & Meetings** | Logs attendance; submits claim; accepts/reschedules/declines meetings; attends 2 mandatory dept-internal meetings per week | Staff Portal – Attendance, Claims, Meetings | Routine | Same as all depts | Claim auto-populated from attendance log; meeting request flow |

---

## 13. Journey 11 — Ambassador

**Goal:** Complete 3 or 6 month programme, refer new students, earn commission and allowance, submit deliverables, receive certificate and LinkedIn badge.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Application** | Applies to ambassador programme via portal; selects 3 or 6 month cohort; submits form | Ambassador Portal – Apply, Careers Page | Excited / Hopeful | Application process unclear; no structured form | Clear form: name, email, institution, programme duration, motivation; auto-confirmation |
| **Onboarding** | Receives programme guide; gets referral link and code; joins ambassador WA group | Email, Ambassador Portal, WA Group | Motivated | Referral link generation is manual; no portal self-serve | Ambassador portal dashboard: referral link + code prominent; copy button |
| **Referral Activity** | Shares referral link/code on social, WA, school networks; tracks referral clicks and enrolments | Ambassador Portal – Referral Tracker | Entrepreneurial | No way to track referral performance; relies on DC staff to confirm | Referral tracker: link clicks, enquiries, enrolments, commission earned per referral |
| **Programme Deliverables** | Submits programme deliverables (defined by DC); graded online by staff | Ambassador Portal – Deliverables | Engaged / Anxious | Submission and grading not digitalised | Deliverable submission form; staff grades in portal; ambassador sees score + feedback |
| **Commission & Allowance** | Earns commission per successful enrolment; earns monthly allowance; views earning history | Ambassador Portal – Earnings | Motivated by Reward | No transparent earnings tracker; commission communicated manually | Earnings dashboard: per-referral commission, monthly allowance, total earned, payout status |
| **Completion & Cert** | Completes programme; receives certificate and LinkedIn badge; optionally continues as full-time intern/staff | Email, Ambassador Portal | Proud / Accomplished | Certificate issued manually; no LinkedIn badge integration | Certificate download from portal; LinkedIn badge share link; continuation pathway shown |
| **Support** | Raises tickets to DC staff (any dept); has no access to student data or student portal; views own ticket history only | Ambassador Portal – Tickets | Seeking Help | No structured support channel; relies on WA | Ticket form: dept select, title, desc, priority; own history only; no access to student data or student portal |

---

## 14. Journey 12 — Management

**Goal:** Oversee all operations, approve claims and budgets, monitor per-staff and per-dept performance, escalate issues, maintain org health toward A* pass rate and company solvency.

| **Stage** | **Actions** | **Touchpoints** | **Emotion** | **Pain Points** | **Opportunities** |
| --- | --- | --- | --- | --- | --- |
| **Daily Overview** | Opens management dashboard; reviews stat cards (tickets open, claims pending, active students, staff activity score); scans weekly trend graphs | Management Portal – Dashboard | Strategic / Alert | No real-time aggregated view; must check multiple tools | Dashboard with live stat cards, trend sparklines, priority alerts (overdue tickets, pending claims) |
| **Claims Approval** | Reviews submitted staff/teacher claims; checks against attendance/timesheet records; approves or rejects with reason; approved claims route to Finance for payment | Management Portal – Claims | Accountable | Claim review manual; no linked evidence from timesheet | Claim review panel: claim + linked attendance/timesheet side by side; approve/reject + reason |
| **Budget Approval** | Receives quarterly budget proposal from Finance; reviews dept allocations; approves or sends back with notes | Management Portal – Budget | Fiscal | Budget proposal via email; no in-portal approval workflow | Budget approval workflow: Finance submits → management approves/adjusts/rejects → Finance notified |
| **Staff Performance** | Views per-staff and per-dept metrics (productivity, attendance, financial, activity, workload, quality); drills down to individual; flags underperformers | Management Portal – Metrics | Data-Driven | Metrics spread across sheets; no drill-down to individual staff | Metrics page: dept filter, staff drill-down, all KPI categories, weekly trend line graphs |
| **Ticket Oversight** | Views all tickets across all roles; assigns, closes, escalates; manages escalation queue; sends disciplinary/termination ticket to HR | Management Portal – Tickets | Authoritative | No cross-role ticket visibility; each dept manages own queue | All-tickets view: filter by role/dept/status/priority; escalation flag; termination ticket to HR |
| **User Management** | Adds/deactivates users; assigns dept supervisors (1 HOD per dept); adjusts roles; generates invite links | Management Portal – Users | Organisational | User role changes done via email to IT; no in-portal control | Users page: all roles table, supervisor assignment, deactivate toggle, invite link generator |
| **Meetings & Townhall** | Conducts bimonthly Company Townhall (all staff); accepts/reschedules/declines meeting requests; creates management-level meetings | Management Portal – Meetings, Calendar | Leadership | No in-portal meeting management; relies on Google Calendar + WA | Meeting request flow in portal; townhall event creation with all-staff notification |
| **Dept Content Bank** | Views all dept content banks across all depts; searches and accesses any dept shared links | Management Portal – Content Bank (all depts) | Oversight | No cross-dept link repository; each dept keeps own Drive folder | Management sees all dept content banks in unified view with dept filter |

---

## 15. Key Cross-Journey Insights — Dept-Specific Portals

| **Theme** | **Observation** | **Recommendation** |
| --- | --- | --- |
| Dept Identity in Staff Portal | All staff roles (PR, HR, Finance, Marketing, IT) share one staff portal but have very different daily workflows | Staff dashboard shows dept-specific quick actions and widgets based on logged-in user dept tag; universal pages (tickets, attendance, claims, content bank, meetings) shared across all depts |
| PR/Ops Schedule Gap | No in-portal tool for teacher schedule creation, conflict checking, or student-teacher assignment | Add portal/staff/schedule.html for PR: assign teachers to batches, flag conflicts, update group codes |
| HR Candidate Lifecycle | Candidate pipeline from application to offer to onboarding has no in-portal tracking | Add portal/staff/hr-candidates.html: candidate bank, interview scheduler, trial task, offer tracker, warning/termination log |
| Finance Rate & Invoice Gap | Rate cards and invoice generation are manual; pre-check gate at student onboarding not enforced digitally | Add portal/staff/finance-rates.html: rate card matrix + invoice manager; pre-check form at student activation |
| Marketing Calendar Gap | Posting calendar, asset bank, ambassador tracker, and lead log all outside the portal | Add portal/staff/marketing-calendar.html: posting calendar with status, asset bank, ambassador tracker, lead handoff to PR |
| IT Ticket Isolation | IT tickets arrive mixed with all other tickets; no dedicated IT queue or access log | IT dept view filters to dept=IT; add portal/staff/it-access.html for tool/credential management |
| Interdept Meeting Flow Missing | No structured meeting request flow across depts; relies on WA and Google Calendar | Add portal/staff/meetings.html: create meeting → target dept/person → accept/reschedule/decline → confirmed; all staff use this |
| Ambassador Portal Absent | Ambassadors have no digital home; referral tracking, deliverables, and earnings are manual | Build portal/ambassador/ with dashboard, referral tracker, deliverables, earnings, and ticket raise |
| Teacher Pre-Class Checklist | Pre-class checklist (record + breakout room) not yet in teacher portal | Add pre-class checklist widget to portal/teacher/dashboard.html: record on, breakout room, camera on, whiteboard titled, student reminded |
| Claims Auto-Population | Staff claim process requires manual cross-referencing of attendance log; risk of delay or underpayment | Claims page auto-pulls from attendance log for selected month; total sessions and hours computed readonly before submit |

---

*DivergenCIE Coaching — Confidential*
