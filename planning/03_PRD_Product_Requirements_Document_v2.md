# DivergenCIE Coaching — Product Requirements Document

| Field | Detail |
|---|---|
| **Document Ref** | PRD-v2.0 |
| **Version** | 2.0 — Draft |
| **Date** | May 2026 |
| **Status** | Draft — Pending Review |
| **Supersedes** | PRD-v1.0 (May 2025) |
| **Related Docs** | UJM-v3.0, BDG-v1.0, SRS-v1.0, MU-v2.0 |
| **Product Name** | DivergenCIE Coaching Web Platform |
| **Product Owner** | Mohammad Shahid (Founder, DivergenCIE) |
| **Platform** | Web — Desktop + Mobile Responsive — hosted at divergencie.co.uk |
| **Affiliations** | Cambridge Assessment International Education, CollegeBoard |
| **Classification** | Confidential — Internal & Development Partners Only |

---

## 1. Executive Summary

DivergenCIE Coaching is a premium international online coaching institution specialising in Cambridge IGCSE, A Level, AP, IB, SAT, ACT, IELTS, and TOEFL preparation. The institution is led by Cambridge A Level Country and World Toppers and examiners accepted at the University of Edinburgh, LSE, and Imperial College London.

This PRD defines the requirements for the DivergenCIE web platform — a dual-purpose product serving as (1) a public marketing and lead-generation site and (2) a private multi-role operational platform for students, parents, teachers, department staff, ambassadors, and management. The platform replaces and consolidates the current patchwork of Google Classroom, Zoom links in Google Sheets, WhatsApp groups, Google Forms, and Canva materials.

PRD v2 incorporates all role expansions, workflow logic, and portal architecture defined in UJM v3.0, which introduced seven new user journeys (PR/Ops, HR, Finance, Marketing, IT, Ambassador, Management) not covered in v1.

---

## 2. Goals & Objectives

### 2.1 Business Goals

- Establish a premium, authoritative web presence at divergencie.co.uk
- Increase student enrolments targeting Oct/Nov and May/June exam cohorts
- Support active hiring of Teaching Assistants, SM Assistants, HR, Accounts, and IT staff
- Consolidate all operational tools (GCR, Zoom, Sheets, WhatsApp, Forms) into one platform
- Scale self-paced recorded courses to 1,000+ student enrolments
- Generate passive revenue through study resources, predicted papers, and mock exam subscriptions

### 2.2 Product Goals

- Deliver a fast, mobile-responsive public website that converts visitors to enrolments
- Provide role-based portals for Students, Parents, Teachers, all Staff departments, Ambassadors, and Management
- Integrate payment gateways for India, Malaysia, Saudi Arabia, UK, Pakistan, and international students
- Host and deliver class recordings via an embedded player (YouTube / Zoom)
- Provide real-time progress tracking, attendance management, and A\* analytics
- Offer a free timed mock simulator to drive traffic and build brand trust
- Enforce structured digital workflows for finance pre-checks, claims approval, ticket routing, and hiring pipeline — eliminating reliance on WhatsApp for operational decisions

### 2.3 Success Metrics

| Metric | Target | Timeline |
|---|---|---|
| Website live | Public site fully deployed | Phase 1 launch |
| Student portal live | Core features operational | Phase 1 launch |
| Enrolment form submissions | 50+ before October exam season | Within 60 days of launch |
| Hiring applications received | 10+ per role posted | Within 30 days of launch |
| Mock Simulator users | 500+ unique users | Within 60 days of launch |
| Self-paced course enrolments | 1,000 students | Phase 2 — Q1 2027 |
| Staff portal adoption | 100% of active staff using timesheet and claims | Within 14 days of launch |
| Payment gateway success rate | >95% transaction success | Ongoing |
| Finance pre-check compliance | 100% of new student activations gated | From launch |
| Ambassador portal adoption | Active ambassadors submitting deliverables digitally | Within 30 days of ambassador launch |

---

## 3. User Personas

### 3.1 Prospective Student / Visitor

| Attribute | Detail |
|---|---|
| Who | Grade 9–13 student (IGCSE / A Level / AP / IB) or their parent, researching coaching |
| Location | Malaysia, India, Saudi Arabia, UK, Pakistan, or other international |
| Goal | Understand DivergenCIE offering, assess credibility via results and testimonials, enrol or enquire |
| Pain Points | Too many coaching options; unclear quality signals; hard to find pricing; teachers not clearly profiled |
| Key Pages | Home, Services, Pricing, About, Contact, Free Mock Simulator |
| CTA | WhatsApp chat, Enrol Now form, Free Mock try |

### 3.2 Enrolled Student

| Attribute | Detail |
|---|---|
| Who | Currently enrolled student, Grade 9–13, preparing for Oct/Nov or May/June exams |
| Goal | Access class schedule, recordings, notes; submit doubts; track progress toward A\* |
| Pain Points | Resources scattered across WhatsApp, GCR, Sheets, Canva — no single source of truth; timezone confusion; no structured doubt channel; no rescheduling flow |
| Key Features | Dashboard, Class Schedule, Recordings, Progress Tracker, A\* Checklist, Doubt Tracker, Support Tickets, Missed Class Tracker |
| Device | Primarily mobile (WhatsApp-native); also desktop for studying |

### 3.3 Parent / Guardian

| Attribute | Detail |
|---|---|
| Who | Parent of enrolled student; paying fees; monitoring academic performance |
| Goal | See child's attendance, progress, and fee invoices in one place; pay fees online |
| Pain Points | Progress updates only via WhatsApp; unclear which payment method to use by region; no real-time attendance view |
| Key Features | Parent Dashboard, Progress Report, Live Attendance Widget, Fee Payment, Student Schedule, Support Tickets |

