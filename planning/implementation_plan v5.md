# DivergenCIE Coaching — Full-Stack Implementation Plan v5 (Supabase Stack)

> **Goal:** Build a fully functioning, production-ready web platform implementing the **complete ERD v23 (~170 entities)** and all system logic. The system must be capable of **onboarding real users** — students, parents, teachers, staff, ambassadors, and management — with full data flows from enrolment through billing, scheduling, attendance, and reporting.
>
> **Deployment target:** Vercel.
> **Database:** Supabase PostgreSQL (Transaction Mode Pooler for serverless runtime, direct connection for migrations).
> **Authentication:** Supabase Auth (email+password, manual user creation only via Supabase admin SDK).
> **Storage:** Supabase Storage (public `receipts` bucket) for manual invoice receipt uploads.

---

## Technical Stack Architecture (v5 Decisions)

| Layer | Technology | Configuration / Usage |
|-------|------------|-----------------------|
| **Database** | Supabase PostgreSQL | Prisma 7 client, using Transaction Pooler URL (`postgresql://...:6543`) for runtime and Session Mode Direct URL (`postgresql://...:5432`) for migrations. |
| **ORM** | Prisma 7 | Standard `@prisma/adapter-pg` pool adapter in `src/lib/db.ts` to satisfy client generator types. |
| **Auth** | Supabase Auth | Managed session cookies via `@supabase/ssr` server client helper. Signature maps email to Prisma database to resolve user `role`, `dept`, `subGroup`, and `supervisor` status. |
| **File Storage** | Supabase Storage | File receipts uploaded to the public `receipts` bucket via the Supabase Client SDK in `src/app/api/upload/receipt`. |

---

## Proposed Changes — Phase 2 Implementation Tasks

### Component 1: Webhook & Manual Approval Notifications (Priority 1)

Ensure both Stripe webhook checkout completions and manual payment approvals trigger a user-facing notification.

#### [MODIFY] [src/app/api/payments/webhook/route.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/payments/webhook/route.ts)
- Find the `NotificationType` with `name: "PAYMENT_RECEIVED"`.
- Create a `Notification` record for the student (`invoice.studentId`) with payment details.
- If the student has a `parentId`, create an identical notification for the parent.

#### [MODIFY] [src/app/api/payments/[recordId]/approve/route.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/payments/[recordId]/approve/route.ts)
- Find the `NotificationType` with `name: "PAYMENT_RECEIVED"`.
- Create a `Notification` record for the student and parent upon manual approval success.

---

### Component 2: WhatsApp Reminder Stage Tracker (Priority 2)

#### [NEW] [src/lib/whatsapp.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/whatsapp.ts)
- Implement `generateWhatsAppLink(invoice, user, stage)` helper:
  - Generates the URL-encoded WhatsApp text templates for Stages 1 to 5.
  - Formats:
    - **Stage 1 (Due Soon):** Friendly reminder that invoice is due soon.
    - **Stage 2 (Overdue - Deactivate 3d):** Warning that account will be deactivated in 3 days.
    - **Stage 3 (Deactivated):** Account deactivated notification.
    - **Stage 4 (Receipt Acknowledged):** Settle payment confirmation received.
    - **Stage 5 (Payment Plan):** Flexible payment plans negotiation nudge.
  - Matches the recipient's phone number (`user.whatsappNumber` or fallback to parent's).
  - Returns `https://wa.me/[Phone]?text=[Message]`.

#### [NEW] [src/app/api/invoices/[id]/whatsapp-reminder/route.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/invoices/[id]/whatsapp-reminder/route.ts)
- **GET**: Fetch invoice by ID, check permissions, retrieve parent/student whatsapp details, and call `generateWhatsAppLink` for the current `reminderStage`.
- **PATCH**: Accepts `{ stage: number }` to update the `reminderStage` in the database. Prevents skipping stages arbitrarily (e.g. must go sequentially `currentStage + 1` or stay at same).

---

### Component 3: Conflict Detection System (Priority 2)

#### [NEW] [src/lib/conflict.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/lib/conflict.ts)
- Implement `detectScheduleConflict(serviceId, proposedOccurrence)` helper:
  - Finds the teacher and students associated with the given `serviceId`.
  - Queries active occurrences (`isActive: true, status: "ACTIVE"`) for the teacher and students across all other services.
  - Checks if the proposed day of the week matches any active schedule.
  - If days match, checks time overlap by converting time components of `startTime` and `endTime` to minutes-from-midnight and checking `S1 < E2 && S2 < E1`.

#### [NEW] [src/app/api/schedules/[serviceId]/conflict-check/route.ts](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/api/schedules/[serviceId]/conflict-check/route.ts)
- **POST**: Accepts `{ dayOfWeek, startTime, endTime, recurrenceType, oneOffDate }` and evaluates conflict status. Returns `{ conflict: boolean, details: Array<{ type, userName, occurrence }> }`.

---

### Component 4: Frontend Portal Dashboard Wiring (Priority 3)

Remove static mockup placeholders and plug portals directly into server actions.

#### [MODIFY] [src/app/portal/student/page.tsx](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/student/page.tsx)
- Dynamically fetch user profile details (`name`) and replace "Alex" header.
- Wire today's classes to real `AcademicSession` records.
- Retrieve student announcements via `getStudentAnnouncements()`.
- Add deactivation checkpoint: Redirect paused/inactive students to onboarding checklist page.

#### [MODIFY] [src/app/portal/parent/page.tsx](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/parent/page.tsx)
- Wire children select option, real invoices list, and parent announcements.

#### [MODIFY] [src/app/portal/teacher/page.tsx](file:///home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/src/app/portal/teacher/page.tsx)
- Wire active classes summary and doubts/questions queue.

---

## Verification Plan

### Automated Tests
- Run `node ./node_modules/typescript/bin/tsc --noEmit` to confirm no TypeScript compilation errors exist.
- Run vitest tests via node command.

### Manual Verification
- Settle checkout sessions and verify `Notification` items populate in database.
- Request WhatsApp links and inspect final generated strings.
- Submit conflicting times to check detection response.
