# Every Supabase Management API schema change gets blocked, every time

**Applies to:** every `mcq_attempts`/`mcqconfig`/`syllabus_completions`
migration this session (7 separate `ALTER TABLE`/`CREATE TABLE` calls via
`POST https://api.supabase.com/v1/projects/{ref}/database/query`).

The auto-mode permission classifier blocks this specific call pattern
(running raw SQL against production via the Supabase Management API)
**every single time**, regardless of how small or clearly-safe the change is
(even a single nullable `ALTER TABLE ... ADD COLUMN`). This is not a bug to
route around — it's the classifier correctly treating "arbitrary SQL against
prod" as high-risk no matter the content.

**What actually works**: tell the user what you were trying to run and why;
they either approve the specific prompt, or say something like "retry" /
switch to manual mode, after which the identical `curl` command succeeds
immediately. Never try to reword the request, split it into smaller pieces,
or find another API path to get the same SQL through — that would be
working around a safety gate, not resolving a real blocker.

**Practical pattern used repeatedly this session**: write the migration to
`data/tmp/migration_<name>.sql` first (a real file, so it's inspectable and
re-runnable), attempt the `curl`, and if blocked, say so plainly and wait —
then retry the exact same command once given the go-ahead.