### 3.4 Teacher / Teaching Assistant

| Attribute | Detail |
|---|---|
| Who | Subject teacher or TA; remote, globally distributed |
| Goal | Deliver classes; submit post-class records (whiteboard name, link, duration, recording, attendance); track student doubts; submit claims |
| Pain Points | Manual WhatsApp submission of attendance; recording forgotten; no pre-class checklist; timesheet submission delayed; format errors |
| Key Features | Teacher Dashboard with pre-class checklist, Attendance Submission, Timesheet, Schedule (teachers only, not students), Doubt Queue, Payment Claims |

### 3.5 Staff: PR / Operations

| Attribute | Detail |
|---|---|
| Who | PR or Operations team member; manages teacher schedules, student monitoring, ticket routing, workshops |
| Goal | Create and issue teacher schedules, detect conflicts, track post-class submissions, monitor at-risk students, manage tickets |
| Pain Points | Schedule conflicts not auto-flagged; no centralised post-class tracker; must check WhatsApp manually per teacher; no student at-risk feed |
| Key Features | Schedule Manager (conflict-check, batch assignment), Post-Class Submission Tracker, At-Risk Student Widget, Ticket Queue (with teacher forward-reply), Content Bank, Meetings, Claims |

### 3.6 Staff: HR

| Attribute | Detail |
|---|---|
| Who | HR team member managing recruitment, onboarding, records, and disciplinary actions |
| Goal | Hire qualified teachers and staff; track candidates; issue contracts; handle complaints and terminations |
| Pain Points | No in-portal candidate tracking; manual WhatsApp interview scheduling; feedback informal; warning/termination log paper-based |
| Key Features | Candidate Bank, Interview Scheduler, Trial Task Assignment, Offer Letter Generator, Staff Records (warning/termination log), Complaint Ticket Sub-type, Topper Hunt Outreach Log, Claims, Meetings |

### 3.7 Staff: Finance

| Attribute | Detail |
|---|---|
| Who | Finance team member managing rates, invoices, payment tracking, claims processing, and budgets |
| Goal | Set service rates, issue invoices, chase arrears, pre-check student payment capability, process approved claims |
| Pain Points | Rates in spreadsheet; invoices manual; no payment stage tracker; pre-check informal; budget planning via email |
| Key Features | Rate Card Manager, Invoice Generator, Payment Dashboard (Paid/Due/Overdue/Deactivated), Reminder Stage Tracker, Student Pre-Check Gate, Budget Planner, Approved Claims Queue, Discount/Coupon Manager |

### 3.8 Staff: Marketing

| Attribute | Detail |
|---|---|
| Who | Marketing team member managing social media calendar, asset bank, campaigns, and ambassador programme |
| Goal | Run posting calendar, manage assets, grow leads via campaigns and ambassador programme, pass leads to PR |
| Pain Points | Calendar tracked manually in sheets; missed posts hard to flag; lead tracking informal; ambassador status and commission in spreadsheets |
| Key Features | Posting Calendar (with auto-flag on missed post), Asset Bank, Lead Log (with PR handoff trigger), Ambassador Tracker, Claims, Meetings |
| Access Restriction | Cannot see student tickets or student data unless forwarded by PR/staff |

### 3.9 Staff: IT

| Attribute | Detail |
|---|---|
| Who | IT team member; maintains website, resolves tech tickets, manages tool access, plans integrations |
| Goal | Resolve IT support tickets, manage tool credentials, process website change requests, track tech roadmap |
| Pain Points | IT tickets mixed with all ticket types; no dedicated IT queue; access log managed via email; no roadmap tracking tool |
| Key Features | IT Ticket Queue (dept-filtered), Access Log (tool, staff, date granted/revoked), Website Change-Request Ticket Type, IT Roadmap Widget, Claims, Meetings |
| Access Restriction | Cannot see student tickets unless explicitly forwarded to IT dept by PR/staff |

### 3.10 Ambassador

| Attribute | Detail |
|---|---|
| Who | Student or graduate enrolled in 3- or 6-month ambassador programme; refers new students; submits deliverables |
| Goal | Refer students, track referral performance, submit programme deliverables, earn commission and allowance, receive certificate and LinkedIn badge |
| Pain Points | Referral link generated manually; no portal self-serve; no earnings transparency; commission communicated manually; submission and grading not digitalised |
| Key Features | Ambassador Dashboard, Referral Tracker (clicks/enquiries/enrolments/commission), Deliverable Submission Form, Earnings Dashboard (commission + allowance + payout status), Certificate Download, Support Tickets (own history only) |
| Access Restriction | No access to student data or student portal |

### 3.11 Hiring Candidate

| Attribute | Detail |
|---|---|
| Who | Prospective teacher, TA, SM assistant, HR, IT, or accounts hire |
| Goal | Browse open roles, understand requirements, submit application, complete interview and trial |
| Pain Points | Role requirements unclear; no confirmation email on submission; long wait for response; interview format not communicated |
| Key Features | Careers Page, Job Listings, Application Form with auto-confirmation, Interview Scheduler (self-service), Pre-Interview Brief, Outcome Email with Feedback |

### 3.12 Management

| Attribute | Detail |
|---|---|
| Who | Mohammad Shahid (Founder) or designated management; full operational oversight |
| Goal | Oversee all operations; approve claims and budgets; monitor per-staff and per-dept performance; maintain org health toward A\* pass rate and company solvency |
| Pain Points | No real-time aggregated view; claim review manual; budget proposal via email; metrics spread across sheets; no cross-role ticket visibility |
| Key Features | Management Dashboard (stat cards, sparklines, alerts), Claims Approval (with linked timesheet), Budget Approval Workflow, Staff & Dept Metrics (with drill-down), All-Tickets View (with escalation and HR termination routing), User Management, Meetings (Townhall), Cross-Dept Content Bank View |

