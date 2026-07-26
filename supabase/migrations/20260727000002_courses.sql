-- Sprint 6.2 — Courses & cohorts. The Academy catalogue layer.
--
-- A course is the teaching (syllabus, outcomes, level). A cohort is one RUN of
-- that course (dates, price, capacity). SRN runs the same course every term, so
-- separating the two is what lets last term's cohort stay as history while a
-- new one opens, without retyping the syllabus.
--
-- Decisions from Design.md "Decisions settled 2026-07-26" encoded here:
--
--   1. `cohorts.pacing` is a property of the COHORT, not the platform. Drip
--      release (6.3), live sessions (6.5) and deadlines (6.6) each check this
--      first and are inert in a self-paced cohort. It lives here, in 6.2, so
--      those sprints have a column to read rather than a flag to invent.
--
--   4. There is no separate free-course concept. `price_kobo = 0` IS the free
--      tier, so 6.4 has one enrolment code path that branches on price rather
--      than two code paths that can drift apart.
--
--   3. Access is granted by ENROLMENT, not by cohort dates. Nothing here
--      expires; a finished cohort keeps its enrolments and its materials. That
--      is why cohorts get `archived_at` and an ON DELETE RESTRICT posture
--      rather than any notion of deletion-on-completion.
--
-- Two shapes copied deliberately from 20260726000003_programmes.sql: the
-- `content_status` enum (one status vocabulary across all content) and the
-- public-read / is_staff()-write RLS posture from 20260724000003.

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT, not CASCADE: deleting a programme must never silently destroy the
  -- courses taught under it. Nullable so a course can exist before it is filed
  -- under a programme.
  programme_id uuid references programmes (id) on delete restrict,
  slug text not null unique,
  title text not null,
  summary text,
  body_rich jsonb,
  level text not null default 'introductory'
    check (level in ('introductory', 'intermediate', 'advanced')),
  delivery text not null default 'online'
    check (delivery in ('online', 'in_person', 'blended')),
  duration_label text,
  -- jsonb string arrays, edited as one-per-line textareas (the 5.7 idiom).
  learning_outcomes jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  featured_image_url text,
  sort_order integer not null default 0,
  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_status_sort_idx on courses (status, sort_order);
create index if not exists courses_programme_id_idx on courses (programme_id);

create trigger courses_updated_at before update on courses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- cohorts
-- ---------------------------------------------------------------------------

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT for the same reason as above: a course with runs against it is
  -- archived, never deleted. 6.4 will hang enrolments off cohorts with the same
  -- posture, so the chain course -> cohort -> enrolment is unbreakable by
  -- accident at every link.
  course_id uuid not null references courses (id) on delete restrict,
  label text not null,
  slug text not null,
  starts_on date,
  ends_on date,
  enrolment_opens timestamptz,
  enrolment_closes timestamptz,
  enrolment_closed_manually boolean not null default false,
  capacity integer check (capacity is null or capacity > 0),
  -- Minor units (kobo), matching events.price_kobo. 0 is free (decision 4).
  price_kobo integer not null default 0 check (price_kobo >= 0),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  -- Decision 1. Gates date-driven behaviour in 6.3, 6.5 and 6.6.
  pacing text not null default 'cohort_paced'
    check (pacing in ('self_paced', 'cohort_paced')),
  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A cohort slug is unique WITHIN its course, not globally: every course may
-- have a "2026-spring" run, and forcing globally-unique labels would push
-- course names into cohort slugs. The public URL is /academy/<course>/<cohort>,
-- so this is exactly the uniqueness the route needs.
create unique index if not exists cohorts_course_slug_unique
  on cohorts (course_id, slug);

create index if not exists cohorts_course_id_idx on cohorts (course_id);
create index if not exists cohorts_status_starts_idx on cohorts (status, starts_on);

create trigger cohorts_updated_at before update on cohorts
  for each row execute function set_updated_at();

-- A cohort that ends before it starts is a data-entry slip that would silently
-- produce a nonsense public listing. Both are nullable (a self-paced cohort may
-- have neither), so the check only fires when both are present.
alter table cohorts drop constraint if exists cohorts_dates_ordered;
alter table cohorts add constraint cohorts_dates_ordered
  check (ends_on is null or starts_on is null or ends_on >= starts_on);

alter table cohorts drop constraint if exists cohorts_enrolment_window_ordered;
alter table cohorts add constraint cohorts_enrolment_window_ordered
  check (
    enrolment_closes is null or enrolment_opens is null
    or enrolment_closes >= enrolment_opens
  );

-- ---------------------------------------------------------------------------
-- RLS
--
-- Public reads published, non-archived rows only. Note that a published cohort
-- under a DRAFT course is still readable here — RLS cannot express a join
-- condition cheaply, and the public queries always start from the course, so an
-- unpublished course is never a route anyone can reach. The catalogue queries
-- in lib/academy/courses.ts enforce the parent's status; this policy is the
-- floor beneath them, not the whole gate.
-- ---------------------------------------------------------------------------

alter table courses enable row level security;
alter table cohorts enable row level security;

create policy "public reads published courses"
  on courses for select to anon, authenticated
  using (status = 'published' and archived_at is null);

create policy "staff insert courses"
  on courses for insert to authenticated with check (is_staff());
create policy "staff update courses"
  on courses for update to authenticated
  using (is_staff()) with check (is_staff());
create policy "staff delete courses"
  on courses for delete to authenticated using (is_staff());

create policy "public reads published cohorts"
  on cohorts for select to anon, authenticated
  using (status = 'published' and archived_at is null);

create policy "staff insert cohorts"
  on cohorts for insert to authenticated with check (is_staff());
create policy "staff update cohorts"
  on cohorts for update to authenticated
  using (is_staff()) with check (is_staff());
create policy "staff delete cohorts"
  on cohorts for delete to authenticated using (is_staff());
