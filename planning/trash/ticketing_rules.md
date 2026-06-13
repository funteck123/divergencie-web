# DivergenCIE Ticketing System: Core Rules

## 1. Immutable Root Target
- When a ticket is created, the `originalDept` is set and **cannot be changed**.
- The `department` field tracks the *current* owner of the ticket.

## 2. Hand-Back Workflow (Reply Logic)
- **Ping-Pong Model**: Official replies automatically hand the ticket back to the previous sender.
- Staff cannot manually choose a handover target during an `Official Reply`.
- To move a ticket to a new department, the `Forward` action must be used explicitly.

## 3. Self-Targeting Prevention
- A user cannot target themselves (Source User != Target User).
- A user cannot assign a ticket to themselves.
- A user cannot forward a ticket to themselves.
- Departmental self-targeting (Forwarding to own dept) is allowed, but not to own user ID.

## 4. Privacy & Internal Notes
- `Internal Note` is strictly staff-only.
- External users (Students, Parents, Candidates, etc.) **must never** see internal notes in the UI or API.

## 5. Attachments
- Only Google Drive links are allowed as attachments.
- Initial posts and each reply/note can have one attachment link.

## 6. Access Control
- **Candidates**: Can only create tickets for the **HR** department.
- **Students/Teachers/Others**: Can target any department.
- **External Users**: Cannot `Forward` or `Assign`. They can only `Create`, `Reply`, and `Close` (own tickets).
- **Staff**: Can `Forward` to any department or staff/external user.
- **Supervisors**: Can `Assign` tickets within their department.

## 7. Departmental Routing Restrictions (External Targeting)
To maintain operational focus and privacy, the following restrictions apply to **Create** and **Forward** actions:
- **IT Department**: Strictly **Internal Only**. Cannot create tickets for or forward tickets to any external user roles.
- **Marketing Department**: External targeting is restricted **exclusively to Ambassadors**.
- **Finance Department**: Cannot target **Students** (Privacy/Fee sensitivity). Can target Parents, Teachers, Candidates, and Ambassadors.
- **HR Department**: Cannot target **Students** or **Parents**. Restricted to Candidates, Teachers, and Ambassadors.
- **PR / Operations**: No restrictions. Can target all internal and external roles.
- **Management**: No restrictions. Global override capability.
