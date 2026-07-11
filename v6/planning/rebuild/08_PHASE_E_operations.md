# Rebuild — Phase E: Operations subsystems (depend on Identity + RBAC)

| # | Module | Owns | Notes |
|---|---|---|---|
| E1 | `tickets` | Ticket, TicketMessage, TicketHistory, perms | Assignment gating (internal=staff, external=dept); reply status gating. |
| E2 | `hr` | Candidate pipeline, *Record disciplinary, StudentFlag | Pre-hire/trial flow (§26.12–14); submission-deadline warnings (ISSUE-094); StudentFlag auto-raise (§26.36). |
| E3 | `meetings` | Meeting, GeneralMeeting, Sprint/Backlog | Sprint/Backlog (ISSUE-096) — build or formally drop the dead tables. |
| E4 | `marketing` | MarketingPost/Slot/Campaign/Outreach | Posting cadence schedule->slot->post (ISSUE-048, after Phase B); missed-post -> PR ticket (§52.2). |
| E5 | `referrals` | Referral, ReferralClick, Lead | Lead -> PR handoff ticket (ISSUE-077); referral conversion tracking. |
| E6 | `comms` | Notification, Announcement, Content, KnowledgeBank | KnowledgeBank logic already real — keep, re-home into module. |