---

## 4. Product Scope

### 4.1 In Scope — Phase 1 (Launch)

- Public marketing website: Home, About, Services, Pricing, Resources, Careers, Contact
- Free Timed Mock Simulator (no login required)
- **Student Portal** — Dashboard, Schedule, Recordings, Progress Tracker, A\* Checklist, Doubts Tracker, Support Tickets, Missed Class Tracker, Notes Library, Past Paper Checklist, WhatsApp Group Link
- **Parent Portal** — Dashboard, Progress Report, Live Attendance, Fee Payment, Student Schedule, Support Tickets
- **Teacher Portal** — Pre-Class Checklist Dashboard, Attendance Submission, Timesheet, Schedule, Doubt Queue, Payment Claims, Protocols Library
- **Staff Portal — PR/Ops** — Schedule Manager (conflict-check, batch assignment, group codes), Post-Class Submission Tracker, At-Risk Widget, Ticket Queue (forward-to-teacher flow), Student Monitoring, Workshops/Meetings, Content Bank, Claims
- **Staff Portal — HR** — Candidate Bank, Interview Scheduler, Trial Task, Offer Letter Generator, Staff Records (warning/termination log), Complaint Ticket Sub-type, Topper Hunt Log, Claims, Meetings
- **Staff Portal — Finance** — Rate Card Manager, Invoice Generator, Payment Dashboard, Reminder Stage Tracker (5-stage), Student Pre-Check Gate, Budget Planner, Approved Claims Queue, Discount/Coupon Manager, Claims, Meetings
- **Staff Portal — Marketing** — Posting Calendar (with missed-post auto-flag), Asset Bank (content bank), Lead Log (with PR handoff), Ambassador Tracker, Claims, Meetings
- **Staff Portal — IT** — IT Ticket Queue (dept-filtered), Access Log, Website Change-Request Ticket Type, IT Roadmap Widget, Claims, Meetings
- **Ambassador Portal** — Application Form, Dashboard (referral link + code), Referral Tracker, Deliverable Submission, Earnings Dashboard, Certificate Download, Support Tickets
- **Management Portal** — Dashboard (live stat cards + sparklines + alerts), Claims Approval, Budget Approval Workflow, Staff & Dept Metrics (drill-down), All-Tickets View (escalation + HR routing), User Management (with HOD assignment), Meetings (Townhall), Cross-Dept Content Bank View
- Multi-country Payment Gateway Integration (Stripe, FPX, DuitNow, Razorpay, EasyPaisa, Al Rajhi / STC Pay, Wise / Airwallex)
- Authentication — invite-only registration, email + Google OAuth login, role-based access control, password reset
- **Cross-Portal Shared Modules** — Meetings (request/accept/reschedule/decline flow, dept-internal + townhall), Attendance Log, Claims (auto-populated from attendance), Dept Content Bank, Support Ticket System (with dept routing, priority, status pipeline)

### 4.2 In Scope — Phase 2 (Post-Launch)

- Self-paced Recorded Course platform with enrolment and progress tracking
- International Mock Exam (1,000 student registration goal, leaderboard, prize)
- Blog / SEO content section with admin CMS
- Student Study Group module
- Advanced Analytics (revenue dashboard, A\* cohort tracker, per-country performance)
- Career Counselling booking system
- Arabic and Malay language support

### 4.3 Out of Scope

- Native mobile app (iOS / Android) — web responsive only for Phase 1
- Live video hosting on DivergenCIE servers — Zoom and YouTube links used as embeds
- CBSE batches — deprioritised, not in Phase 1
- Physical/on-ground services — online only
- AI tutoring or automated doubt resolution — future roadmap item

---

## 5. Feature Requirements

Priority legend: **Must Have** = launch blocker | **Should Have** = launch + 30 days | **Nice to Have** = Phase 2

### 5.1 Public Website

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| PUB-01 | Hero Section | Tagline, CTA buttons (Enrol / WhatsApp / Free Mock), animated background | Visitor | **Must Have** | P1 |
| PUB-02 | Services Pages | Individual pages per subject with curriculum overview, teacher bio, and pricing CTA | Visitor | **Must Have** | P1 |
| PUB-03 | Pricing Page | Fee table by subject/package, payment methods by country, FAQ accordion | Visitor | **Must Have** | P1 |
| PUB-04 | Testimonials | Student results, A\* achievements, video or quote testimonials with social proof | Visitor | **Must Have** | P1 |
| PUB-05 | Free Mock Simulator | Subject select, timed exam, auto-score, personalised result feedback + enrol upsell prompt | Visitor | **Must Have** | P1 |
| PUB-06 | Careers Page | Job listings with JD, application form per role, ambassador programme info | Applicant | **Must Have** | P1 |
| PUB-07 | Contact Page | WhatsApp QR, enquiry form, social links (IG, LinkedIn, Google) | Visitor | **Must Have** | P1 |
| PUB-08 | Blog / SEO | Article CMS, category filter, search — drives organic traffic | Visitor | **Should Have** | P2 |
| PUB-09 | Resource Store | Paid notes, past papers, predicted papers — Stripe checkout | Visitor | **Should Have** | P2 |
| PUB-10 | Live Chat Widget | WhatsApp Business or Tawk.to integration for instant visitor support | Visitor | **Should Have** | P1 |

