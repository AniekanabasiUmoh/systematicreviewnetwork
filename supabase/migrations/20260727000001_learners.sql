-- Learner accounts (Design.md §9 Sprint 6.1).
--
-- The first end-user accounts on this site. Until now every public interaction
-- was anonymous (§1); Phase 6 decision 5 reverses that. This migration is the
-- security foundation for everything else in Phase 6, so it is deliberately
-- conservative: it creates identity and the trust boundary, and grants almost
-- nothing.
--
-- Three rules encoded here, each of which would be a real vulnerability if left
-- to convention instead of the schema:
--
--   1. A LEARNER IS NEVER STAFF. `learners` and `profiles` both key on
--      auth.users(id), and a trigger on each refuses a row whose id already
--      exists in the other. Without this, one auth user could hold both a
--      learner row and a staff row, and is_staff() would be true for someone
--      who signed up through the public form. The admin's authorization path
--      (lib/admin/auth.ts) reads `profiles`, so a learner already fails it
--      today — this makes that structural rather than incidental.
--
--   2. VERIFIED IS THE TRUST BOUNDARY (decision 5). An unverified learner row
--      is created from an email address ANYONE CAN TYPE into the public event
--      form. It must therefore grant nothing. `is_verified_learner()` — not
--      merely "is signed in" — is what every learner-owned RLS policy checks,
--      and the registration backfill only ever runs on verification.
--
--   3. NO SELF-SERVICE WRITES. Every policy here is SELECT-only. Learners
--      change their own data exclusively through server actions on the service
--      role, exactly as every other write on this site works (§1 architecture
--      rule). That keeps mass-assignment impossible from the browser: a learner
--      cannot UPDATE their own row to set verified_at.

-- ---------------------------------------------------------------------------
-- Learner identity.
-- ---------------------------------------------------------------------------

create table if not exists learners (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  country text,
  institution text,
  -- ORCID is the researcher identifier this audience actually uses. Format is
  -- four groups of four, last character may be X. Checked here so a malformed
  -- value can never be stored, even by a service-role write with a bug.
  orcid text check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  -- THE trust boundary. Null = the address was typed, never proven.
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: the same person must not become two learners by
-- capitalising differently. Matches the (event_id, lower(email)) idiom already
-- used on registrations.
create unique index if not exists learners_email_unique on learners (lower(email));
create index if not exists learners_verified_idx on learners (verified_at)
  where verified_at is not null;

drop trigger if exists learners_updated_at on learners;
create trigger learners_updated_at before update on learners
  for each row execute function set_updated_at();

alter table learners enable row level security;

-- ---------------------------------------------------------------------------
-- Rule 1: learner and staff identities are mutually exclusive, enforced both
-- ways. A trigger rather than a constraint because the check spans two tables.
-- ---------------------------------------------------------------------------

create or replace function reject_staff_as_learner()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from profiles p where p.id = new.id) then
    raise exception 'This account is a staff account and cannot also be a learner.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function reject_learner_as_staff()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from learners l where l.id = new.id) then
    raise exception 'This account is a learner account and cannot also be staff.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists learners_not_staff on learners;
create trigger learners_not_staff before insert or update on learners
  for each row execute function reject_staff_as_learner();

drop trigger if exists profiles_not_learner on profiles;
create trigger profiles_not_learner before insert or update on profiles
  for each row execute function reject_learner_as_staff();

-- ---------------------------------------------------------------------------
-- Rule 2: the verified-learner predicate. Same hardening as is_staff() /
-- is_admin(): SECURITY DEFINER so the policy can see `learners` regardless of
-- the caller's own row visibility, STABLE so the planner caches it within a
-- statement, search_path pinned to defeat a hijack on a definer function.
--
-- Note this returns false for an unverified learner BY DESIGN. Any future
-- policy that wants "signed in at all" must not reach for this function.
-- ---------------------------------------------------------------------------

create or replace function is_verified_learner()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from learners l
    where l.id = auth.uid()
      and l.verified_at is not null
  );
$$;

revoke all on function is_verified_learner() from public;
revoke execute on function is_verified_learner() from anon;
-- authenticated keeps EXECUTE only because the RLS policy below invokes it as
-- that role. It returns a boolean and cannot leak any learner's data.
grant execute on function is_verified_learner() to authenticated;

-- The two mutual-exclusion triggers run as the writer (service role) and are
-- never called directly. Revoke from the API roles regardless: PostgREST
-- exposes any callable public-schema function, and a trigger function invoked
-- directly with a crafted argument is not something to leave reachable.
revoke all on function reject_staff_as_learner() from public, anon, authenticated;
revoke all on function reject_learner_as_staff() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rule 3: SELECT-only, own-row-only. No insert/update/delete policy exists, so
-- the anon and authenticated roles cannot write this table at all — profile
-- edits go through a server action on the service role.
--
-- `id = auth.uid()` is the whole gate. It is not is_verified_learner(), because
-- an unverified learner must still be able to load their own row to be told
-- "check your email" — but that row is theirs alone either way.
-- ---------------------------------------------------------------------------

drop policy if exists "learners read own row" on learners;
create policy "learners read own row"
  on learners for select to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Decision 5: link registrations to learners.
--
-- Nullable, because every registration made before today has no account behind
-- it and must not be orphaned. ON DELETE RESTRICT for the same reason
-- programmes and events use it (§5.7, §5.12): deleting a learner must not
-- silently destroy the record that they attended something.
--
-- `registrations.email` stays as a snapshot and is NEVER rewritten from
-- learners.email — it records what was submitted, exactly as
-- applications.programme does.
-- ---------------------------------------------------------------------------

alter table registrations
  add column if not exists learner_id uuid references learners (id) on delete restrict;

create index if not exists registrations_learner_idx on registrations (learner_id);

-- No RLS policy is added to registrations here. It has none today (submissions
-- are service-role only, 20260725000001) and that stays true: the /account page
-- reads a learner's registrations through a server component on the service
-- role, filtered by the JWT-verified learner id. Opening a direct anon/
-- authenticated read path to a submissions table for the sake of convenience
-- would be a real regression.
