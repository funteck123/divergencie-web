# DivergenCIE Ticketing System: Known Issues & Audit Findings

## 1. Handover Selection Redundancy
- **Issue**: Currently, the UI allows picking a handover target during an official reply.
- **Fix**: Remove the target selector from the reply area. Logic should automatically hand back to the last forwarder or the creator.

## 2. Attachment Integration
- **Issue**: Currently only text body is supported.
- **Fix**: Add `attachmentLink` field to both `Ticket` (initial) and `TicketMessage` (replies).

## 3. Original Target Visibility
- **Issue**: If a ticket is forwarded, the "Target" label changes to the current owner, losing track of the original target department.
- **Fix**: Display `Original Target: [Dept]` as an immutable label and `Current Owner: [Dept/User]` as a dynamic one.

## 4. Internal Note Leakage Risk
- **Audit**: `GET /api/tickets/[id]` filters `messages` by `isInternal`.
- **Verification**: Need to ensure `TicketList` (summary view) doesn't accidentally leak internal snippet text.

## 5. Sequence Clarity
- **Observation**: The Forwarding Sequence (Audit Trail) is helpful but needs to distinguish between "Forwarded" and "Handed Back".
