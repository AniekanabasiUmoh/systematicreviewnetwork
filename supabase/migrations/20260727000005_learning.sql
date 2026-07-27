-- Sprint 6.5 — Learning experience.
--
-- Progress, announcements, and live sessions. Three small tables; the care is
-- all in who may read them.

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------
--
-- One row per learner per lesson, written when they mark it complete. Keyed on
-- the ENROLMENT rather than the learner, so the same person taking the course
-- twice (a resit, a later cohort) has two independent progress records — and so
-- deleting an enrolment cannot orphan progress pointing at nothing.
--
-- `completed_at` is the fact. There is no `started_at`: a lesson someone opened
-- and did not finish is indistinguishable from one they never opened, and
-- pretending otherwise would put a progress bar at 40% for someone who has done
-- nothing.

create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references enrolments (id) on delete cascade,
  lesson_id uuid not null references lessons (id) on delete restrict,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Marking twice is idempotent, not an error.
create unique index if not exists lesson_progress_unique
  on lesson_progress (enrolment_id, lesson_id);

create index if not exists lesson_progress_enrolment_idx
  on lesson_progress (enrolment_id);

comment on table lesson_progress is
  'Sprint 6.5. ON DELETE CASCADE from enrolments is deliberate and is the ONLY cascade in the Academy: progress is meaningless without the enrolment it belongs to, unlike a payment record, which must survive for reconciliation.';

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table if not exists cohort_announcements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete restrict,
  title text not null,
  body_rich jsonb,
  -- Null until published, so staff can draft one and send it later.
  published_at timestamptz,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cohort_announcements_feed_idx
  on cohort_announcements (cohort_id, published_at desc);

-- ---------------------------------------------------------------------------
-- Live sessions (decision 2)
-- ---------------------------------------------------------------------------
--
-- `join_url` is the sensitive column in this whole sprint. It is never public,
-- never framed, and never sent to a browser except server-rendered to a learner
-- with an ACTIVE enrolment on this exact cohort. The RLS below cannot express
-- that ("active enrolment on the parent cohort" is a join), so as with the 6.3
-- curriculum there is NO learner-facing policy at all: every learner read goes
-- through the service role after lib/academy/sessions.ts has checked.

create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete restrict,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60
    check (duration_minutes > 0 and duration_minutes <= 1440),
  join_url text,
  -- Published recordings go through the normal 5.8 embed path, so this holds
  -- the same {provider,id,title,url} triple a lesson video does — never raw
  -- HTML, and re-validated on render.
  recording_embed jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_sessions_cohort_idx
  on live_sessions (cohort_id, starts_at);

comment on column live_sessions.join_url is
  'Never public, never framed. Rendered server-side only to a learner with an active enrolment on this cohort, as an external link (the zoom_live posture from 5.8).';

-- Attendance, recorded per learner.
create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_sessions (id) on delete restrict,
  enrolment_id uuid not null references enrolments (id) on delete cascade,
  attended_at timestamptz not null default now()
);

create unique index if not exists session_attendance_unique
  on session_attendance (session_id, enrolment_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists cohort_announcements_updated_at on cohort_announcements;
create trigger cohort_announcements_updated_at before update on cohort_announcements
  for each row execute function set_updated_at();

drop trigger if exists live_sessions_updated_at on live_sessions;
create trigger live_sessions_updated_at before update on live_sessions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Same posture as the 6.3 curriculum tables: no anon policy anywhere, staff
-- through is_staff(), and learner reads go through the service role after an
-- enrolment check in code. A learner MAY read their own progress rows directly,
-- because those are keyed to an enrolment that is already theirs.

alter table lesson_progress enable row level security;
alter table cohort_announcements enable row level security;
alter table live_sessions enable row level security;
alter table session_attendance enable row level security;

drop policy if exists "learners read own progress" on lesson_progress;
create policy "learners read own progress" on lesson_progress
  for select to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = lesson_progress.enrolment_id
         and e.learner_id = auth.uid()
    )
  );

do $$
declare t text;
begin
  foreach t in array array[
    'lesson_progress','cohort_announcements','live_sessions','session_attendance'
  ] loop
    execute format('drop policy if exists "staff read %1$s" on %1$s', t);
    execute format(
      'create policy "staff read %1$s" on %1$s for select to authenticated using (is_staff())', t);
    execute format('drop policy if exists "staff write %1$s" on %1$s', t);
    execute format(
      'create policy "staff write %1$s" on %1$s for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;