### 5.2 Authentication

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| AUTH-01 | Login Page | Email + password login, role detection, redirect to correct portal | All Roles | **Must Have** | P1 |
| AUTH-02 | Google OAuth | Sign in with Google as alternative to email+password | All Roles | **Must Have** | P1 |
| AUTH-03 | Forgot Password | Email-based password reset flow | All Roles | **Must Have** | P1 |
| AUTH-04 | Role-Based Access | Student / Parent / Teacher / Staff (per dept) / Ambassador / Management role enforcement server-side on all routes | All Roles | **Must Have** | P1 |
| AUTH-05 | Invitation Registration | Admin or Management sends invite link; user sets password — no open registration | All Roles | **Must Have** | P1 |
| AUTH-06 | Session Management | Secure JWT sessions, persistent sessions on mobile, auto-logout after inactivity | All Roles | **Must Have** | P1 |

### 5.3 Student Portal

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| STU-01 | Dashboard | Upcoming classes, pending assignments, progress snapshot, announcements, onboarding checklist on first login | Student | **Must Have** | P1 |
| STU-02 | Class Schedule | Timezone-aware calendar view of all classes with Zoom links, subject, teacher name — display in student local timezone | Student | **Must Have** | P1 |
| STU-03 | Google Classroom Links | Per-subject GCR links, batch info (B-group / C-group / T-group) | Student | **Must Have** | P1 |
| STU-04 | Attendance Record | View personal attendance history; missed classes flagged | Student | **Must Have** | P1 |
| STU-05 | Missed Class Tracker | View missed classes with rescheduling guide; one-click reschedule request; auto-notifies PR/TA on miss | Student | **Must Have** | P1 |
| STU-06 | Recordings Library | Browse by subject/topic; recording auto-linked post-class after teacher timesheet submission; embedded Zoom/YouTube player | Student | **Must Have** | P1 |
| STU-07 | Assignments | View active assignments, submit, track status and score | Student | **Must Have** | P1 |
| STU-08 | Past Paper Checklist | Tick off completed past papers per subject and year; past paper checklist with topic analytics | Student | **Must Have** | P1 |
| STU-09 | Progress Tracker | Chapter-wise checklist; monthly exam score trend charts; A\* gap analysis; subject performance | Student | **Must Have** | P1 |
| STU-10 | Syllabus Booklet | Chapter-wise syllabus per subject; mark topics complete | Student | **Must Have** | P1 |
| STU-11 | A\* Checklist | Curated list of A\*-critical tasks, milestones, and paper topics | Student | **Must Have** | P1 |
| STU-12 | Doubt Tracker | Log doubts per chapter; tag by topic; ticket created and assigned to teacher; student views resolution status | Student | **Should Have** | P1 |
| STU-13 | Notes Library | Download chapter notes, access topic-wise resources | Student | **Must Have** | P1 |
| STU-14 | Support Ticket | Raise support requests; request subject add/drop; track status | Student | **Must Have** | P1 |
| STU-15 | Schedule Change Request | Pick subject, select calendar dates, submit reschedule request — routed to PR | Student | **Should Have** | P1 |
| STU-16 | WhatsApp Group Link | Quick-access link to batch WhatsApp group | Student | **Must Have** | P1 |
| STU-17 | Mock Simulator (Portal) | Logged-in mock with score history, weak-area report, topic analytics | Student | **Should Have** | P1 |
| STU-18 | Study Plan | Monthly milestones, weekly task list, exam countdown calendar | Student | **Should Have** | P2 |

### 5.4 Parent Portal

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| PAR-01 | Parent Dashboard | Live attendance widget, chapter progress summary, upcoming classes, linked child account view | Parent | **Must Have** | P1 |
| PAR-02 | Progress Report | Monthly academic report with scores, attendance, teacher comments | Parent | **Must Have** | P1 |
| PAR-03 | Attendance Summary | View child's attendance, missed classes, reasons; real-time alerts on absence | Parent | **Must Have** | P1 |
| PAR-04 | Fee Payment | View invoices, pay online; region-detected gateway suggestion (MY: FPX/DuitNow, IN: Razorpay, KSA: Al Rajhi/STC, PK: EasyPaisa, Intl: Stripe/Wise); instant email receipt on payment | Parent | **Must Have** | P1 |
| PAR-05 | Payment Guides | QR, account info, Wise / Western Union guide per country | Parent | **Must Have** | P1 |
| PAR-06 | Student Schedule | Read-only view of child's class schedule | Parent | **Must Have** | P1 |
| PAR-07 | Support Tickets | Raise ticket for schedule change or fee query; category selection | Parent | **Should Have** | P1 |
| PAR-08 | Automated Alerts | Automated attendance alerts; monthly report email notification | Parent | **Should Have** | P1 |

### 5.5 Teacher Portal

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| TCH-01 | Teacher Dashboard | Upcoming classes, pre-class checklist widget (record on, breakout room set, camera on, whiteboard titled, student reminded), announcement feed | Teacher | **Must Have** | P1 |
| TCH-02 | My Schedule | Calendar view of assigned classes with Zoom links, student lists; timezone-aware | Teacher | **Must Have** | P1 |
| TCH-03 | Post-Class Submission | Submit timesheet per session: whiteboard name, WBD link, duration, attendee list, recording link (all mandatory, 24hr SLA); smart form with format validation and link checker; triggers auto-publish of recording in student portal | Teacher | **Must Have** | P1 |
| TCH-04 | Attendance Module | Mark student attendance per session; monthly report reminder; links to payment claim | Teacher | **Must Have** | P1 |
| TCH-05 | Payment Claims | Submit monthly claim; claim auto-populated from submitted timesheets; view approval status and history | Teacher | **Must Have** | P1 |
| TCH-06 | Support Ticket Queue | View student/parent tickets assigned by PR; reply; PR closes ticket | Teacher | **Must Have** | P1 |
| TCH-07 | Doubt Resolution | View and respond to student doubt tracker entries (tagged per chapter); status updates visible to student | Teacher | **Should Have** | P1 |
| TCH-08 | Protocols Library | Access Zoom guide, GCR guide, attendance protocol, meeting rules, DC Guidebook | Teacher | **Must Have** | P1 |
| TCH-09 | Onboarding Checklist | Digital onboarding checklist: tool setup (Zoom, WBD, GCR), protocol acknowledgement, first schedule confirmation | Teacher | **Must Have** | P1 |

