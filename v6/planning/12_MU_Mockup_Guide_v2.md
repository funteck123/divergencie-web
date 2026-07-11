# DivergenCIE Coaching
# Mockup & Visual Design Guide

**Document 12 of 12 · MU · Version 2.0**

| | | | |
|---|---|---|---|
| **Prepared by** | DivergenCIE Tech Team | **Date** | May 2026 |
| **Version** | v2.0 — UJM-Informed Revision | **Status** | Draft — Pending Figma Review |
| **Tool** | Figma (primary design tool) | **Domain** | divergencie.co.uk |
| **Supersedes** | v1.0 (May 2025) | **Reference** | UJM-v3.0, PRD-v1.0, SRS-v1.0 |

---

## 1. Purpose & Scope

This Mockup & Visual Design Guide (MU) is Document 12 of the DivergenCIE Coaching documentation suite. It defines the complete visual language, page-level mockup specifications, component inventory, and Figma handoff process for building the DivergenCIE web platform.

This document bridges the Wireframe Guide (WF — Doc 11) and the developer implementation phase. Designers must treat this as the source of truth for all visual decisions.

**v2.0 Change Summary:** This version incorporates all corrections and additions derived from the User Journey Map (UJM-v3.0). New portal surfaces have been added for PR/Operations, HR, Finance, Marketing, IT, Ambassador, and Management roles. Cross-journey insights from UJM Section 7 and Section 15 have been systematically applied to mockup specifications throughout.

### Scope of this Document

- Public marketing site (single-page landing + supporting pages)
- Student Portal — all authenticated pages
- Staff Portal — all staff roles: Teacher, PR/Operations, HR, Finance, Marketing, IT
- Parent Portal — progress, fee, and schedule views
- Ambassador Portal — dedicated portal for ambassador programme
- Management Portal — operations oversight and approvals
- Hiring / Careers page
- Free Mock Simulator (public-facing tool)
- Payment flow UX (multi-country)

---

## 2. Design Principles

### Premium & Academic

The platform serves high-achieving students preparing for Cambridge, AP, IB, and SAT examinations. The visual language must feel authoritative, clean, and aspirational — never playful or juvenile.

### Clarity First

Every element must serve a clear purpose. Reduce cognitive load with consistent spacing, predictable layouts, and unambiguous labelling.

### Mobile-Aware

Students access from phones. All mockups must have mobile breakpoint annotations. Start desktop-first; document mobile divergence explicitly.

### Fast & Lightweight

Avoid heavy image backgrounds, excessive gradients, or animation-heavy UI. Use skeleton loaders, lazy images, and minimal JavaScript-driven motion.

### Accessible

Meet WCAG 2.1 AA. Colour contrast ≥ 4.5:1 for text. All interactive elements keyboard-navigable. Focus rings visible.

### Consistent Component Language

Reuse design system components across all portals. Do not invent new patterns if an existing component satisfies the need.

### Role-Contextual Dashboards *(New — from UJM §15)*

Staff dashboards must surface dept-specific quick actions and widgets based on the logged-in user's dept tag. Universal pages (tickets, attendance, claims, content bank, meetings) are shared across all depts but filtered to role context.

---

## 3. Colour System

The DivergenCIE colour palette is derived from the brand guidelines (Doc 01 — BDG). All hex codes must be used as defined — no tinting or mixing outside these tokens.

| **Navy #1B2A4A** | **Teal #0D6E8A** | **Gold #C9922A** | **Lt Blue #D5E8F0** | **Lt Gold #FDF3E3** | **Grey #F5F5F5** |
|---|---|---|---|---|---|

### 3.1 Colour Usage Rules

