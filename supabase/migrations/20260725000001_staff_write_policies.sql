-- Staff-write RLS policies (Design.md §9 Sprint 3.1).
--
-- Completes the RLS story begun in 20260724000003 (public reads). That
-- migration deliberately left every write path closed; this one opens
-- insert/update/delete on the CONTENT tables to authenticated staff only, and
-- leaves the SUBMISSION tables with no policies at all so that:
--   * anon can neither read nor write them, and
--   * staff writes to them happen exclusively through server actions on the
--     service-role client, which bypasses RLS (§1 architecture rule).
--
-- "Staff" is defined by membership in `profiles` with an admin/editor role.
-- Supabase Auth and the admin UI that populates `profiles` land in Phase 5;
-- until then the table is simply empty, so is_staff() returns false for
-- everyone and no one can write through the anon/authenticated path — which is
-- exactly the posture we want pre-launch. Phase 5 builds on this table rather
-- than replacing it.

-- ---------------------------------------------------------------------------
-- Staff identity.
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- A signed-in staffer may read their own profile row (needed by the admin UI in
-- Phase 5); no anon access. Role changes are service-role only.
create policy "staff read own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

-- SECURITY DEFINER so the policy check can see `profiles` regardless of the
-- caller's own row-visibility, and STABLE so the planner can cache it within a
-- statement. search_path pinned to defeat search_path-hijack on a definer fn.
create or replace function is_staff()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'editor')
  );
$$;

revoke all on function is_staff() from public;
grant execute on function is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Content tables: staff may insert / update / delete. Public reads already
-- exist from 20260724000003 and are left untouched.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  content_tables text[] := array[
    'events', 'news', 'team_members', 'resources', 'impact_stats',
    'reach_countries', 'testimonials', 'partners', 'homepage', 'pages',
    'media'
  ];
begin
  foreach t in array content_tables loop
    execute format(
      'create policy "staff insert %1$s" on %1$I
         for insert to authenticated with check (is_staff());', t);
    execute format(
      'create policy "staff update %1$s" on %1$I
         for update to authenticated using (is_staff()) with check (is_staff());', t);
    execute format(
      'create policy "staff delete %1$s" on %1$I
         for delete to authenticated using (is_staff());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Submission tables (registrations, applications, newsletter_signups,
-- contact_messages, donations, paystack_events): intentionally NO policies.
-- RLS is enabled and denies by default, so anon and authenticated-non-service
-- callers get nothing. All legitimate access is service-role (server actions
-- and admin), which bypasses RLS. This is asserted by the adversarial test
-- suite (tests/rls.test.ts).
-- ---------------------------------------------------------------------------
