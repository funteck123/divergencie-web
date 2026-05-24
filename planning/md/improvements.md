# DivergenCIE Platform — Functional Improvements List (100 Items)

This list compares the current implementation against the **User Journey Map (UJM-v3.0)** and **Product Requirements Document (PRD-v2.0)**. It focuses on **functionality**, not UI aesthetics.

## 🟢 1. Prospective Student & Onboarding (1-10)
1. **Mock Simulator Integration**: Replace static mock UI with real quiz logic that computes score and saves to `StudentProgress` model.
2. **Enrolment Form Logic**: Connect the "Enrol Now" form to create a `Lead` record in the database instead of just console logging.
3. **Region-Based Pricing**: Auto-detect user IP to display local currency (MYR, INR, SAR, GBP) on the pricing page.
4. **Teacher Profile Links**: Link landing page "Expert Tutors" to dynamic profiles fetched from the `User` model with `role: "teacher"`.
5. **Waitlist Management**: If a course is full, add "Join Waitlist" functionality that creates a `Lead` with status `waitlist`.
6. **Email Auto-Responder**: Trigger a Resend/SendGrid welcome email immediately upon lead submission.
7. **Onboarding Checklist (Student)**: Implement the UJM-stage-28 checklist: "GCR Join", "WhatsApp Link", "Profile Setup" progress bar.
8. **Pre-Check Gate**: Block student portal access until Finance dept marks `preChecked: true` in the `User` model.
9. **Document Upload**: Allow prospective candidates and students to upload IC/Passport copies directly via `src/app/portal/candidate`.
10. **Referral Attribution**: Ensure `Referral` model is populated when a user lands with `?ref=CODE` in the URL.

## 🔵 2. Student Journey: Academics & Support (11-25)
11. **Timezone-Aware Schedule**: Dashboard schedule must calculate offsets based on `Intl.DateTimeFormat` vs session `startTime`.
12. **Live Zoom Join Logic**: "Join" button should only activate 5 minutes before `startTime` and log the entry in `Attendance`.
13. **Whiteboard Link Persistence**: Save the MS Whiteboard link per `AcademicSession` and display it in the student portal recordings page.
14. **Doubts Tracker (Syllabus-Linked)**: Connect doubts to `SyllabusItem` so teachers can see which chapter has the most friction.
15. **Recording Auto-Publish**: When a teacher submits a timesheet, the `Recording` entry should automatically appear in the student's view.
16. **Material Filters**: Filter `Asset` bank by Subject and Board (IGCSE vs A-Level) on the student dashboard.
17. **One-Click Reschedule**: Add a "Request Reschedule" button on missed classes that creates a `Ticket` for PR/Ops.
18. **Assignment Submission**: Allow students to paste GCR links into the `Assignment` model via the portal.
19. **Grading Notifications**: Trigger in-portal notification when an `Assignment` status changes to `graded`.
20. **Support Ticket Routing**: Student tickets must auto-route to the assigned teacher first, then escalate to PR.
21. **Chapter Completion Toggle**: Students should be able to mark chapters as "In Progress" or "Done" in the `StudentProgress` model.
22. **Mock Review Archive**: A dedicated section for "Mock Review" recordings in the `Recording` model.
23. **Searchable Syllabus**: Search bar for the `SyllabusItem` list to find specific topics quickly.
24. **Group Chat Links**: Dynamically display the WhatsApp group link for the student's specific batch (B/C/T groups).
25. **Revision Mode**: A "Revision" tag in the Recordings page that filters for high-impact exam-prep videos.

