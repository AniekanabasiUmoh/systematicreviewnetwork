-- Sprint 5.12 — data safety: archiving and delete affordances.
--
-- The registrations.event_id cascade fix already landed in 20260726000002
-- (pulled forward because the exposure was live). This migration is the rest:
-- archiving as the safe alternative to deletion, and the RLS policy update
-- that actually hides archived events from the public.

alter table events
  add column if not exists archived_at timestamptz;

create index if not exists events_archived_at_idx on events (archived_at);

-- ---------------------------------------------------------------------------
-- REPLACE, not add, the public-read policy. Postgres ORs multiple permissive
-- SELECT policies together, so adding a second, stricter policy alongside the
-- existing "public reads published events" would restrict nothing — the
-- original policy already grants access and the OR still passes. The only
-- way to add the archived_at condition is to replace the policy that grants
-- access in the first place.
-- ---------------------------------------------------------------------------

drop policy if exists "public reads published events" on events;

create policy "public reads published events"
  on events for select to anon, authenticated
  using (status = 'published' and archived_at is null);
