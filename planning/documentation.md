# DivergenCIE Software Documentation

## 🏗️ System Architecture
Next.js 15 (App Router) + Prisma 7 (SQLite) + Next-Auth (v5 Beta)

## 🎫 Ticketing & Support System

### 1. Database-Driven Permission Matrix (Access Matrix)
Instead of hardcoded routing logic, the system uses a **TicketPermission** table in the database.
- **Location**: `src/app/portal/management/permissions`
- **Logic**: Management can toggle inter-departmental targeting (e.g., HR can target Finance) and external targeting (e.g., IT can target Students) in real-time.
- **Enforcement**: Both `TicketCreateForm.tsx` and `TicketDetail.tsx` (Forwarding) fetch these rules to filter available options.

### 2. Stack-Based Routing Logic (LIFO)
To handle complex inter-departmental hand-offs, the system implements a **Routing Stack**.
- **The "Forward" (Push)**: When a ticket is forwarded, the current state (Dept + Assignee) is pushed onto the `routingStack` JSON field.
- **The "Hand Back" (Pop)**: Clicking **Reply & Hand Back** pops the last entry from the stack.
    - If the stack is empty, it returns to the **Source Creator**.
    - If a supervisor forwards an unassigned ticket, they are pushed as the return point.
- **Recursive Chain**: This allows a ticket to travel Student → HR → PR → HR → Student with perfect accountability at each "Hand Back" step.

### 3. Ticket ID System
- **Format**: `YYYYMMDD-X` (e.g., `20260511-1`)
- **Logic**: On creation, the API counts tickets created on the current date and increments the sequence.
- **Storage**: Stored in the `displayId` field for user-friendly reference, while using internal CUIDs for database relations.

### 4. Queue States & Dynamic UI
- **Active Queue (Open Tab)**: Tickets where `(Status == OPEN || REOPENED) && User == Owner`.
- **Pending Threads (Processing Tab)**: 
    - Tickets explicitly set to `PROCESSING`.
    - Tickets that are `OPEN` but the current user is an "Involved Participant" (Forwarder/Creator) and NOT the current owner.
- **Strict Lock**: Once a staff member hands back or forwards a ticket, their reply input is **Locked** to prevent out-of-turn communication.

## 🔒 Authentication & Security
- **Middleware**: Protected routes under `/portal/*`.
- **Session**: Custom properties (`dept`, `role`, `supervisor`, `subGroup`) are passed via JWT to avoid redundant DB lookups.

## 🛠️ Developer Reference
- `src/lib/ticketPermissions.ts`: Centralized authority for action-based guards (Close, Reopen, etc.).
- `prisma/schema.prisma`: Defines the `Ticket`, `TicketHistory`, `TicketMessage`, and `TicketPermission` models.
- `src/app/api/tickets/[id]/route.ts`: Core PATCH handler managing the Routing Stack and Status Resets.

## 📁 Repository Map
- `src/components/portal/tickets/TicketDetail.tsx`: Main interaction hub.
- `src/components/portal/tickets/TicketCreateForm.tsx`: Permission-aware creation form.
- `src/app/portal/management/permissions/page.tsx`: The Management Matrix UI.
