-- Sprint 5.6 — Operations workspace: cascade fix + application notes RPC.
--
-- Three independent changes:
--   1. registrations.event_id was ON DELETE CASCADE — deleting an event
--      silently destroyed every registration against it. RESTRICT makes that
--      an error instead, so staff are forced through the archive flow
--      (Sprint 5.12) rather than losing attendee data by accident.
--   2. append_application_note(): atomic jsonb array append so two reviewers
--      noting the same application concurrently cannot lose one write to a
--      read-modify-write race.
--   3. Indexes supporting the operations screens' default sort and the
--      applications status filter.

-- ---------------------------------------------------------------------------
-- 1. Cascade fix
-- ---------------------------------------------------------------------------

alter table registrations
  drop constraint registrations_event_id_fkey;

alter table registrations
  add constraint registrations_event_id_fkey
  foreign key (event_id) references events (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 2. append_application_note — SECURITY DEFINER, revoked from anon/authenticated.
-- Callable only by the service role (server actions), same posture as every
-- other definer function here (Design.md §1: `revoke from public` alone is
-- not enough on Supabase — PostgREST exposes any callable public function to
-- anon/authenticated independently of PUBLIC grants; 20260725000003 already
-- had to correct this once).
-- ---------------------------------------------------------------------------

create or replace function append_application_note(p_id uuid, p_note jsonb)
  returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  update applications
     set internal_notes = internal_notes || jsonb_build_array(p_note)
   where id = p_id;
$$;

revoke all on function append_application_note(uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Indexes for the operations screens
-- ---------------------------------------------------------------------------

create index if not exists registrations_created_at_idx on registrations (created_at desc);
create index if not exists applications_created_at_idx on applications (created_at desc);
create index if not exists applications_status_created_idx on applications (status, created_at desc);
create index if not exists newsletter_signups_created_at_idx on newsletter_signups (created_at desc);
create index if not exists contact_messages_created_at_idx on contact_messages (created_at desc);
create index if not exists donations_created_at_idx on donations (created_at desc);
