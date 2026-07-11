# ðŸ› ï¸ DivergenCIE Infrastructure Audit â€” Discrepancies & Improvements

This document tracks all technical, functional, and design discrepancies identified during the Phase L audit against the "Source of Truth" documentation (UJM, SVG Architecture, Master Plan).

---

## ðŸŽ¨ Global Aesthetics & Brand Identity
- **Unified Role Color Palette**: Ensure all portal avatars and badges match the official scheme:
  1. **Management**: Purple (`#8b5cf6`)
  2. **Staff**: Blue (`#3b82f6`)
  3. **Teacher**: Teal (`#0d9488`)
  4. **Ambassador**: Amber (`#f59e0b`)
  5. **Parent**: Coral (`#f43f5e`)
  6. **Student**: Green (`#22c55e`)
- **Nav Standardisation**: The `index.html` navigation style (transparent to solid on scroll) is the gold standard. Verify all inner pages (`pricing.html`, `about.html`, etc.) use this exact logic.

---

## ðŸŽ“ Student Portal Alignment
- **Missing Sidebar Links**:
  7. **Mock Solver**: Add link to a timed mock interface.
  8. **Study Group**: Add link to the peer-to-peer study group portal.
- **GCR Integration**: 
  9. Add "Open Google Classroom" links to each subject card in `classes.html` and `dashboard.html`.
- **Doubts Tracker**: 
  10. Integrate doubts from `curriculum.html` into the Support Ticket system.
- **Past Paper Checklist**: 
  11. Use the format `<Year> <Session> <Paper>` for tracking in `assignments.html`.

---

## ðŸ‘©â€ðŸ« Teacher Portal Alignment
- **Whiteboard (WBD) Naming Protocol**: 
  12. Update naming convention to: `<SubjCode> <Topic> - <DDMMYYYY> <BatchNo>`.
- **Recording SLA**: 
  13. Add dashboard reminder: "Recordings must be uploaded within 24 hours."
- **Attendance Claim**: 
  14. Automatically sync attendance submissions with the "Payment Claims" page.

---

## ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Parent Portal Alignment
- **Payment Plan Negotiation**: 
  15. Add "Request Payment Plan" button in `fees.html` leading to a Finance ticket.
- **Child Switching Persistence**: 
  16. Ensure all sub-pages respect the child selector state from the dashboard.
- **Attendance Milestone**: 
  17. Highlight 90%+ attendance as a specific achievement badge.

---

## ðŸ¢ Staff & Management Portal Alignment
- **Portal Restoration**: 
  18. Move all files from `backup/staff_deprecated/` to `portal/staff/`.
- **Department Isolation**: 
  19. IT/Marketing should only see tickets explicitly forwarded to them.
- **Supervisor Views**: 
  20. Add "Dept Overview" toggle for HODs to see team-wide metrics.
- **Budget Tracking**: 
  21. Implement "Budget spent/dept" chart in Management portal.

---

## âš™ï¸ Technical Hardening
- **Data Persistence**: 
  22. Map all `localStorage` keys to a formal JSON schema for future DB migration.
- **Timezone Logic**: 
  23. Ensure switcher persists and affects all date/time countdowns.
- **Performance**: 
  24. Verify Vercel Speed Insights script on all newly added routes.


## Handout

### Upcoming Phases

#### Phase: Full Stack Integration (Next.js & MySQL)
- **Frontend/Backend Unification:** Transition the current static HTML architecture to a Next.js React-based application.
- **Database Layer:** Implement a MySQL database (potentially with Prisma ORM) to persist all currently mocked data (tickets, mapping, rates, invoices, attendance).
- **API Routes:** Develop robust API endpoints for data fetching and mutations.

#### Phase: Authentication & Authorization
- **Database Auth Strategy:** Implement secure server-side sessions/JWT authentication.
- **Dummy Data Seeding:** Create predefined test accounts with dummy staff usernames (e.g., 
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\staff_pr
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\, 
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\staff_finance
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\, 
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\student_demo
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\) with simple passwords for testing the UJM flows.
- **Role-Based Access Control (RBAC):** Restrict access dynamically on the server side so students cannot access staff portals.

### Repository Architecture (Actual State)