### 5.6 Staff Portal — PR / Operations

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| PR-01 | PR Dashboard | Dept-specific quick actions: overdue submissions, at-risk students, open tickets, schedule conflicts | PR Staff | **Must Have** | P1 |
| PR-02 | Schedule Manager | Create and issue teacher schedules (teachers only; students assigned to courses/teachers); conflict-check system (auto-flag if one person assigned two simultaneous slots); assign students to teachers; update batch/group codes (B=annual batch e.g. B8/B14, C=1-on-1, T=teacher-student on-demand e.g. T1/T2/T3) | PR Staff | **Must Have** | P1 |
| PR-03 | Post-Class Submission Tracker | Dashboard showing all teachers' post-class submissions per session; flags overdue (>24hr SLA); one-click remind button per teacher | PR Staff | **Must Have** | P1 |
| PR-04 | Student Monitoring | At-risk widget: missing assignments, missed classes, poor progress auto-flagged; one-click remind to student; flag to management | PR Staff | **Must Have** | P1 |
| PR-05 | Ticket Queue | Receive student/parent tickets routed to PR; forward to teacher for comment; read reply; close ticket; route to Finance/IT/HR/Marketing as needed; priority tags, dept routing, status pipeline | PR Staff | **Must Have** | P1 |
| PR-06 | Missed Class Resolution | Receives alert on student missed class; responsible for resolving via rescheduling or providing recording; tracks resolution status | PR Staff | **Must Have** | P1 |
| PR-07 | Workshops & Meetings | Conducts bimonthly Teacher Training Workshop (teachers + PR + TA); manages in-portal meeting creation and tracking; attends 2 mandatory dept-internal meetings per week | PR Staff | **Must Have** | P1 |
| PR-08 | Content Bank | Dept-level shared link repository: name, URL, date, description; supervisor sees all dept banks | PR Staff | **Must Have** | P1 |
| PR-09 | Claims | Attendance log; attendance-based monthly claim; auto-populated from attendance log; live approval status | PR Staff | **Must Have** | P1 |

### 5.7 Staff Portal — HR

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| HR-01 | HR Dashboard | Dept-specific quick actions: open candidates, pending interviews, expiring contracts, open disciplinary tickets | HR Staff | **Must Have** | P1 |
| HR-02 | Candidate Bank | Roles: TA, SM, HR, IT, Accounts, Teacher; fields: name, role applied, status (active/inactive), CV link, notes; sourced from Careers page submissions and Topper Hunt outreach | HR Staff | **Must Have** | P1 |
| HR-03 | Interview Scheduler | WhatsApp template with time-slot menu; self-service calendar slot picker for candidates; Google Calendar sync | HR Staff | **Must Have** | P1 |
| HR-04 | Trial Task Assignment | Assign trial class (teachers) or demo task (marketing/other); track completion | HR Staff | **Must Have** | P1 |
| HR-05 | Trial Feedback Form | Star rating + text feedback from student and parent after trial class; HR sees aggregated result in portal; feeds hiring decision | HR Staff | **Must Have** | P1 |
| HR-06 | Offer Letter Generator | Template-based offer letter + T&C; issued via email; tracked per candidate | HR Staff | **Must Have** | P1 |
| HR-07 | Onboarding Checklist | Per-role onboarding meeting (Zoom, 30 min, supervisor present); DC Guidebook + IT/Data Policy issuance; tracked in portal | HR Staff | **Must Have** | P1 |
| HR-08 | Staff Records | Active/inactive status per staff; warning letter log; termination letter log (triggered by Management ticket); LinkedIn cert / LoR issuance | HR Staff | **Must Have** | P1 |
| HR-09 | Complaint Ticket Sub-type | HR ticket sub-type: complaint (staff → HR) and disciplinary (management → HR); restricted visibility to HR + Management only | HR Staff | **Must Have** | P1 |
| HR-10 | Topper Hunt Log | Outreach log per candidate: name, platform (LinkedIn/IG), status (contacted / responded / invited); feeds into candidate bank | HR Staff | **Should Have** | P1 |
| HR-11 | Claims & Meetings | Attendance log; claim auto-populated from attendance; meeting request flow in portal; 2 mandatory dept-internal meetings per week | HR Staff | **Must Have** | P1 |

### 5.8 Staff Portal — Finance

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| FIN-01 | Finance Dashboard | Dept-specific quick actions: overdue invoices, pending pre-checks, pending claims, budget status | Finance Staff | **Must Have** | P1 |
| FIN-02 | Rate Card Manager | Service rates by course + country + group code (B=batch, C=1-on-1, T=teacher-student on-demand); edit in-place; single source of truth | Finance Staff | **Must Have** | P1 |
| FIN-03 | Invoice Generator | Auto-generate invoice from student enrolment + rate card; one-click issue to parent via portal/email; prefers advance payment | Finance Staff | **Must Have** | P1 |
| FIN-04 | Payment Dashboard | Payment status per student: Paid / Due / Overdue / Deactivated; colour-coded; full transaction history | Finance Staff | **Must Have** | P1 |
| FIN-05 | Reminder Stage Tracker | 5-stage WhatsApp reminder chain per student: Stage 1 Due Soon → Stage 2 Overdue (deactivate in 3 days) → Stage 3 Deactivated → Stage 4 Receipt Acknowledged → Stage 5 Payment Plan; WA template button auto-selects correct stage message; stage tracker per student prevents skipping | Finance Staff | **Must Have** | P1 |
| FIN-06 | Student Pre-Check Gate | Mandatory gate at student activation: payment method confirmed, first invoice paid, advance collected; form must be completed before student account is set active; prevents deliver-now-pay-never scenarios | Finance Staff | **Must Have** | P1 |
| FIN-07 | Budget Planner | Quarterly budget cycle: Management gives target → Finance checks → adjusts dept allocations → submits to Management for approval; approval status tracked in portal | Finance Staff | **Must Have** | P1 |
| FIN-08 | Approved Claims Queue | Pull approved staff/teacher claims; mark paid; upload payment confirmation; links to bank account records per staff | Finance Staff | **Must Have** | P1 |
| FIN-09 | Discount / Coupon Manager | Assign scholarships, discounts, coupons to specific students; auto-applies to next invoice; audit trail | Finance Staff | **Should Have** | P1 |
| FIN-10 | Claims & Meetings | Attendance log; claim auto-populated from attendance; meeting request flow; 2 mandatory dept-internal meetings per week | Finance Staff | **Must Have** | P1 |