- Navy (#1B2A4A) — primary text, headings, sidebar background, footer background.
- Teal (#0D6E8A) — primary interactive colour (buttons, links, active states, borders).
- Gold (#C9922A) — accent for highlights, badges, A\* achievement indicators, warnings.
- Light Blue (#D5E8F0) — background tint for info cards, table header rows, callout boxes.
- Light Gold (#FDF3E3) — background tint for achievement/success callouts.
- White (#FFFFFF) — default page background, card backgrounds.
- Grey (#F5F5F5) — alternating table rows, secondary panel backgrounds.
- Never use pure black (#000000) for body text — use #222222 or #333333 instead.
- Destructive / Error — use #C0392B (red); Success — use #1A7A4A (green).

---

## 4. Typography System

Primary typeface: Inter (Google Fonts). Fallback: Arial, sans-serif. All text must render correctly on Windows (Arial fallback), macOS (SF Pro fallback), and mobile browsers.

| **Element** | **Font** | **Weight** | **Size** | **Colour** | **Usage** |
|---|---|---|---|---|---|
| H1 Page Title | Inter / Arial | 700 Bold | 36–40px | #1B2A4A | Page or section title |
| H2 Section Head | Inter / Arial | 600 SemiBold | 28–32px | #0D6E8A | Major section label |
| H3 Sub-heading | Inter / Arial | 600 SemiBold | 22–24px | #C9922A | Card or sub-section |
| Body / Paragraph | Inter / Arial | 400 Regular | 16px | #222222 | Main content text |
| Caption / Label | Inter / Arial | 400 Regular | 13px | #555555 | Form labels, captions |
| Button CTA | Inter / Arial | 700 Bold | 15–16px | #FFFFFF | Primary action buttons |
| Nav Link | Inter / Arial | 500 Medium | 15px | #1B2A4A | Top nav, sidebar links |
| Badge / Tag | Inter / Arial | 600 SemiBold | 12px | varies | Status pills, tags |

### 4.1 Typography Rules

- Never use more than 2 typeface weights on the same visual element.
- Line height for body text: 1.6. For headings: 1.2.
- Max line length for body paragraphs: 680px (approximately 70–75 characters).
- Use sentence case for all UI labels, buttons, and nav items — not ALL CAPS (except badge tags).
- Links must be underlined on hover; colour #0D6E8A. Visited links: #1B2A4A.

---

## 5. Spacing & Grid System

DivergenCIE uses an 8px base grid. All spacing values are multiples of 4px. The layout grid for desktop is 12-column with a 24px gutter and 48px page margin. On mobile it collapses to 4 columns.

| **Token** | **Value** | **Use Case** | **Example** |
|---|---|---|---|
| space-1 | 4px | Icon gap, micro padding | Icon + label |
| space-2 | 8px | Inner cell padding | Table cells |
| space-3 | 12px | Button padding (vertical) | btn py-3 |
| space-4 | 16px | Card inner padding | Card body |
| space-6 | 24px | Section inner spacing | Form field rows |
| space-8 | 32px | Card gap, grid gutter | Dashboard cards |
| space-12 | 48px | Section top/bottom padding | Hero, CTA blocks |
| space-16 | 64px | Page section separation | Between sections |

### 5.1 Border Radius

- radius-sm — 4px — Input fields, table cells, small buttons
- radius-md — 8px — Cards, modals, dropdowns
- radius-lg — 12px — Feature cards, hero panels
- radius-xl — 20px — Pill badges, tags, avatar circles
- radius-full — 9999px — Circular avatars, toggle switches

---

## 6. Responsive Breakpoints

The platform must be tested and verified at all five breakpoints before handoff to engineering. Figma frames should be produced for xs (375px) and lg (1280px) as minimum deliverables; md (768px) recommended for portal pages.

| **Breakpoint** | **Width** | **Layout** | **Sidebar** | **Nav** |
|---|---|---|---|---|
| xs (Mobile) | < 480px | Single column, stacked | Hidden | Hamburger menu |
| sm (Mobile L) | 480–767px | Single column, stacked | Hidden | Hamburger menu |
| md (Tablet) | 768–1023px | 2-column grid | Collapsible | Top nav + icons |
| lg (Desktop) | 1024–1279px | 3-column grid | Fixed 240px | Full top nav |
| xl (Wide) | ≥ 1280px | 3–4 column grid | Fixed 260px | Full top nav + search |

---

## 7. Component Inventory

All components must be built in Figma as Auto Layout frames and exported to the design system library before page mockups are assembled. Each component must have at minimum: Default, Hover, Active/Pressed, Disabled, and Focus states.

### 7.1 Navigation Components

| **Component** | **Used On** | **Behaviour** | **State** | **Notes** |
|---|---|---|---|---|
| Top Navigation Bar | All authenticated pages | Fixed top, z-index 100, blurred bg | Default / scrolled | Logo left, links centre, avatar right |
| Sidebar Navigation | Student / Staff / Parent / Ambassador / Management portal | Fixed left 240px wide | Expanded / Collapsed | Active link highlighted in Teal; items filtered by role/dept |
| Mobile Hamburger Nav | xs / sm screens | Overlay drawer, 300px wide | Open / Closed | Swipe-to-close gesture |
| Breadcrumb | Deep portal pages | Clickable ancestors | Static | Font size 13px, colour #555555 |
| Tab Bar | Dashboard, Exams pages | Underline active tab | Active / Inactive | Border bottom 2px Teal |
| Dept Role Badge | Staff portal top nav | Inline badge next to avatar | Static | Shows dept tag e.g. 'PR', 'HR', 'Finance' |

### 7.2 Form Components

| **Component** | **Used On** | **Behaviour** | **State** | **Notes** |
|---|---|---|---|---|
| Text Input | All forms | Controlled, validation on blur | Default/Focus/Error/Disabled | Border colour changes on state |
| Dropdown / Select | Subject, timezone, country | Searchable, keyboard nav | Open / Closed / Error | Chevron icon right-aligned |
| Date Picker | Schedule, DOB, exam date | Calendar popover, month nav | Default / Active | Format: DD MMM YYYY |
| Time Picker | Schedule change requests | Hour:Minute dropdowns | Default / Active | Timezone suffix label shown |
| Checkbox | Multi-select, agreements | Animated tick on check | Unchecked/Checked/Indeterminate | 16px box, 4px radius |
| Radio Button | Tier selection, payment method | Single select group | Unselected / Selected | 18px circle, Teal fill selected |
| File Upload | Assignment submission, CV upload | Drag-drop zone + browse button | Idle / Hover / Uploading / Done | Show file name and size |
| Rich Text Editor | Announcements, support tickets | Toolbar: Bold, Italic, List, Link | Edit / Preview modes | Quill or TipTap implementation |

### 7.3 Feedback & Status Components

| **Component** | **Used On** | **Behaviour** | **State** | **Notes** |
|---|---|---|---|---|
| Toast Notification | Post-action feedback | Slide in top-right, auto-dismiss | Success/Error/Info/Warning | 4 variants, 3s default duration |
| Alert Banner | Page-level warnings | Full-width below nav | Info/Warning/Error | Dismissible with X icon |
| Loading Spinner | API call in progress | Centred in container | Spinning | 40px, Teal colour |
| Skeleton Loader | Initial page load | Pulse shimmer animation | Loading | Match final layout shape |
| Progress Bar | Course completion, upload | Horizontal fill, labelled % | In-progress / Complete | Teal fill, Gold at 100% |
| Empty State | No data views | Illustration + CTA button | Static | Use UnDraw illustration |
| Confirmation Modal | Destructive actions | Overlay, focus trapped | Default / Loading | Cancel + Confirm buttons |
| Tooltip | Icon labels, truncated text | Show on hover, 150ms delay | Visible / Hidden | Max 200px wide, 8px radius |

### 7.4 Data Display Components

| **Component** | **Used On** | **Behaviour** | **State** | **Notes** |
|---|---|---|---|---|
| Data Table | Progress tracker, attendance | Sortable headers, row hover | Default / Sorted / Loading | Sticky header, pagination |
| Card | Dashboard modules, listings | Shadow on hover, border radius 8px | Default / Hover | Header / body / footer slots |
| Badge / Tag | Status, subject, exam type | Inline pill shape | varies by variant | 8 colour variants |
| Avatar | User profiles, comment threads | Circle, initials fallback | Default / Online | Green dot for online status |
| Stat Card | Dashboard KPIs | Icon + number + label + delta | Default / Loading | Teal icon, Gold positive delta |
| Calendar View | Schedule page | Month / week / day toggle | Default / Selected date | Highlight exam dates in Gold |
| Chart (Line) | Exam score analytics | Responsive, hover tooltip | Default / Hover | Recharts library |
| Chart (Bar) | Attendance, mock results | Grouped or stacked | Default / Hover | Recharts library |
| Reminder Stage Badge *(New)* | Finance payment reminder tracker | Shows current reminder stage 1–5 | Static | Colour-coded by stage severity |
| Referral Tracker Row *(New)* | Ambassador portal | Link clicks + enrolments + commission | Default / Hover | Computed readonly fields |

### 7.5 Action & Workflow Components *(New — from UJM)*

| **Component** | **Used On** | **Behaviour** | **State** | **Notes** |
|---|---|---|---|---|
| Ticket Routing Selector | All ticket forms | Dept dropdown: PR / HR / Finance / IT / Marketing | Open / Closed | Routes ticket to correct dept queue |
| Pre-Class Checklist Widget | Teacher dashboard | Checkboxes: Record on · Breakout room · Camera on · Whiteboard titled · Student reminded | Incomplete / Complete | Locks 15 min before class |
| Approval / Reject Panel | Management, Finance claims | Side-by-side: claim detail + linked attendance/timesheet | Reviewing / Approved / Rejected | Reason field required on reject |
| WA Template Button | Finance payment reminders | One-click button fires correct staged WA template | Stage 1–5 | Auto-selects stage from tracker |
| Missed Class Alert Banner | Student portal | Red banner: missed class + 'Request Reschedule' CTA | Active / Dismissed | One-click reschedule pre-fills support ticket |
| Onboarding Checklist | Student / Staff first login | Step-by-step tool setup checklist per role | Incomplete / In Progress / Done | Dismissible after all steps complete |
| Meeting Request Card | All staff portals | Create → target dept/person → accept/reschedule/decline | Pending / Confirmed / Declined | Dept filter; mandatory 2/week dept-internal meetings |

---

## 8. Icons & Asset Library

All icons are from the Lucide React library unless otherwise stated. Custom icons must be submitted as SVG files with standardised artboard sizes. Illustrations are from UnDraw with brand colour overrides applied.

| **Icon / Asset** | **Library / Source** | **Size** | **Usage** |
|---|---|---|---|
| Navigation icons | Lucide React | 20–24px | Sidebar & top nav |
| Action icons | Lucide React | 18–20px | Buttons, tooltips |
| Status badges | Custom SVG | 12–14px | Pills, tags |
| Logo (full) | DivergenCIE.svg | Auto | Header, login page |
| Logo (icon only) | DivergenCIE icon | 32px | Favicon, mobile nav |
| Illustrations | UnDraw (custom) | Variable | Empty states, onboarding |
| Avatar placeholder | Initials circle | 36–48px | User profiles |
| Country flags | flag-icons CSS | 20px | Payment country selector |

---

## 9. Motion & Animation Spec

Animations must be purposeful, not decorative. Every animation must serve to guide attention, confirm actions, or communicate system state. Prefer CSS transitions over JavaScript animations for performance.

| **Animation** | **Duration** | **Easing** | **Trigger** | **Notes** |
|---|---|---|---|---|
| Button hover | 150ms | ease-out | Mouse enter | Scale 1.02 + shadow |
| Modal open | 200ms | ease-in-out | Click CTA | Fade + slide up |
| Page transition | 250ms | ease-in-out | Route change | Fade cross-dissolve |
| Toast / Alert | 300ms | ease-out | Action result | Slide from top-right |
| Sidebar expand | 200ms | ease-in-out | Menu click | Width expand |
| Skeleton load | 1.2s | linear infinite | Data fetching | Shimmer effect |
| Dropdown open | 150ms | ease-out | Click / focus | Scale + fade |

### 9.1 Animation Rules

- Never animate more than 2 properties simultaneously on a single element.
- Respect prefers-reduced-motion — all animations must have a no-motion fallback.
- Page transitions must complete in under 300ms to feel responsive.
- Loading states must appear within 100ms of an action — do not leave the user without feedback.
- Avoid looping animations on data-heavy pages; they increase perceived CPU load.

---

## 10. Page-Level Mockup Specifications

The following sections define the visual layout for each major page. Each spec uses a Zone / Component table format that maps directly to Figma frames. Wireframe reference from Doc 11 (WF) applies. UJM-sourced additions are marked *(UJM)*.

---

### 10.1 Public Landing Page (Home)

The landing page is the primary marketing surface. It must immediately communicate brand authority, service scope, and a clear CTA to enrol or learn more.

| **PUBLIC — Home Page Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Nav Bar** | Logo left · Nav links (About, Services, Pricing, Careers, Login) · 'Enrol Now' CTA button (Teal, bold) |
| **Hero Section** | Dark Navy background · H1: 'Cambridge & AP Excellence' · Subheading: coaching credentials · Two CTAs: 'Enrol Now' (Gold) + 'See Courses' (Teal outline) · Subtle geometric book illustration right side |
| **Trust Bar** | Logos: Cambridge Assessment International Education + CollegeBoard · Stats: X students, Y A\*s, Z countries |
| **Services Grid** | 3-col card grid: IGCSE · A Levels · AP · IB · SAT / ACT · IELTS — each card has icon, title, short desc, 'Learn More' link |
| **About Section** | Split layout: text left (DC mission, team credentials, Edinburgh/LSE/Imperial) · Team photo placeholder right |
| **Pricing Section** | 3-tier pricing cards: Foundations · A\* · World Topper — highlight A\* as 'Most Popular' in Gold badge |
| **Social Proof** | Student testimonial carousel with avatar, name, grade, result · Star rating · Country flag |
| **CTA Banner** | Navy band: 'Ready to get your A\*?' + 'Enrol Now' button (Gold) + WhatsApp contact button (green) |
| **Footer** | Logo · Links: About, Privacy, Terms · Social icons (IG, LinkedIn) · Copyright · divergencie.co.uk |

**UJM Corrections:**
- Hero must display A\* testimonials and social proof prominently to address discovery-stage quality signal gap (UJM Journey 1 — Discovery).
- Pricing section must be clearly reachable from nav; do not hide behind enquiry flow (UJM Journey 1 — Awareness).
- Teacher profiles with credentials must appear on the About or Services page (UJM Journey 1 — Awareness).
- Free Mock Simulator must have a clear CTA on the landing page to encourage pre-enrolment engagement (UJM Journey 1 — Intent).

---

### 10.2 Student Portal — Dashboard

The student dashboard is the home screen after login. It must show the most critical information at a glance: upcoming classes, pending assignments, recent scores, and notices.

| **STUDENT PORTAL — Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | DC logo · Search bar · Notification bell (badge count) · Avatar dropdown (Profile / Settings / Logout) |
| **Sidebar** | Nav items: Dashboard · Classes · Assignments · Exams · Study Plan · Recordings · Mock Solver · Support · WhatsApp Group |
| **Welcome Banner** | Teal gradient · 'Good morning, [Name]' · Next class countdown chip · Quick action: 'Join Class' button |
| **Onboarding Checklist** *(UJM)* | Shown on first login only: step-by-step checklist — portal setup, GCR invite, WhatsApp group join, Zoom test · Dismissible after all steps complete |
| **KPI Cards Row** | 4 stat cards: Classes This Month · Assignments Due · Mock Score (latest) · Study Hours — with delta vs last month |
| **Upcoming Classes** | Table: Date · Subject · Teacher · Zoom link · Status (Upcoming/Completed/Missed) — next 5 classes · Timezone auto-detected and displayed in user local time *(UJM)* |
| **Missed Class Alert** *(UJM)* | Red banner if any class missed: class name + date + 'Request Reschedule' one-click button → support ticket pre-filled |
| **Pending Actions** | Checklist: Overdue assignments · Unpaid fee · Missing timesheet entry · Profile incomplete |
| **Score Chart** | Line chart: last 6 mock exam scores per subject · hover tooltip showing score, grade, date |
| **Announcements** | Card list: latest 3 announcements from staff · timestamp · unread badge |
| **Quick Links** | Icon grid: Google Classroom · Zoom · WhatsApp · Past Papers · Notes · Request Reschedule |

---

### 10.3 Student Portal — Classes

| **STUDENT PORTAL — Classes Page Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Page Header** | H1: 'My Classes' · Filter bar: Subject (multi-select) · Status (All / Upcoming / Missed / Completed) · Month picker |
| **Class Cards** | Card per class: Subject icon · Subject name · Teacher avatar + name · Date/time with timezone (auto-localised) *(UJM)* · Zoom link button · Status badge · 'View Recording' (if done) |
| **Missed Classes** | Red-bordered card variant · Reason shown · 'Request Reschedule' button → support ticket pre-filled |
| **Recording Auto-Link** *(UJM)* | Recording link auto-published once teacher timesheet is submitted; no manual upload required by student |
| **Calendar Toggle** | Toggle: List View / Calendar View — calendar shows colour-coded classes by subject |
| **Pagination** | 20 per page, prev/next + page number |

---

### 10.4 Student Portal — Assignments

| **STUDENT PORTAL — Assignments Page Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Filter Bar** | Subject · Status (Pending/Submitted/Graded/Overdue) · Due Date range picker |
| **Assignment Card** | Title · Subject · Assigned by · Due date (red if overdue) · Upload button · Status badge · Score (if graded) |
| **Upload Flow** | Click Upload → file picker modal → progress bar → success toast → status badge updates to Submitted |
| **Past Papers** | Separate tab: Past Paper Checklist — by year and variant — checkbox to mark as done · completion % progress bar |
| **Weak Area Flag** *(UJM)* | If mock score below threshold for a topic, yellow callout with 'Practise Past Papers for [Topic]' CTA |

---

### 10.5 Student Portal — Mock Solver (Timed)

| **STUDENT PORTAL — Mock Solver Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Setup Screen** | Select: Subject · Paper type · Year · Variant · Duration (auto or custom) · Start button |
| **Exam Interface** | Full-screen mode · Question panel left · Answer panel right · Timer countdown top-right (turns red at 10min) · Question nav grid |
| **Submit Flow** | Submit button → confirm modal → result screen with score, grade boundary, per-question feedback |
| **Profile Stats** | History tab: past mock attempts table · Score trend chart · Average by topic · Weakest topics flagged *(UJM: personalised weak-area report)* |
| **Upsell Prompt** *(UJM)* | After result screen (public simulator only): 'Improve your score with DivergenCIE coaching' · Enrol Now CTA |

---

### 10.6 Student Portal — Recordings & Study Materials

| **STUDENT PORTAL — Recordings Page Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Filter Bar** | Subject · Date range · Teacher |
| **Recording Cards** | Class date · Subject · Teacher · Duration · Embedded player or external link · Auto-published status badge |
| **Notes Section** | Organised by subject and date · Download PDF/link button per entry |
| **GCR Integration Link** | 'Open Google Classroom' button per subject — unified access point to avoid scattered navigation *(UJM)* |

---

### 10.7 Student Portal — A\* Progress Tracker

| **STUDENT PORTAL — Progress Tracker Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Chapter Checklist** *(UJM)* | Per subject: chapter-wise checklist with Done / In Progress / Not Started toggles · Completion % progress bar |
| **Score Analytics** | Monthly score trend chart · Per-topic average · Weakest topics highlighted in red |
| **Doubts Tracker** *(UJM)* | Tag a doubt to a specific chapter · Status: Open / Forwarded to Teacher / Resolved · Links to support ticket |
| **A\* Gap Indicator** | Visual gauge: current grade vs A\* boundary · Suggested focus areas |

---

### 10.8 Staff Portal — Teacher Dashboard

| **STAFF PORTAL — Teacher Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | Same as student but with 'Staff — Teacher' role badge on avatar |
| **Sidebar** | Dashboard · My Students · Attendance · Assignments · Support Tickets · Payment Claims · Schedule · Recordings |
| **Pre-Class Checklist Widget** *(UJM)* | Sticky widget showing today's upcoming classes: per class checklist — Recording on · Breakout room set · Camera on · Whiteboard titled · Student reminded · Locks 15 min before class |
| **Today's Classes** | Timeline view: classes for today with student names, zoom links, 'Submit Attendance' button (required post-class) |
| **Attendance Form** | Per class: student list with present/absent toggle · Duration field · Whiteboard link field · Submit — locks after 24h |
| **Student Overview** | Table: Student name · Subjects · Last class · Pending assignments · Progress % · Flag if at risk |
| **Payment Claims** | Table of pending payment claims · Status · Amount · Submit new claim button · Claims auto-populated from submitted timesheets *(UJM)* |
| **Timesheet Submission** | Smart form: whiteboard name, WBD link (format-validated), duration, attendance list, recording link · All 3 mandatory; 24hr SLA flag shown *(UJM)* |

---

### 10.9 Staff Portal — PR / Operations Dashboard *(New — from UJM)*

| **STAFF PORTAL — PR/Ops Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | DC logo · 'Staff — PR/Ops' role badge · Notification bell · Avatar |
| **Sidebar** | Dashboard · Schedule · Student Tracker · Ticket Management · Workshops · Content Bank · Attendance · Claims · Meetings |
| **Schedule Management** | Create + issue teacher schedules · Conflict-check system: auto-flags overlapping slots · Assign students to teachers · Batch/group code manager: B-groups (annual batch e.g. B8, B14), C-groups (1-on-1), T-groups (teacher-student on-demand e.g. T1, T2, T3) |
| **Post-Class Tracker** | Dashboard flags overdue teacher submissions (whiteboard name, WBD link, duration, attendee list, recording — all 3 mandatory, 24hr SLA) · Per-teacher remind button |
| **Ticket Management** | Incoming student/parent tickets · Forward to teacher for comment · Read reply · Close ticket · Route to Finance/IT/HR/Marketing as needed · Priority tags + dept routing + status pipeline |
| **Student Monitoring** | At-risk widget: missing assignments, missing class, poor progress flagged · One-click remind button per student |
| **Workshops** | Bimonthly Teacher Training Workshop scheduling (teachers + PR + TA) · Meeting creation and notification |
| **Content Bank** | Add/search/filter dept shared links (name, URL, date, desc) · Supervisor sees all dept banks |
| **Claims** | Attendance-based monthly claim form · Auto-populated from attendance log · Live approval status badge |

---

### 10.10 Staff Portal — HR Dashboard *(New — from UJM)*

| **STAFF PORTAL — HR Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Sidebar** | Dashboard · Candidate Bank · Interview Scheduler · Staff Records · Complaints · Topper Hunt · Attendance · Claims · Meetings |
| **Candidate Bank** | Table: name, role applied, status (Active/Inactive/Hired/Rejected), CV link, notes · Add new candidate button |
| **Interview Scheduler** | WA template with time-slot picker for candidates · Google Calendar integration for scheduling · Trial task assignment form (trial class for teachers; demo task for marketing/other) |
| **Trial Feedback** | Star rating + text form per candidate · HR sees aggregated result in portal |
| **Offer & Onboarding** | Offer letter generator from template · Per-role onboarding checklist (portal credentials, DC Guidebook, IT/Data Policy, Zoom/Whiteboard setup) · Onboarding meeting scheduler (Zoom, 30 min, supervisor present) |
| **Staff Records** | Active/inactive status · Warning letter log · Termination log (triggered by management ticket auto-routed to HR) · LinkedIn cert / LoR issuance |
| **Complaint Handling** | HR ticket sub-type: complaint/disciplinary · Restricted to HR + management only · Resolution + escalation flow |
| **Topper Hunt** | Candidate outreach log: name, platform, status (Contacted/Responded/Invited) |
| **Claims & Meetings** | Auto-populated attendance claim · Meeting request flow: create → accept/reschedule/decline → confirmed |

---

### 10.11 Staff Portal — Finance Dashboard *(New — from UJM)*

| **STAFF PORTAL — Finance Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Sidebar** | Dashboard · Rate Cards · Invoice Manager · Payment Tracker · Reminder Stages · Pre-Check · Budget Planner · Claims Outgoing · Scholarships |
| **Rate Card Manager** | Course + country + group code matrix (B-groups/C-groups/T-groups) · Edit in-place · Single source of truth |
| **Invoice Manager** | Invoice generator linked to student enrolment + rate card · One-click issue · Send to parent via portal/email |
| **Payment Tracker** | Per-student dashboard: Paid / Due / Overdue / Deactivated · Colour-coded · Payment history table |
| **Reminder Stage Tracker** | Per student: staged WA reminder status — Stage 1 Due Soon → Stage 2 Overdue/Deactivate in 3 days → Stage 3 Deactivated → Stage 4 Receipt Acknowledged → Stage 5 Payment Plan · WA button auto-selects correct stage message |
| **Student Pre-Check Gate** *(UJM)* | Pre-check form at student activation: payment method confirmed · First invoice paid · Advance payment collected · Gate prevents activation until complete |
| **Budget Planner** | Dept allocation table · Submission to management for approval · Approval status badge |
| **Claims Outgoing** | Approved claims queue · Mark paid · Upload payment confirmation |
| **Scholarships & Discounts** | Assign discount/coupon to student · Auto-applies to next invoice |

---

### 10.12 Staff Portal — Marketing Dashboard *(New — from UJM)*

| **STAFF PORTAL — Marketing Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Sidebar** | Dashboard · Posting Calendar · Asset Bank · Lead Log · Ambassador Tracker · Attendance · Claims · Meetings |
| **Posting Calendar** | Post rows: Canva link · Drive link · Caption · Date · Status (Scheduled/Posted/Missed) · Auto-flag if missed → PR/Ops action ticket auto-created · Filter by content type (carousel/reel/vlog/alumni/competition/staff/literature) |
| **Asset Bank** | Name · Type (image/video/carousel) · Drive link · Date · Campaign tag · Searchable index |
| **Lead Log** | Source · Name · Contact · Date · 'Passed to PR' flag · Handoff button → triggers PR ticket |
| **Ambassador Tracker** | Name · Cohort (3-month / 6-month) · Referrals · Enrolments · Commission (auto-computed) · Status (Active/Inactive/Rewarded) |
| **Access Restriction Note** | Marketing cannot see student tickets or student data unless forwarded by PR/staff — UI restricts data access accordingly |

---

### 10.13 Staff Portal — IT Dashboard *(New — from UJM)*

| **STAFF PORTAL — IT Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Sidebar** | Dashboard · Ticket Queue · Website Change Requests · Access Log · IT Roadmap · Attendance · Claims · Meetings |
| **Ticket Queue** | Filter by dept=IT · Priority sort · Assign to IT team member · Status pipeline · Note: IT cannot see student tickets unless explicitly forwarded by PR/staff — access restriction enforced in UI |
| **Website Change Requests** | Ticket sub-type: page, change description, priority, before/after screenshot upload · Status: Open / In Progress / Done |
| **Access Log** | Staff name · Tools assigned (MS Whiteboard, Zoom, GCR) · Date granted · Revoked flag · Linked to HR onboarding/offboarding |
| **IT Roadmap** | Task list with status (Planned / In Progress / Done) · Links to tickets · Planned integrations: GCR, Zoom, Google Drive, payment gateways, WhatsApp Business API |
| **Claims & Meetings** | Auto-populated attendance claim · Meeting request flow |

---

### 10.14 Parent Portal — Dashboard

| **PARENT PORTAL — Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | DC logo · Child selector dropdown (if multiple children) · Notification bell · Avatar |
| **Sidebar** | Dashboard · Progress Report · Attendance · Schedule · Fee Payment · Support |
| **Onboarding Guide** *(UJM)* | First login: clear guide explaining how parent account differs from student account · Linked account confirmation |
| **Dashboard Cards** | Live attendance widget (today/this week) *(UJM)* · Chapter progress summary · Upcoming classes chip · Outstanding fee chip |
| **Progress Report** | Card: Subject · Grade trend · A\* gap indicator · Teacher comment (latest) · Download PDF button |
| **Attendance** | Monthly attendance heatmap · Missed class list with reason · Attendance % badge |
| **Schedule** | Upcoming classes table: Date · Subject · Teacher · Time (in parent's timezone) *(UJM)* — read-only |
| **Fee Payment** | Outstanding balance chip · Payment history table · 'Pay Now' button → country-specific payment flow |
| **Automated Alerts** *(UJM)* | Attendance miss notification via email/in-app · Monthly progress report email auto-sent |
| **Support** | Ticket form with category selection: Schedule change / Fee query / Technical / Other |

---

### 10.15 Payment Flow UX

The payment experience must adapt based on the student's registered country. The UI must show the most relevant payment methods first and provide guides for unfamiliar options.

| **PAYMENT — Country-Adaptive Flow Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Step 1 — Amount** | Invoice summary: subjects, duration, fee in GBP · Converted amount shown in local currency (live rate badge) |
| **Step 2 — Method** | Country auto-detected from profile · Methods shown in priority order (e.g. Malaysia: Stripe → FPX → DuitNow → Others) *(UJM: region-detected gateway suggestion)* |
| **Step 3 — Guide** | For manual methods (Wise, WU, Bank Transfer): step-by-step guide modal with QR / account details + copy button |
| **Step 4 — Confirm** | Upload payment proof (for manual) or Stripe redirect (for card) · Confirmation screen with reference number |
| **Step 5 — Receipt** | Email receipt + in-app notification · Status: Pending Verification / Confirmed *(UJM: instant email receipt)* |

---

### 10.16 Hiring / Careers Page

| **PUBLIC — Careers Page Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Hero** | Headline: 'Join the DivergenCIE Team' · Subhead: mission · 'View Open Roles' CTA |
| **Role Cards** | Card per opening: Title (Teaching Asst, SM Asst, HR Asst, IT Asst, Accounting Asst) · Type (Part-time / Intern) · Apply button |
| **Role Detail** | Click card → slide-over panel: Full JD with responsibilities, skills, time commitment *(UJM)* · Requirements · Benefits · 'Apply Now' button → application form |
| **Application Form** | Name · Email · Role · CV upload · Cover note · Submit → auto-confirmation email with expected timeline *(UJM)* + support ticket created |
| **Interview Schedule** | Shortlisted candidates receive calendar link (self-service time slot picker) *(UJM)* to book interview slot · Pre-interview brief sent 24hrs prior *(UJM)* |

---

### 10.17 Ambassador Portal *(New — from UJM)*

The Ambassador Portal is a standalone portal for programme participants. Ambassadors have no access to student data, student portal, or other staff areas.

| **AMBASSADOR PORTAL — Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | DC logo · 'Ambassador' role badge · Notification bell · Avatar |
| **Sidebar** | Dashboard · Referral Tracker · Deliverables · Earnings · Support Tickets · Programme Guide |
| **Dashboard** | Referral link + code prominently displayed with copy button · Programme duration badge (3-month / 6-month) · Progress to completion % |
| **Referral Tracker** | Link clicks · Enquiries · Enrolments · Commission earned per referral · Running total |
| **Deliverables** | Submission form per deliverable · Staff grades in portal · Ambassador sees score + feedback |
| **Earnings Dashboard** | Per-referral commission · Monthly allowance · Total earned · Payout status |
| **Completion & Certificate** | Certificate download from portal (on programme completion) · LinkedIn badge share link · Continuation pathway shown (intern/staff option) |
| **Support Tickets** | Raise ticket: dept select (PR/HR/Finance/IT/Marketing), title, desc, priority · Own ticket history only · No access to student data or student portal |

---

### 10.18 Management Portal *(New — from UJM)*

| **MANAGEMENT PORTAL — Dashboard Mockup** | |
|---|---|
| **Zone** | **Content / Component** |
| **Top Nav** | DC logo · 'Management' role badge · Notification bell · Avatar |
| **Sidebar** | Dashboard · Claims Approval · Budget Approval · Staff Metrics · Ticket Oversight · User Management · Meetings · Content Bank |
| **Dashboard** | Live stat cards: tickets open · claims pending · active students · staff activity score · Weekly trend sparklines · Priority alerts: overdue tickets, pending claims |
| **Claims Approval** | Claim review panel: claim detail + linked attendance/timesheet side by side · Approve / Reject with reason · Approved claims route to Finance for payment |
| **Budget Approval** | Budget approval workflow: Finance submits → management approves/adjusts/rejects → Finance notified |
| **Staff Metrics** | Dept filter · Staff drill-down · KPI categories: productivity, attendance, financial, activity, workload, quality · Weekly trend line graphs |
| **Ticket Oversight** | All-tickets view: filter by role/dept/status/priority · Escalation flag · Termination ticket to HR (triggers HR disciplinary workflow) |
| **User Management** | All roles table · Supervisor assignment (1 HOD per dept) · Deactivate toggle · Invite link generator |
| **Meetings & Townhall** | Bimonthly Company Townhall creation with all-staff notification · Meeting request flow: accept/reschedule/decline · Management-level meeting creation |
| **Content Bank** | Unified view of all dept content banks with dept filter |

---

## 11. Figma File Structure

All design files must follow this naming and page organisation convention. A single Figma project should contain all pages in one file for easy cross-reference.

| **Figma Page** | **Contents** | **Notes** |
|---|---|---|
| 00 — Cover | Project title, version, owner, date | Update on every release |
| 01 — Design System | Colours, typography, spacing, components library | Components as Figma components |
| 02 — Public Site | Landing, About, Pricing, Careers pages | Desktop + mobile frames |
| 03 — Student Portal | Dashboard, Classes, Assignments, Exams, Mock, Progress Tracker, Recordings | Desktop + mobile |
| 04 — Staff Portal — Teacher | Teacher dashboard, timesheet, pre-class checklist | Desktop primary |
| 05 — Staff Portal — PR/Ops | Schedule, student tracker, ticket management, workshops | Desktop primary |
| 06 — Staff Portal — HR | Candidate bank, interview scheduler, staff records, complaints | Desktop primary |
| 07 — Staff Portal — Finance | Rate cards, invoice manager, payment tracker, reminder stages, pre-check | Desktop primary |
| 08 — Staff Portal — Marketing | Posting calendar, asset bank, lead log, ambassador tracker | Desktop primary |
| 09 — Staff Portal — IT | Ticket queue, website change requests, access log, IT roadmap | Desktop primary |
| 10 — Parent Portal | Dashboard, Progress, Fee, Schedule | Desktop + mobile |
| 11 — Ambassador Portal | Dashboard, referral tracker, deliverables, earnings, support | Desktop + mobile |
| 12 — Management Portal | Dashboard, claims, budget, metrics, ticket oversight, user management | Desktop primary |
| 13 — Auth Flows | Login, Register, Forgot Password, OTP — all user types | All user types |
| 14 — Payment Flows | All country variants, step-by-step screens | 5 country flows minimum |
| 15 — Hiring Page | Public careers, application form | Desktop + mobile |
| 16 — Mock Simulator | Setup, exam interface, results screen | Desktop + mobile |
| 17 — Shared Flows | Meeting request, onboarding checklist, ticket routing | Cross-portal flows |
| 18 — Annotations | Interaction notes, hover states, edge cases | Link to component states |

### 11.1 Figma Component Naming Convention

- Use slash notation: ComponentName/Variant/State — e.g., Button/Primary/Hover
- All components must be in the 'Components' section of the Design System page.
- Use Figma Auto Layout for all components — no manual positioning.
- Variables must be used for all colour and spacing tokens.
- Prototype flows must be connected for all critical user journeys (login → dashboard, enrol → pay, claim → approval, missed class → reschedule).

---

## 12. Design-to-Development Handoff Checklist

Before any page is handed to the engineering team, the designer must complete the following checklist. Incomplete items must be flagged in the Figma annotation layer with an orange highlight.

### 12.1 Design Completeness

| **Item** | **Owner** | **Status** |
|---|---|---|
| All pages have desktop (1280px) frames | Designer | Pending |
| All pages have mobile (375px) frames | Designer | Pending |
| All interactive states documented (hover, focus, etc.) | Designer | Pending |
| Empty states designed for all data views | Designer | Pending |
| Error states designed for all forms | Designer | Pending |
| Loading / skeleton states present | Designer | Pending |
| Modal and drawer overlays included | Designer | Pending |
| All copy finalised (no Lorem Ipsum remaining) | Content | Pending |
| Timezone-localised schedule display verified on all portals | Designer | Pending |
| Dept-contextual sidebar nav verified per role | Designer | Pending |
| Pre-class checklist widget included on teacher dashboard | Designer | Pending |
| Onboarding checklist included for student and staff first login | Designer | Pending |
| Missed class alert banner included on student dashboard | Designer | Pending |
| Access restriction notes annotated for IT and Marketing portals | Designer | Pending |
| Finance pre-check gate designed and annotated | Designer | Pending |

### 12.2 Developer Handoff

| **Item** | **Owner** | **Status** |
|---|---|---|
| Figma dev mode enabled on all pages | Designer | Pending |
| All components use Figma Variables (colours, spacing) | Designer | Pending |
| Export specs set: 1x/2x PNG + SVG for icons | Designer | Pending |
| Font weights confirmed as available on Google Fonts | Designer | Pending |
| Interaction notes added to all clickable elements | Designer | Pending |
| Figma prototype flows cover all primary journeys | Designer | Pending |
| Assets folder organised: /icons, /illustrations, /logos | Designer | Pending |
| Accessibility contrast ratios verified (WCAG AA) | QA | Pending |
| Role-based sidebar nav variants documented for all 8 portal types | Designer | Pending |
| WA template button behaviour annotated (Finance, 5 stages) | Designer | Pending |

### 12.3 Stakeholder Sign-Off

| **Item** | **Owner** | **Status** |
|---|---|---|
| Internal design review completed | Lead Designer | Pending |
| Stakeholder walkthrough session held | PM / Founder | Pending |
| Revision round 1 feedback incorporated | Designer | Pending |
| Final approval received | Founder | Pending |
| Figma file version tagged as 'Approved for Dev' | Designer | Pending |

---

## 13. Cross-Journey UX Requirements Summary *(from UJM-v3.0)*

This section consolidates all UJM-sourced corrections and additions into a single reference for designers and developers.

| **Theme** | **UJM Observation** | **Mockup Requirement** |
|---|---|---|
| WhatsApp Dependency | All roles rely on WhatsApp for critical updates | In-platform notifications across all portals; WhatsApp only as supplementary channel |
| Scattered Resources | Students access recordings, notes, and GCR from 3+ places | Unify all resources in student portal under Recordings + Materials pages |
| Timezone Friction | Students in MY, IN, SA, UK face timezone confusion | Auto-detect and display all schedule times in user local timezone on all portals |
| Missed Class Recovery | No structured flow for rescheduling after absence | Missed class alert banner + one-click reschedule request in student dashboard |
| Onboarding Overload | Students and staff face multi-platform setup on day one | Single onboarding checklist page per role; shown on first login; dismissible |
| Payment Confusion | Parents unsure which payment method applies to their region | Auto-detect region and surface relevant gateways first in payment flow |
| Dept Identity in Staff Portal | All staff roles share one staff portal but have different workflows | Staff dashboard shows dept-specific quick actions and widgets based on dept tag |
| PR/Ops Schedule Gap | No in-portal teacher schedule creation or conflict-checking | PR portal: assign teachers to batches, flag conflicts, update group codes |
| HR Candidate Lifecycle | No in-portal tracking of candidates | HR portal: candidate bank, interview scheduler, trial task, offer tracker, warning/termination log |
| Finance Rate & Invoice Gap | Rates and invoices are manual; pre-check gate not enforced | Finance portal: rate card matrix + invoice manager + mandatory pre-check gate at student activation |
| Marketing Calendar Gap | Posting calendar and asset bank outside the portal | Marketing portal: posting calendar with status, asset bank, ambassador tracker, lead handoff to PR |
| IT Ticket Isolation | IT tickets mixed with all ticket types | IT dept view filters to dept=IT; dedicated access log page |
| Interdept Meeting Flow | No structured meeting request flow across depts | Shared meetings module on all staff portals: create → target → accept/reschedule/decline |
| Ambassador Portal Absent | Ambassadors have no digital home | Dedicated Ambassador Portal: dashboard, referral tracker, deliverables, earnings, support tickets |
| Teacher Pre-Class Checklist | Pre-class checklist not yet in teacher portal | Pre-class checklist widget on teacher dashboard: record on, breakout room, camera on, whiteboard titled, student reminded |
| Claims Auto-Population | Claim process requires manual cross-referencing | Claims page auto-pulls from attendance log; total sessions and hours readonly before submit |
| Management Oversight | No real-time aggregated management view | Management portal: live stat cards, claims approval with linked evidence, cross-role ticket view |

---

## 14. Version History

| **Version** | **Date** | **Author** | **Status** | **Summary** |
|---|---|---|---|---|
| v1.0 | May 2025 | DivergenCIE Tech Team | Superseded | Initial release — all 9 portal mockup specs, design system, component inventory, Figma guide, and handoff checklist |
| v2.0 | May 2026 | DivergenCIE Tech Team | Draft | UJM-v3.0 corrections applied — added PR/Ops, HR, Finance, Marketing, IT, Ambassador, and Management portal specs; role-contextual sidebar; pre-class checklist; missed class alert; timezone localisation; dept-based ticket routing; claims auto-population; finance pre-check gate; interdept meeting flow; updated Figma file structure and handoff checklist |

---

> **This document is part of the DivergenCIE Coaching Documentation Suite (v2).**
> 12 of 12 — MU — Mockup & Visual Design Guide
> *divergencie.co.uk · DivergenCIE Educational Consultancy · Confidential*