---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\	ext
Folder PATH listing
Volume serial number is 34B9-C9CD
E:.
|   .gitignore
|   about.html
|   careers.html
|   contact.html
|   database_architecture.md
|   improvements.md
|   index.html
|   mock.html
|   PLAN.md
|   pricing.html
|   README.md
|   repo_tree.txt
|   resources.html
|   services.html
|   temp_log_line.json
|   update_nav.py
|   vercel.json
|   
+---assets
|   
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---images
|           logo.jpg
|           
+---auth
|       forgot-password.html
|       login.html
|       
+---backup
|   |   divergencie-v62.zip
|   |   Product Outcome Plan Documents.zip
|   |   
|   
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---staff_deprecated
|           attendance.html
|           claims.html
|           content-bank.html
|           dashboard.html
|           finance-rates.html
|           hr-candidates.html
|           marketing-calendar.html
|           meetings.html
|           schedule.html
|           tickets.html
|           
+---css
|       inner.css
|       portal.css
|       shared.css
|       styles.css
|       
+---js
|       main.js
|       portal.js
|       theme.js
|       
+---portal
|   +---ambassador
|   |       dashboard.html
|   |       tickets.html
|   |       
|   +---management
|   |       budget.html
|   |       dashboard.html
|   |       metrics.html
|   |       tickets.html
|   |       users.html
|   |       
|   +---parent
|   |       dashboard.html
|   |       fees.html
|   |       progress.html
|   |       
|   +---staff
|   |   |   dashboard.html
|   |   |   tickets.html
|   |   |   
|   |   +---finance
|   |   |       claims.html
|   |   |       invoices.html
|   |   |       rates.html
|   |   |       
|   |   +---hr
|   |   |       candidates.html
|   |   |       
|   |   +---it
|   |   |       access.html
|   |   |       
|   |   +---marketing
|   |   |       calendar.html
|   |   |       leads.html
|   |   |       
|   |   +---pr
|   |   |       attendance.html
|   |   |       compliance.html
|   |   |       mapping.html
|   |   |       
|   |   
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---shared
|   |           content-bank.html
|   |           meetings.html
|   |           schedule.html
|   |           
|   +---student
|   |       assignments.html
|   |       classes.html
|   |       curriculum.html
|   |       dashboard.html
|   |       progress.html
|   |       recordings.html
|   |       support.html
|   |       
|   
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---teacher
|           attendance.html
|           dashboard.html
|           payment-claims.html
|           tickets.html
|           
+---Product Outcome Plan Documents
|   |   01_BDG_Brand_Design_Guidelines_v1.docx
|   |   02_IA_Information_Architecture_v1.docx
|   |   03_PRD_Product_Requirements_Document_v1.docx
|   |   04_SRS_Software_Requirements_Specification_v1.docx
|   |   05_RPM_Roles_Permissions_Matrix_v1.docx
|   |   06_UJM_User_Journey_Map_v2.docx
|   |   07_PFD_Payment_Flow_Diagram_v1.docx
|   |   08_INT_Integration_Spec_Sheet_v1.docx
|   |   09_CI_Content_Inventory_v1.docx
|   |   10_SDD_Software_Design_Document_v1.docx
|   |   11_WF_Wireframe_Guide_v1.docx
|   |   12_MU_Mockup_Guide_v1.docx
|   |   dc-sim-v1 (1).svg
|   |   divergencie_role_architecture_v3_final.svg
|   |   master plan gsheet - rough notes v2.csv
|   |   
|   +---media
|   |       DivergenCIE Coaching Logo.jpg
|   |       
|   
---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---reference website
|       +---altacademy
|       |   |   AUDIT_02_Alt_Academy_v1.docx
|       |   |   httpsaltacademy.org full.jpg
|       |   |   httpsaltacademy.org hero.jpg
+---scratch
|       sync_nav.py
|       

---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\---services
        a-level.html
        ap.html
        ib.html
        ielts-toefl.html
        igcse.html
        sat-act.html
        


---

## 🔍 Phase L1: UJM v2 Audit Findings
- **PR/Operations (Dept: PR)**:
  - 25. **Teacher Metrics**: Missing centralised tracker for teacher class submissions (whiteboard link, recording upload, duration).
  - 26. **Student At-Risk Tracker**: Missing widget to flag students with missing assignments or poor progress for immediate PR intervention.
- **Human Resources (Dept: HR)**:
  - 27. **Hiring Decision Loop**: Missing structured scoring/feedback form for trial classes (student/parent feedback aggregation).
  - 28. **Staff Disciplinary Log**: Missing in-portal log for warning letters and termination triggers.
- **Finance (Dept: Finance)**:
  - 29. **Payment Reminder Automation**: Missing "Stage" tracker for WhatsApp reminders (Stage 1-5 logic) to ensure consistent chasing.
  - 30. **Activation Gate**: Missing mandatory "Pre-check Form" that must be completed before a student is activated in the system.
- **Marketing (Dept: Marketing)**:
  - 31. **Lead Handoff**: Missing one-click "Handoff to PR" button that creates a ticket in the PR queue with lead details.
- **Information Technology (Dept: IT)**:
  - 32. **Access Log**: Missing digital log for DC-assigned credentials (Zoom, Whiteboard, GCR) linked to onboarding/offboarding.
- **Teacher Portal**:
  - 33. **Pre-Class Checklist**: Missing mandatory reminder widget (Record on, Breakout rooms ready, Camera on) on the dashboard.
- **Inter-Departmental**:
  - 34. **Meeting Request System**: Missing structured "Accept/Reschedule/Decline" flow for inter-departmental townhalls and workshops.

\