### 5.9 Staff Portal — Marketing

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| MKT-01 | Marketing Dashboard | Dept-specific quick actions: upcoming posts, missed post alerts, active ambassador count, pending lead handoffs | Marketing Staff | **Must Have** | P1 |
| MKT-02 | Posting Calendar | Post row: Canva link, Drive link, caption, scheduled date, status (Scheduled / Posted / Missed); mandatory frequency: story every other day, min 1 reel + 1 post per week; auto-create action ticket to PR/Ops if post missed; filter by content type (carousels, vlogs, documentaries, alumni stories, staff stories, reels, literature) | Marketing Staff | **Must Have** | P1 |
| MKT-03 | Asset Bank (Marketing) | Creative asset repository: name, type (image / video / carousel), Drive link, date, campaign tag; searchable index | Marketing Staff | **Must Have** | P1 |
| MKT-04 | Lead Log | Lead record: source (Google Ads / Reddit / IG / WA Channel / school visit), name, contact, date, passed-to-PR flag; handoff button triggers PR ticket; Marketing cannot see student tickets or data | Marketing Staff | **Must Have** | P1 |
| MKT-05 | Ambassador Tracker | Ambassador record: name, cohort (3mo / 6mo), referrals, enrolments, commission earned, status (active / inactive / rewarded); commission auto-computed | Marketing Staff | **Must Have** | P1 |
| MKT-06 | Claims & Meetings | Attendance log; claim auto-populated; meeting request flow; 2 mandatory dept-internal meetings per week | Marketing Staff | **Must Have** | P1 |

### 5.10 Staff Portal — IT

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| IT-01 | IT Dashboard | Dept-specific quick actions: open IT tickets by priority, pending access changes, overdue website tickets | IT Staff | **Must Have** | P1 |
| IT-02 | IT Ticket Queue | All support tickets filtered to dept=IT; priority sort; assign to IT team member; status pipeline (Open / In Progress / Resolved / Closed); IT cannot see student tickets unless forwarded by PR/staff | IT Staff | **Must Have** | P1 |
| IT-03 | Website Change-Request Ticket | Dedicated ticket type for website changes: page, change description, priority, before/after screenshot fields; ticket-based process replacing ad hoc WhatsApp requests | IT Staff | **Must Have** | P1 |
| IT-04 | Access Log | Tool/credential management: staff name, tools assigned (MS Whiteboard, Zoom, GCR), date granted, revoked flag; linked to HR onboarding/offboarding events | IT Staff | **Must Have** | P1 |
| IT-05 | IT Roadmap Widget | Integration roadmap: task list with status (Planned / In Progress / Done); links to relevant tickets; tracks GCR, Zoom, Google Drive, payment gateways, WhatsApp Business API integrations | IT Staff | **Should Have** | P1 |
| IT-06 | Claims & Meetings | Attendance log; claim auto-populated; meeting request flow; 2 mandatory dept-internal meetings per week | IT Staff | **Must Have** | P1 |

### 5.11 Ambassador Portal

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| AMB-01 | Application Form | Application: name, email, institution, programme duration (3mo / 6mo), motivation statement; auto-confirmation on submit | Applicant | **Must Have** | P1 |
| AMB-02 | Ambassador Dashboard | Referral link + code prominently displayed with copy button; programme guide; WA group link; active cohort and days remaining | Ambassador | **Must Have** | P1 |
| AMB-03 | Referral Tracker | Per-referral record: link clicks, enquiries, enrolments, commission earned; total dashboard view | Ambassador | **Must Have** | P1 |
| AMB-04 | Deliverable Submission | Submission form per deliverable (defined by DC); staff grades in portal; ambassador sees score + feedback | Ambassador | **Must Have** | P1 |
| AMB-05 | Earnings Dashboard | Per-referral commission, monthly allowance, total earned, payout status; transparent history | Ambassador | **Must Have** | P1 |
| AMB-06 | Certificate & Badge | Certificate download from portal on programme completion; LinkedIn badge share link; continuation pathway (intern/staff) shown | Ambassador | **Must Have** | P1 |
| AMB-07 | Support Tickets | Ticket form: dept select, title, description, priority; own ticket history only; no access to student data or student portal | Ambassador | **Must Have** | P1 |

