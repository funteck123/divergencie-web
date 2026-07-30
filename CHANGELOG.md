# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project is pre-1.0
(alpha) — expect breaking changes between minor versions.

## [Unreleased]

### Added
- Error monitoring via Sentry (server + client instrumentation), tuned for
  free-tier usage: low trace sampling (5%), 404s and browser-extension noise
  filtered out before they count against quota.
- Management audit trail (`auditlog` table) — every mutating admin action
  (services, users, invoices, paychecks, enrollments, reschedule approvals,
  API keys, ticket close/reopen) now records who did what, when.
- App-level structured logging (`applogs` table) alongside the audit trail.
- Generic issue-reporting Tickets feature: any signed-in account can raise a
  ticket (message + optional attachment URL) via a "Report an issue" button
  on every dashboard; Management can view, close, and reopen tickets from a
  new Tickets tab.

### Fixed
- `$0`-total invoice warning now only fires when it's actually misleading.
- Reschedule-request approval closed an IDOR (a non-owner could act on
  someone else's request).

### Notes
- Not yet deployed to production — `origin/main` is currently 51 commits
  behind local `main` (stuck at the Jul 19 build). See git log for the full
  list before pushing.
