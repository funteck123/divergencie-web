# The entire MCQ/syllabus tracking feature has zero tickets

**Context:** this whole feature area (dozens of commits, 4 new/altered
Supabase tables, two prototype tools' full client UIs) was built entirely
from direct chat requests across one long session — never filed as a ticket
in the app's own real ticket system (`app/api/tickets/route.js`, the
`dcp1`-CLI-accessible one referenced throughout the parent `agent-notes/`
directory).

When asked mid-session to "close it" after a DC-Team-section content fix,
the correct answer (confirmed by asking rather than guessing) was "there's
no ticket for this — it was a direct request, not filed through the ticket
system, so there's nothing to close." Checked the real open-ticket list via
the CLI first rather than assuming one existed.

**General lesson**: not every unit of real work in this project traces back
to a ticket. Before hunting for "the ticket this relates to" or assuming
one must exist, consider whether the request came through the ticket system
at all — a lot of real, substantial work in this project's history (this
entire feature included) never did.
