-- Sprint 6.8 — instructors, scoped to their own cohorts.
--
-- THE DECISION THAT SHAPES THIS FILE: `instructor` is NOT added to is_staff().
--
-- is_staff() gates roughly forty write policies across the whole Academy —
-- courses, cohorts, curriculum, assessments, certificates, media, programmes.
-- Adding a third role to it would take one line and would silently grant every
-- instructor write access to all of it, which is the exact opposite of §6.8's
-- "they see their learners, mark their assignments, and nothing else".
--
-- So instructors get their own predicate, is_instructor_for(cohort), which
-- answers a narrower question: is this person assigned to THIS cohort. The two
-- functions never merge. An instructor is not a weaker staff member; they are a
-- different kind of user who happens to sign in through the same door.

-- ---------------------------------------------------------------------------
-- The role
-- ---------------------------------------------------------------------------

-- profiles.role was `check (role in ('admin','editor'))`. Widen it rather than
-- convert to an enum: the check constraint is already the pattern here, and an
-- enum migration would rewrite a table that holds live sign-in data.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'editor', 'instructor'));

comment on column profiles.role is
  'admin: everything. editor: content, no user management. instructor (6.8): assigned cohorts only — NOT covered by is_staff(), see is_instructor_for().';

-- ---------------------------------------------------------------------------
-- Assignment
-- ---------------------------------------------------------------------------

create table if not exists cohort_instructors (
  id uuid primary key default gen_random_uuid(),

  -- restrict, not cascade: removing a person from the system must not silently
  -- unassign them from a running cohort. Unassign first, deliberately.
  instructor_id uuid not null references profiles (id) on delete restrict,
  cohort_id uuid not null references cohorts (id) on delete restrict,

  assigned_at timestamptz not null default now(),
  assigned_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists cohort_instructors_unique
  on cohort_instructors (instructor_id, cohort_id);

create index if not exists cohort_instructors_cohort_idx
  on cohort_instructors (cohort_id);

comment on table cohort_instructors is
  'Sprint 6.8. Which instructor teaches which cohort. The ONLY thing that widens an instructor beyond read-nothing.';

-- ---------------------------------------------------------------------------
-- The narrow predicate
-- ---------------------------------------------------------------------------

/* Is the caller an instructor assigned to this cohort?
 *
 * SECURITY DEFINER with a pinned search_path, matching is_staff(). Takes the
 * cohort as an argument rather than answering "is this person an instructor
 * anywhere", because the anywhere-question is the one that leaks: an instructor
 * on cohort A must be exactly as powerless on cohort B as a stranger. */
create or replace function is_instructor_for(p_cohort_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from cohort_instructors ci
      join profiles p on p.id = ci.instructor_id
     where ci.instructor_id = auth.uid()
       and ci.cohort_id = p_cohort_id
       and p.role = 'instructor'
  );
$$;

revoke all on function is_instructor_for(uuid) from public;
grant execute on function is_instructor_for(uuid) to authenticated;

comment on function is_instructor_for(uuid) is
  'Sprint 6.8. Deliberately NOT folded into is_staff(): that function gates ~40 write policies across the Academy, and an instructor must reach none of them. Scoped per-cohort because an instructor on cohort A must be as powerless on cohort B as a stranger.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table cohort_instructors enable row level security;

-- Staff manage assignments. Instructors may see their OWN, so the admin UI can
-- show them what they teach, but cannot assign themselves anything.
drop policy if exists "staff manage cohort instructors" on cohort_instructors;
create policy "staff manage cohort instructors" on cohort_instructors
  for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "instructors read own assignments" on cohort_instructors;
create policy "instructors read own assignments" on cohort_instructors
  for select to authenticated
  using (instructor_id = auth.uid());

/* Instructors may read submissions on their own cohorts, and update them to
   record a mark. Both are scoped through the enrolment to the cohort, so the
   grant cannot spill onto another cohort's work.

   No INSERT and no DELETE: a marker records a judgement on work a learner
   submitted. Creating or destroying submissions is not marking. */
drop policy if exists "instructors read own cohort submissions" on submissions;
create policy "instructors read own cohort submissions" on submissions
  for select to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = submissions.enrolment_id
         and is_instructor_for(e.cohort_id)
    )
  );

drop policy if exists "instructors mark own cohort submissions" on submissions;
create policy "instructors mark own cohort submissions" on submissions
  for update to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = submissions.enrolment_id
         and is_instructor_for(e.cohort_id)
    )
  )
  with check (
    exists (
      select 1 from enrolments e
       where e.id = submissions.enrolment_id
         and is_instructor_for(e.cohort_id)
    )
  );

/* Their roster, read-only. An instructor needs to know who is in the room. */
drop policy if exists "instructors read own cohort enrolments" on enrolments;
create policy "instructors read own cohort enrolments" on enrolments
  for select to authenticated
  using (is_instructor_for(cohort_id));

/* Progress on their cohorts, so "who is falling behind" is answerable. */
drop policy if exists "instructors read own cohort progress" on lesson_progress;
create policy "instructors read own cohort progress" on lesson_progress
  for select to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = lesson_progress.enrolment_id
         and is_instructor_for(e.cohort_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------

/* Cohort reporting (§6.8): enrolment, completion rate, average score, and the
 * dropout point. These are the numbers that feed SRN's funder applications.
 *
 * A function rather than a view so it can be called per cohort without the
 * planner materialising every cohort's figures, and so the seat-holding rule
 * stays in ONE place: `payment_status in ('paid','not_required')` and not
 * cancelled, exactly as getCohortSeatCounts and holdsSeat already have it.
 *
 * SECURITY INVOKER (the default), deliberately: the caller's own RLS decides
 * which enrolments they can see, so an instructor calling this gets their
 * cohort and nothing else without a second permission check here. */
create or replace function cohort_report(p_cohort_id uuid)
  returns table (
    enrolled integer,
    completed integer,
    completion_rate numeric,
    average_score numeric,
    certificates_issued integer,
    dropout_lesson_id uuid
  )
  language sql
  stable
  set search_path = public, pg_temp
as $$
  with seats as (
    select e.id, e.state
      from enrolments e
     where e.cohort_id = p_cohort_id
       and e.cancelled_at is null
       and e.payment_status in ('paid', 'not_required')
  ),
  -- The lesson most learners stop at: the highest sort_order any given learner
  -- reached, then the mode across learners. A single number that answers "where
  -- does the course lose people".
  furthest as (
    select lp.enrolment_id, l.id as lesson_id,
           row_number() over (
             partition by lp.enrolment_id order by m.sort_order desc, l.sort_order desc
           ) as rn
      from lesson_progress lp
      join seats s on s.id = lp.enrolment_id
      join lessons l on l.id = lp.lesson_id
      join modules m on m.id = l.module_id
  )
  select
    (select count(*) from seats)::integer,
    (select count(*) from seats where state = 'completed')::integer,
    case when (select count(*) from seats) = 0 then 0
         else round(
           (select count(*) from seats where state = 'completed')::numeric
           / (select count(*) from seats) * 100, 1)
    end,
    coalesce((
      select round(avg(sub.score)::numeric, 1)
        from submissions sub
        join seats s2 on s2.id = sub.enrolment_id
       where sub.score is not null
    ), 0),
    (select count(*)::integer
       from certificates c
       join seats s3 on s3.id = c.enrolment_id
      where c.revoked_at is null),
    (select lesson_id from furthest where rn = 1
      group by lesson_id order by count(*) desc limit 1);
$$;

revoke all on function cohort_report(uuid) from public;
grant execute on function cohort_report(uuid) to authenticated;
