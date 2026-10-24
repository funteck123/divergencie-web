-- Run this in the Supabase SQL Editor.
--
-- Fixes a real, confirmed production bug: ensureScheduleGenerated()
-- (lib/scheduleGen.js) decides which dates are "missing" for a given
-- Occurrence by reading the current scheduleitems table, then pushes new
-- rows for whatever it thinks is missing. GET /api/schedule, /api/me, and
-- /api/services all call it on every request. Two concurrent requests (two
-- students loading their dashboards seconds apart is enough) can both read
-- the table before either one's insert lands, both decide the same
-- Service+Occurrence+Date slot is missing, and both insert it -- each with
-- its own unique ScheduleID (increment_counter already prevents an ID
-- collision, see migration_atomic_counter.sql), so upsert_rows() happily
-- accepts both as distinct rows. Net result: the same class shows twice on
-- a student's calendar. Confirmed live: 91 such duplicate groups (234
-- rows total) found across the real database, ScheduleIDs 2-30 apart --
-- the exact signature of two near-simultaneous requests racing, not a
-- single buggy generation pass.
--
-- Root cause is the same shape as migration_atomic_counter.sql's ID race:
-- an in-memory "does this already exist?" check that two separate
-- serverless invocations can never actually share. Same fix shape: push
-- the check-and-insert into Postgres itself as one atomic operation, so
-- concurrent callers are serialized by the database instead of racing in
-- application memory.
--
-- The unique index is scoped to rows with a real OccuranceID (auto-
-- generated cohort sessions) -- manually-offered Trial/Interview slots
-- (app/api/schedule/route.js POST) always have OccuranceID null by design
-- and can legitimately have several open slots for the same Service on
-- the same date/time, so they're deliberately excluded from this
-- constraint.
CREATE UNIQUE INDEX IF NOT EXISTS scheduleitems_occurrence_date_uniq
  ON public.scheduleitems (((data->>'OccuranceID')), ((data->>'Date')))
  WHERE (data->>'OccuranceID') IS NOT NULL;

-- Same insert shape as upsert_rows(), but conflicts on the business key
-- above (Occurrence+Date) instead of the row's own id, and does nothing on
-- conflict rather than overwriting -- whichever concurrent request's
-- insert lands first in Postgres wins, the other's row for that exact
-- slot is silently dropped instead of creating a duplicate. Returns the
-- ids that were ACTUALLY inserted, so the caller (ensureScheduleGenerated)
-- can tell which of its candidate rows really landed and correct its own
-- in-memory/response state to match reality, rather than assuming
-- everything it tried to insert actually exists now.
CREATE OR REPLACE FUNCTION public.insert_schedule_items_dedup(p_rows jsonb)
RETURNS TABLE(id text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  if jsonb_array_length(p_rows) = 0 then
    return;
  end if;
  return query
    insert into scheduleitems (id, data, updated_at)
    select (r->>'id'), r->'data', now() from jsonb_array_elements(p_rows) as r
    on conflict ((data->>'OccuranceID'), (data->>'Date')) where (data->>'OccuranceID') is not null
    do nothing
    returning scheduleitems.id;
end;
$function$;