## 🟠 3. Parent Journey: Monitoring & Fees (26-35)
26. **Linked Account View**: Parent dashboard must pull data for all linked `User` IDs in the `students` relation.
27. **Real-Time Attendance Feed**: Show "Attended/Missed" status of the last 5 sessions for their child.
28. **Invoice Generation**: Auto-generate `Invoice` PDF based on the student's `RateCard` and group code.
29. **Payment Status Sync**: Link "Fees & Payments" to the `Invoice` model status (Paid/Overdue).
30. **Region-Specific Gateways**: Show Stripe for UK/International, FPX for Malaysia, PayTM for India based on user profile.
31. **Receipt Generation**: After payment, auto-generate a receipt and send it to the parent's email.
32. **Progress Milestone Alerts**: In-portal alert when a child completes 25/50/75% of a subject's syllabus.
33. **Monthly Report PDF**: Button to download a generated PDF summary of attendance and mock scores.
34. **Fee Query Tickets**: Support ticket sub-type `FEE_QUERY` that routes directly to Finance dept.
35. **Advance Payment Tracker**: Visual indicator for "Advance Collected" status in the Parent dashboard.

## 🔴 4. Teacher Journey: Logistics & Pay (36-45)
36. **Pre-Class Checklist**: Add a modal on "Join Class" requiring check of: "Recording ON", "Breakout Rooms ready", "Whiteboard Titled".
37. **Smart Timesheet Form**: Auto-populate "Subject" and "Duration" in the submission form based on the current `AcademicSession`.
38. **Whiteboard URL Validation**: Validate that the submitted Whiteboard link is a valid MS Whiteboard URL.
39. **Attendance Bulk Select**: Allow marking multiple students present/absent in a single session.
40. **Claim Auto-Population**: "Submit Monthly Claim" button should pull data from all `Attendance` records for the month.
41. **Hour-Based Calculation**: Claim total must be `Sum(Duration) * hourlyRate` from the `User` profile.
42. **Unsubmitted Attendance Alert**: Alert on dashboard if sessions > 24hrs old haven't had attendance marked.
43. **Ticket Comment Flow**: Teachers must be able to "Comment" on tickets forwarded by PR without closing them.
44. **Host Key Access**: Securely display the Zoom Host Key for the session only to the assigned teacher.
45. **Department Meeting RSVP**: "Accept/Decline" logic for the 2 mandatory weekly internal dept meetings.

## 🟣 5. Staff: PR & Operations (46-55)
46. **Conflict Checker**: In `portal/staff/shared/schedule`, flag if a teacher is assigned to two overlapping sessions.
47. **Batch Mapping Tool**: Interface to assign students to B/C/T groups and link them to specific teachers.
48. **Teacher Submission Tracker**: PR dashboard widget showing which teachers have NOT submitted whiteboard links for the day.
49. **At-Risk Student Flagging**: Auto-flag students with > 2 missed classes in a row for PR intervention.
50. **Ticket Forwarding Logic**: Ability to forward a student ticket to HR or Finance with internal notes.
51. **Universal Search**: Staff search across Students, Teachers, and Tickets in one input.
52. **Course Creation**: Form to add new `SyllabusItem` entries for new subjects.
53. **Townhall Scheduler**: Create `Meeting` entries with `targetDept: "All Staff"` that appear on everyone's dashboard.
54. **Shared Content Bank**: Searchable link repository per department with "Copy Link" shortcut.
55. **Attendance Audit**: View teacher-submitted attendance and "Verify" it before management approval.

## 🟡 6. Staff: HR & Recruitment (56-65)
56. **Candidate Bank**: CRUD interface for the `Candidate` model (Name, Role, CV Link, Status).
57. **Interview Scheduler**: Allow HR to request an interview time which the `Candidate` can confirm.
58. **Trial Class Feedback**: Form for PR/Students to submit feedback on a candidate's trial class.
59. **Offer Letter Generator**: Basic template system to generate an offer letter from candidate data.
60. **Warning Letter Log**: Record disciplinary actions in the `Candidate` or `User` model (hidden from user).
61. **Topper Hunt Log**: Track outreach attempts for country/world topper candidates.
62. **Onboarding Progress Tracker**: HR view of new hire's progress through the "Guidebook/IT Setup" steps.
63. **Termination Trigger**: Management ticket to HR should have a "Process Termination" action button.
64. **LinkedIn Badge Links**: Store and manage LinkedIn certificate URLs for completed ambassador cohorts.
65. **Staff Directory**: Active staff list with roles and contact info (staff-only view).

