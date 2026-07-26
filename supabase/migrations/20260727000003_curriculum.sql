-- Sprint 6.3 — Curriculum & materials.
--
-- Three tables plus the first row of 6.4's `enrolments`.
--
-- Why `enrolments` is created here rather than in 6.4: §6.3's access rule is
-- "is there an enrolment", and its done-when is "an unenrolled visitor cannot
-- reach any of it". Neither can be built, let alone tested honestly, against a
-- table that does not exist. An always-deny stub would make the done-when
-- trivially true while proving nothing — the same trap 6.1 hit, where an empty
-- table returns zero rows whether the policy works or not. So the table is
-- created minimally here: identity, cohort, state, timestamps. 6.4 ALTERs it to
-- add payment, waitlist position and the roster; it does not create it.

-- ---------------------------------------------------------------------------
-- Enrolments (minimal — 6.4 extends)
-- ---------------------------------------------------------------------------

do $$ begin
  create type enrolment_state as enum ('pending','active','completed','withdrawn');
exception
  when duplicate_object then null;
end $$;

create table if not exists enrolments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners (id) on delete restrict,
  cohort_id uuid not null references cohorts (id) on delete restrict,

  -- `pending` holds no seat and unlocks no lesson (§6.4 done-when). Only
  -- `active` and `completed` grant access; see access_grants below.
  state enrolment_state not null default 'pending',

  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One enrolment per learner per cohort. Re-enrolling after withdrawing
-- reactivates the existing row rather than creating a second.
create unique index if not exists enrolments_learner_cohort_unique
  on enrolments (learner_id, cohort_id);

create index if not exists enrolments_cohort_state_idx
  on enrolments (cohort_id, state);

comment on table enrolments is
  'Sprint 6.3 (minimal) / 6.4 (payment, waitlist, roster). Access to curriculum is granted by an active or completed row here, and survives the cohort ending (Phase 6 decision 3).';

-- ---------------------------------------------------------------------------
-- Modules
-- ---------------------------------------------------------------------------

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),

  -- Cohort-scoped OR course-scoped, exactly one of the two. A course-scoped
  -- module is the shared syllabus every cohort inherits — SRN runs the same
  -- course every term and must not retype it (§6.2). A cohort-scoped module is
  -- an addition specific to one run.
  course_id uuid references courses (id) on delete restrict,
  cohort_id uuid references cohorts (id) on delete restrict,

  title text not null,
  summary text,
  sort_order integer not null default 0,

  -- Drip release. `immediate` = open from enrolment. `on_date` uses
  -- release_on. `after_previous` unlocks when the preceding module is complete.
  --
  -- IGNORED ENTIRELY for a self-paced cohort (Phase 6 decision 1). That rule is
  -- enforced in lib/academy/curriculum.ts, not here: a check constraint cannot
  -- see the cohort's pacing through a course-scoped module, which has no cohort.
  release_rule text not null default 'immediate'
    check (release_rule in ('immediate','on_date','after_previous')),
  release_on timestamptz,

  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint modules_one_parent check (
    (course_id is not null and cohort_id is null)
    or (course_id is null and cohort_id is not null)
  ),

  -- A date rule with no date would silently behave as `immediate`, publishing
  -- material early. Refuse it at the database.
  constraint modules_release_on_required check (
    release_rule <> 'on_date' or release_on is not null
  )
);

create index if not exists modules_course_sort_idx
  on modules (course_id, sort_order) where course_id is not null;
create index if not exists modules_cohort_sort_idx
  on modules (cohort_id, sort_order) where cohort_id is not null;

-- ---------------------------------------------------------------------------
-- Lessons
-- ---------------------------------------------------------------------------

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete restrict,

  title text not null,
  summary text,
  body_rich jsonb,

  -- The safe-embed triple from 5.8 ({provider, id, title, url}), never raw
  -- HTML. Re-validated on render by validateStoredEmbed(), so a row edited
  -- directly in the database still cannot inject an iframe.
  video_embed jsonb,

  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  sort_order integer not null default 0,

  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_module_sort_idx on lessons (module_id, sort_order);

-- ---------------------------------------------------------------------------
-- Materials — private files
-- ---------------------------------------------------------------------------

create table if not exists lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete restrict,

  -- A path in the PRIVATE `course-materials` bucket, not a URL. There is no
  -- public URL for these objects by construction: a signed URL is minted per
  -- request, per learner, after the enrolment check. Storing a path rather than
  -- a link is what makes that impossible to bypass by accident.
  storage_path text not null,

  file_name text not null,
  mime_type text,
  size_bytes bigint,
  title text not null,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_materials_lesson_sort_idx
  on lesson_materials (lesson_id, sort_order);

comment on column lesson_materials.storage_path is
  'Path in the private course-materials bucket. Never rendered directly; signed on demand for a learner with an enrolment (Phase 6 decision 3 — access outlives the cohort).';

-- ---------------------------------------------------------------------------
-- updated_at triggers (set_updated_at() exists from earlier migrations)
-- ---------------------------------------------------------------------------

drop trigger if exists enrolments_updated_at on enrolments;
create trigger enrolments_updated_at before update on enrolments
  for each row execute function set_updated_at();

drop trigger if exists modules_updated_at on modules;
create trigger modules_updated_at before update on modules
  for each row execute function set_updated_at();

drop trigger if exists lessons_updated_at on lessons;
create trigger lessons_updated_at before update on lessons
  for each row execute function set_updated_at();

drop trigger if exists lesson_materials_updated_at on lesson_materials;
create trigger lesson_materials_updated_at before update on lesson_materials
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- The posture here is DELIBERATELY different from courses/cohorts.
--
-- The catalogue is public: anon reads published rows. Curriculum is not. There
-- is NO anon policy on any of these four tables, so the public key gets
-- nothing, ever — not even a lesson title. Everything a learner sees is read
-- server-side on the service role AFTER lib/academy/curriculum.ts has checked
-- the enrolment.
--
-- Staff read and write through is_staff() as everywhere else.

alter table enrolments enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table lesson_materials enable row level security;

-- A learner may read their OWN enrolments (the "my courses" list). This is the
-- only learner-facing policy in the sprint, and it is scoped by auth.uid() the
-- same way the learners table is.
drop policy if exists "learners read own enrolments" on enrolments;
create policy "learners read own enrolments" on enrolments
  for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists "staff read enrolments" on enrolments;
create policy "staff read enrolments" on enrolments
  for select to authenticated using (is_staff());

drop policy if exists "staff write enrolments" on enrolments;
create policy "staff write enrolments" on enrolments
  for all to authenticated using (is_staff()) with check (is_staff());

do $$
declare t text;
begin
  foreach t in array array['modules','lessons','lesson_materials'] loop
    execute format('drop policy if exists "staff read %1$s" on %1$s', t);
    execute format(
      'create policy "staff read %1$s" on %1$s for select to authenticated using (is_staff())', t);
    execute format('drop policy if exists "staff write %1$s" on %1$s', t);
    execute format(
      'create policy "staff write %1$s" on %1$s for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------
--
-- `media` and `resources` are public buckets. This one is not, and that is the
-- point: a paid course's slides must not sit behind a guessable public link.
-- No storage.objects policy is created for it at all, so ONLY the service role
-- can read or write, and the only way a learner obtains bytes is a signed URL
-- minted by the server after the enrolment check.

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', false, 52428800)
on conflict (id) do update set public = false;