### 5.12 Management Portal

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| MGT-01 | Management Dashboard | Live stat cards: tickets open, claims pending, active students, staff activity score; weekly trend sparklines; priority alerts (overdue tickets, pending claims, at-risk students) | Management | **Must Have** | P1 |
| MGT-02 | Claims Approval | Review submitted staff/teacher claims; claim panel shows claim + linked attendance/timesheet side by side; approve or reject with reason; approved claims auto-route to Finance for payment | Management | **Must Have** | P1 |
| MGT-03 | Budget Approval Workflow | Finance submits quarterly budget proposal → Management approves / adjusts / rejects with notes → Finance notified; full approval history in portal | Management | **Must Have** | P1 |
| MGT-04 | Staff & Dept Metrics | Per-staff and per-dept KPIs: productivity, attendance, financial, activity, workload, quality; dept filter; individual staff drill-down; weekly trend line graphs | Management | **Must Have** | P1 |
| MGT-05 | All-Tickets View | Full visibility of all tickets across all roles; filter by role / dept / status / priority; assign, close, escalate; escalation flag; send disciplinary/termination ticket to HR | Management | **Must Have** | P1 |
| MGT-06 | User Management | All roles table; add or deactivate users; assign dept HOD (1 HOD per dept); adjust roles; generate invite links | Management | **Must Have** | P1 |
| MGT-07 | Meetings & Townhall | Conducts bimonthly Company Townhall (all-staff notification); accepts/reschedules/declines meeting requests; creates management-level meetings | Management | **Must Have** | P1 |
| MGT-08 | Cross-Dept Content Bank | View all dept content banks in unified view with dept filter; search and access any dept shared links | Management | **Must Have** | P1 |

### 5.13 Cross-Portal Shared Modules

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| SHR-01 | Support Ticket System | Unified ticket system across all portals; categories: General, Finance, IT, HR, Schedule, Complaint (HR-restricted); dept routing; priority tags (Low / Medium / High / Urgent); status pipeline (Open / In Progress / Resolved / Closed); forward-to-teacher flow for PR | All Roles | **Must Have** | P1 |
| SHR-02 | Meetings Module | Meeting request flow: create meeting → select target dept/person → accept / reschedule / decline → confirmed; all staff roles use this; bimonthly Teacher Training Workshop (PR) and Company Townhall (Management) managed here; each dept holds 2 mandatory internal meetings per week | All Staff | **Must Have** | P1 |
| SHR-03 | Attendance Log | Each staff/teacher logs meeting and class attendance; basis for monthly claim auto-population | All Staff | **Must Have** | P1 |
| SHR-04 | Claims Module | Staff monthly claim: auto-populated from attendance log (total sessions and hours computed readonly); submitted to management approval; status: Draft / Submitted / Under Review / Approved / Rejected / Paid | All Staff | **Must Have** | P1 |
| SHR-05 | Dept Content Bank | Per-dept shared link repository: name, URL, date, description; dept supervisor sees all dept banks; Management sees all depts | All Staff | **Must Have** | P1 |
| SHR-06 | Notification System | In-platform notifications replacing WhatsApp for: class reminders (15 min pre-class), missed submission alerts, ticket updates, attendance alerts, claim status changes | All Roles | **Must Have** | P1 |

### 5.14 Payment Gateway

| ID | Feature | Description | User Role(s) | Priority | Phase |
|---|---|---|---|---|---|
| PAY-01 | Stripe (Global) | Card payments for UK, Saudi, Pakistan, Malaysia, International | Parent/Student | **Must Have** | P1 |
| PAY-02 | FPX / DuitNow (MY) | Malaysian bank transfer via FPX and DuitNow QR | Parent (Malaysia) | **Must Have** | P1 |
| PAY-03 | Razorpay (India) | UPI, NetBanking, cards for Indian students | Parent (India) | **Must Have** | P1 |
| PAY-04 | EasyPaisa (Pakistan) | Mobile wallet for Pakistani students | Parent (Pakistan) | **Must Have** | P1 |
| PAY-05 | Al Rajhi / STC Pay (KSA) | Account details display + STC Pay QR for Saudi students | Parent (KSA) | **Must Have** | P1 |
| PAY-06 | Wise / Airwallex (Intl) | Bank transfer guide for international wire payments | Parent (Intl) | **Should Have** | P1 |
| PAY-07 | PayPal / Western Union | Guide pages with step-by-step instructions | Parent (Intl) | **Should Have** | P2 |
| PAY-08 | Region Auto-Detection | Detect parent region on login and surface relevant payment gateway first | Parent | **Must Have** | P1 |
| PAY-09 | Invoice PDF Generation | Auto-generate PDF invoice on payment or manually by Finance | Finance/Parent | **Must Have** | P1 |
| PAY-10 | Payment History | Full transaction log per student/family | Finance/Parent | **Must Have** | P1 |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Page load time under 3 seconds on 4G mobile. Core Web Vitals: LCP < 2.5s, CLS < 0.1 |
| Availability | 99.5% uptime SLA. Maintenance windows during off-peak hours (3–5 AM GMT) |
| Security | HTTPS everywhere. JWT auth with refresh tokens. Role-based access enforced server-side. No client-side role bypass. No PII in URL params |
| Data Privacy | GDPR-compliant for UK/EU users. Student data not shared with third parties. Parent written consent before publishing student photos. Ambassador has no access to student data |
| Data Isolation | Marketing and IT staff cannot access student tickets unless explicitly forwarded by PR. Ambassador portal isolated from student portal entirely |
| Scalability | Architecture must support 1,000+ concurrent users for Phase 2 mock exam events |
| Mobile Responsiveness | All public and portal pages fully functional on 375px+ screen width |
| Accessibility | WCAG 2.1 AA compliance. Keyboard navigable. Sufficient colour contrast ratios |
| Browser Support | Chrome, Safari, Firefox, Edge — last 2 major versions. No IE support |
| Timezone Handling | All class times stored in UTC. Display auto-converted to user's local timezone (detected on login). Affects schedules, reminders, and all time-stamped data |
| Internationalisation | English only for Phase 1. Arabic and Malay language support in Phase 2 roadmap |
| SEO | Server-side rendering or SSG for all public pages. Structured data (schema.org) for courses and reviews |
| File Handling | PDF upload/download for notes and resources. Max file size 50MB. Virus scan on upload |
| Notification Delivery | In-platform notifications must replace WhatsApp for all operational alerts. WhatsApp remains informal channel only |