## 💰 7. Staff: Finance & Rates (66-75)
66. **Rate Card Manager**: Interface for `RateCard` model (Course + Country + Group Code).
67. **Arrears Dashboard**: Colour-coded view of overdue invoices (Stage 1-4 as per UJM).
68. **Payment Plan Logic**: Ability to flag an `Invoice` as "Payment Plan" which overrides standard overdue alerts.
69. **Approved Claims Queue**: Finance-only view of claims marked `approved` by management, with "Mark Paid" button.
70. **Scholarship Manager**: Link specific students to a discount percentage that auto-applies to invoices.
71. **Bank Account Records**: Securely store staff bank details in the `User` model for Finance access only.
72. **Budget Planner**: Quarterly allocation tool where Finance can set targets for PR/HR/Marketing/IT.
73. **Expense Tracking**: Log non-payroll expenses (Zoom subs, Software) against the budget.
74. **Revenue Reporting**: Monthly chart of Invoiced vs Collected vs Arrears.
75. **Automatic Deactivation**: Logic to set `active: false` on `User` if `Invoice` stays `overdue` for > 14 days.

## 📣 8. Staff: Marketing & Growth (76-85)
76. **Posting Calendar Status**: Interface for `MarketingPost` with "Scheduled / Posted / Missed" toggles.
77. **Canva/Drive Link Integration**: Fields in the calendar for direct links to assets.
78. **Missed Post Auto-Ticket**: If a post date passes without `status: posted`, auto-create a PR ticket.
79. **Lead Handoff Button**: One-click button in the Lead log to "Pass to PR" which creates a ticket for Ops.
80. **Ambassador Cohort Tracker**: Group ambassadors by 3-month or 6-month cohorts in the tracker.
81. **Commission Calculator**: Auto-compute ambassador commission based on `Referral` count marked `converted`.
82. **Asset Search**: Search the `Asset` model by `campaignTag` (e.g. "TopperHunt2026").
83. **News Feed Manager**: CRUD for `Announcement` entries targeting specific roles.
84. **Social Performance Notes**: Field in `MarketingPost` to log engagement stats after posting.
85. **WhatsApp Template Buttons**: Quick-copy buttons for common marketing outreach scripts.

## 🛠️ 9. IT & System Integrity (86-93)
86. **Access Log Manager**: View and manage `AccessLog` (who has the Zoom host key, GCR admin, etc).
87. **IT Ticket Queue**: Dedicated view in the staff portal for tickets assigned to IT dept.
88. **Credential Reset Flow**: Ability for IT to reset user passwords manually if OAuth fails.
89. **Tech Roadmap Widget**: Simple task list in the IT dashboard for "Future Integrations".
90. **Audit Trail**: View `TicketHistory` logs for sensitive ticket movements.
91. **Database Backup Trigger**: (If possible) One-click button to trigger a SQLite snapshot.
92. **API Documentation**: A page (IT only) listing all available internal API endpoints.
93. **Error Log Viewer**: A UI to view the last 50 entries of the server-side error logs.

## 👑 10. Management & Oversight (94-100)
94. **Staff Activity Scores**: Compute a "Productivity Score" based on `Ticket` resolution speed and `Attendance` punctuality.
95. **Claim Review Panel**: Side-by-side view of a staff `Claim` and their `Attendance` logs for verification.
96. **Global Ticket Oversight**: Management-only view of ALL tickets across ALL departments.
97. **Budget Approval Workflow**: Interface to approve/reject budget proposals from Finance.
98. **Supervisor Assignment**: UI to toggle `supervisor: true` and set `dept` for staff users.
99. **Company Townhall Management**: Ability to blast an announcement to ALL users simultaneously.
100. **A* Gap Analytics**: Management-view aggregation of `StudentProgress` to see which subjects are underperforming globally.
