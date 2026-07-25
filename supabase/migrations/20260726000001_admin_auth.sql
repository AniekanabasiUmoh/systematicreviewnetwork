-- Admin auth support (Design.md §9 Sprint 5.1).
--
-- `profiles` and is_staff() already exist (20260725000001). This migration
-- adds only what the admin UI needs on top:
--   * an email mirror, so the Users list renders without an auth.admin call
--     per row (auth.users is not reachable over PostgREST at all);
--   * updated_at + trigger, for "role changed" visibility;
--   * is_admin(), the admin-only counterpart to is_staff();
--   * admin_audit, an append-only trail of every admin mutation.
--
-- No new anon surface: every function below is revoked from anon AND
-- authenticated explicitly. `revoke from public` alone is NOT sufficient —
-- Supabase grants EXECUTE to the API roles independently of PUBLIC, and
-- PostgREST exposes any callable public-schema function. That trap already
-- bit this project once (20260725000003).

alter table profiles add column if not exists email text;
alter table profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_email_unique on profiles (lower(email));

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin-only counterpart to is_staff(). Same hardening: SECURITY DEFINER so it
-- can see profiles regardless of the caller's row visibility, STABLE so the
-- planner caches it within a statement, search_path pinned to defeat hijack.
-- ---------------------------------------------------------------------------

create or replace function is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function is_admin() from public;
revoke execute on function is_admin() from anon;
-- authenticated keeps EXECUTE only because the RLS policy below invokes it as
-- that role. It returns a boolean and cannot leak profiles.
grant execute on function is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only audit trail (Design.md §8 "status history visible", §5.4).
-- Written by the service role from lib/admin/audit.ts on every mutation.
-- ---------------------------------------------------------------------------

create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null,
  action text not null,          -- 'create' | 'update' | 'delete' | 'publish' | 'status_change' | ...
  resource text not null,        -- table name, e.g. 'events'
  resource_id text,              -- uuid as text; 'true' for the homepage singleton
  summary text,                  -- human sentence, shown verbatim in the UI
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on admin_audit (created_at desc);
create index if not exists admin_audit_resource_idx on admin_audit (resource, resource_id);

-- RLS on, NO policies: only the service role writes and reads it, exactly like
-- rate_limits and paystack_events. Anon and authenticated get nothing.
alter table admin_audit enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: admins may read every profile (the Users list). Editors keep the
-- existing self-read only. Defence in depth — the admin UI reads via the
-- service role, so this policy is not the gate, it is the backstop.
-- ---------------------------------------------------------------------------

drop policy if exists "admins read all profiles" on profiles;
create policy "admins read all profiles"
  on profiles for select to authenticated
  using (is_admin());