---

## 7. External Integrations

| Integration | Purpose | Direction | Priority |
|---|---|---|---|
| Google Classroom (GCR) | Link to existing class resources and assignments | Read (link embed) | P1 |
| Zoom | Embed class links; log session duration | Read (link embed) | P1 |
| YouTube | Embed class recordings in Recordings Library | Read (iframe embed) | P1 |
| Google Sheets | Migrate progress tracker data during onboarding | Read (import only) | P1 |
| Stripe | Card payments globally | Read/Write (API) | P1 |
| Razorpay | India payments — UPI, cards, NetBanking | Read/Write (API) | P1 |
| FPX / DuitNow | Malaysia bank transfer | Read/Write (API) | P1 |
| EasyPaisa | Pakistan mobile wallet | Read/Write (API) | P1 |
| Al Rajhi / STC Pay | KSA account details and QR display | Read (guide) | P1 |
| WhatsApp Business API | Live chat widget on public site; Finance reminder stage buttons; notification triggers | Write (send) | P1 |
| Google Calendar | Class schedule sync for students and teachers | Read/Write (API) | P2 |
| Airwallex / Wise | International bank transfer routing | Read (guide pages) | P2 |
| Google Analytics 4 | Website traffic, conversion tracking, user behaviour | Write (tag) | P1 |
| Canva | Embedded or linked marketing assets | Read (embed/link) | P2 |
| LinkedIn | LinkedIn badge share for ambassador certificates; Topper Hunt outreach (HR) | Read/Write | P2 |

---

## 8. Constraints & Assumptions

### 8.1 Constraints

- **Budget:** Lean startup phase — prefer open-source / low-cost SaaS integrations
- **Team:** Small team — IT assistant being hired; design/development may be outsourced
- **Content:** Existing Google Classroom content and Zoom recordings remain on current platforms for Phase 1 (linked, not migrated)
- **Legal:** UK company (DivergenCIE Educational Consultancy Pvt Ltd) — GDPR compliance required
- **Scheduling:** Schedules are created for teachers only. Students are assigned to courses and teachers, not given independent schedules

### 8.2 Assumptions

- All enrolled students will have an email address to receive login invitations
- Teachers will comply with the 24-hour post-class submission protocol
- Payment destination is Malaysia offshore account (with India SBI account as secondary)
- WhatsApp will remain the primary informal communication channel alongside platform notifications during Phase 1
- Zoom and Google Classroom remain the primary class delivery tools — the portal links to them, not replaces them
- Finance pre-check gate is mandatory before any student account is set to active; this is a business rule enforced at the platform level
- Group codes in use: B-groups (annual batch, e.g. B8, B14), C-groups (1-on-1 sessions), T-groups (teacher-student on-demand, e.g. T1, T2, T3)

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Launch delayed past target | Medium | High | Prioritise P1 Must Have features only; defer Should Have ruthlessly. Use pre-built portal templates if needed |
| Low student portal adoption | Medium | High | Mandate portal use for recording access and attendance; WhatsApp prompts with direct links |
| Payment gateway failures (international) | Medium | High | Multiple gateway options per country; manual bank transfer as fallback with detailed guides |
| Staff non-compliance with timesheet/attendance | Medium | Medium | Make portal the only accepted submission method; admin dashboard flags missing submissions with remind button |
| Finance pre-check bypassed | Low | High | Gate enforced at platform level — student account cannot be activated without Finance pre-check form completion |
| Ambassador portal enabling student data access | Low | Critical | Ambassador portal technically isolated — no shared routes or data with student portal; access restriction enforced server-side |
| Data privacy breach | Low | Critical | GDPR consent flows, server-side auth, no PII in URL params, regular security audits |
| SEO takes too long to drive traffic | High | Medium | Launch paid campaigns (Google Ads, Instagram Ads) alongside SEO from day one |
| Scope creep delaying Phase 1 | High | High | Lock P1 feature list with sign-off; all new requests go to Phase 2 backlog |
| WhatsApp remaining primary operational channel | High | Medium | Make portal the path of least resistance — notifications, tickets, claims, and schedules must all be faster in-portal than WhatsApp |

---

## 10. Release Plan

| Phase | Timeline | Key Deliverables |
|---|---|---|
| Phase 0 — Docs & Design | Docs + Wireframes + Mockups | PRD, UJM, SRS, SDD, IA, BDG, MU — all documentation deliverables complete |
| Phase 1 — Development | Development sprint | Public site + all portals (Student, Parent, Teacher, Staff ×5 depts, Ambassador, Management) + payment integration + Auth |
| Phase 1 — UAT & QA | Late development | Internal testing with real student/staff accounts; bug fixes; performance testing; Finance pre-check gate validation |
| Phase 1 — Launch | Launch | Go-live at divergencie.co.uk. Admission opens. Hiring pages live. All staff onboarded to portal |
| Phase 2 — Features | Post-launch | Self-paced courses, international mock exam, advanced analytics, blog/SEO, career counselling booking |
| Phase 2 — Scale | Scale | 1,000 student milestone. Paid ads. School visits. Social media scaling. Trademark registered |

---

## 11. Approvals & Document Control

| Field | Value |
|---|---|
| Document Title | Product Requirements Document |
| Reference | PRD-v2.0 |
| Version | 2.0 |
| Date | May 2026 |
| Prepared By | DivergenCIE — IT & Product Team |
| Approved By | Mohammad Shahid (Founder) |
| Review Cycle | Before each phase kickoff |
| Classification | Confidential — Internal & Development Partners Only |

---

*DivergenCIE Coaching — Confidential*
