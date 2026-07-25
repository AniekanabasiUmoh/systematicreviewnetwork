-- Sprint 5.7 — programmes become managed content.
--
-- Programmes lived in lib/programmes.ts as a hard-coded array, so launching a
-- new Academy was a code change and a deploy. This makes a programme a row.
--
-- Three deliberate design decisions encoded here:
--   1. icon_name is a TEXT NAME, not a component. Code maps it through a fixed
--      allowlist (lib/admin/programme-icons.ts) with a safe fallback, so an
--      unrecognised value can never crash the public hub.
--   2. applications.programme_id is NULLABLE and ON DELETE RESTRICT. Nullable
--      because every historic application predates this table; RESTRICT so a
--      programme with applications cannot be hard-deleted (retire it instead).
--   3. applications.programme (text) is KEPT as a historic snapshot. Renaming
--      a programme must not silently relabel applications made under the old
--      name.

create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text,
  audience text,
  format text,
  duration text,
  intro text,
  -- jsonb string arrays; edited as one-per-line textareas in admin.
  covers jsonb not null default '[]'::jsonb,
  for_who jsonb not null default '[]'::jsonb,
  cta_kind text not null default 'apply' check (cta_kind in ('apply', 'interest', 'partner')),
  cta_label text,
  icon_name text not null default 'GraduationCap',
  feature_image_url text,
  body_rich jsonb,
  sort_order integer not null default 0,
  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists programmes_status_sort_idx on programmes (status, sort_order);

create trigger programmes_updated_at before update on programmes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Relationships
-- ---------------------------------------------------------------------------

alter table applications
  add column if not exists programme_id uuid references programmes (id) on delete restrict;

-- An event may belong to a programme; deleting the programme just unlinks it.
alter table events
  add column if not exists programme_id uuid references programmes (id) on delete set null;

create index if not exists applications_programme_id_idx on applications (programme_id);
create index if not exists events_programme_id_idx on events (programme_id);

-- ---------------------------------------------------------------------------
-- RLS — public reads published, non-archived rows; staff write via is_staff().
-- Matches the posture established in 20260724000003 / 20260725000001.
-- ---------------------------------------------------------------------------

alter table programmes enable row level security;

create policy "public reads published programmes"
  on programmes for select to anon, authenticated
  using (status = 'published' and archived_at is null);

create policy "staff insert programmes"
  on programmes for insert to authenticated with check (is_staff());

create policy "staff update programmes"
  on programmes for update to authenticated
  using (is_staff()) with check (is_staff());

create policy "staff delete programmes"
  on programmes for delete to authenticated using (is_staff());
