-- Sprint 6.6 — Assessment.
--
-- Quizzes (auto-marked) and assignments (marked by a person), a grading queue,
-- feedback, pass thresholds and resubmission.
--
-- The decision that shapes this whole migration: WHERE THE ANSWER KEY LIVES.
-- Quiz options and their correctness are in a separate table from the
-- questions, so a query that fetches questions for a learner cannot
-- accidentally include which option is right. There is no column on `questions`
-- that says "the answer is B" — getting the key requires deliberately selecting
-- from `quiz_options`, which only the marking path does. A single jsonb blob
-- holding both would put the key one careless `select *` away from the browser.

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------

do $$ begin
  create type assessment_kind as enum ('quiz','assignment');
exception when duplicate_object then null;
end $$;

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),

  -- Attached to a module, so an assessment inherits that module's drip release
  -- and its cohort/course scoping. A quiz inside a locked module is not
  -- available, and that falls out of the 6.3 gate rather than needing its own.
  module_id uuid not null references modules (id) on delete restrict,

  kind assessment_kind not null,
  title text not null,
  instructions_rich jsonb,

  -- Percentage a learner must reach to pass. Applies to both kinds: a quiz
  -- computes it, an assignment's marker awards it.
  pass_mark integer not null default 50
    check (pass_mark >= 0 and pass_mark <= 100),

  -- Null means unlimited. 1 means one shot. Enforced in code AND counted here
  -- so the UI can say "you have one attempt left" rather than only refusing.
  max_attempts integer check (max_attempts is null or max_attempts > 0),

  -- DEADLINES APPLY ONLY TO COHORT-PACED COHORTS (decision 1). This column is
  -- simply ignored for a self-paced cohort — no deadline is shown and nothing
  -- is ever marked late. That rule lives in lib/academy/assessment.ts, because
  -- a check constraint here cannot see the cohort through a course-scoped
  -- module, which has no cohort at all.
  due_at timestamptz,

  -- Assignment submissions: text, a file, or either.
  submission_type text not null default 'text'
    check (submission_type in ('text','file','either')),

  status content_status not null default 'draft',
  archived_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_module_idx
  on assessments (module_id, sort_order);

comment on column assessments.due_at is
  'Ignored entirely for a self-paced cohort (Phase 6 decision 1): no deadline shown, nothing ever late.';

-- ---------------------------------------------------------------------------
-- Quiz questions and options
-- ---------------------------------------------------------------------------

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete restrict,
  prompt text not null,
  -- Shown after marking, so a learner learns something from a wrong answer.
  explanation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quiz_questions_assessment_idx
  on quiz_questions (assessment_id, sort_order);

-- The answer key. Deliberately its own table; see the note at the top.
create table if not exists quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions (id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quiz_options_question_idx
  on quiz_options (question_id, sort_order);

comment on table quiz_options is
  'Holds is_correct — the answer key. Separate from quiz_questions on purpose: a learner-facing query selects questions and never touches this table, so the key cannot leak through a careless select *.';

-- ---------------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------------

do $$ begin
  create type submission_state as enum ('submitted','marked','returned');
exception when duplicate_object then null;
end $$;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete restrict,

  -- Keyed on the enrolment, like lesson_progress: the same person taking the
  -- course twice has two independent attempt histories.
  enrolment_id uuid not null references enrolments (id) on delete cascade,

  -- 1, 2, 3… Unique per enrolment per assessment, so a resubmission is a new
  -- row and the earlier attempt is never overwritten. A marker's feedback on
  -- attempt 1 must survive attempt 2.
  attempt integer not null default 1,

  state submission_state not null default 'submitted',

  -- Assignment payloads.
  body_text text,
  storage_path text,
  file_name text,

  -- Quiz payload: {question_id: option_id}. Recorded as given, so a later edit
  -- to the quiz cannot rewrite what someone actually answered.
  answers jsonb,

  -- Marking.
  score integer check (score is null or (score >= 0 and score <= 100)),
  passed boolean,
  feedback text,
  marked_by text,
  marked_at timestamptz,

  -- Set at submission time by comparing against due_at, and only ever for a
  -- cohort-paced cohort. Stored rather than derived so that changing a deadline
  -- afterwards cannot retroactively make someone late.
  is_late boolean not null default false,

  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists submissions_attempt_unique
  on submissions (enrolment_id, assessment_id, attempt);

create index if not exists submissions_queue_idx
  on submissions (state, submitted_at);

create index if not exists submissions_assessment_idx
  on submissions (assessment_id, submitted_at desc);

comment on column submissions.is_late is
  'Stamped at submission time, never derived later: moving a deadline must not retroactively mark someone late. Always false for a self-paced cohort (decision 1).';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['assessments','quiz_questions','submissions'] loop
    execute format('drop trigger if exists %1$s_updated_at on %1$s', t);
    execute format(
      'create trigger %1$s_updated_at before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- Same posture as the rest of the Academy's private side: no anon policy on any
-- of these tables. Learner reads go through the service role after an enrolment
-- check in code.
--
-- A learner MAY read their own submissions — those rows are theirs, and the
-- policy is keyed through the enrolment. They may NOT read quiz_options by any
-- route: there is no learner policy on it at all, so even a signed-in learner
-- hitting the REST endpoint directly gets nothing.

alter table assessments enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options enable row level security;
alter table submissions enable row level security;

drop policy if exists "learners read own submissions" on submissions;
create policy "learners read own submissions" on submissions
  for select to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = submissions.enrolment_id
         and e.learner_id = auth.uid()
    )
  );

do $$
declare t text;
begin
  foreach t in array array[
    'assessments','quiz_questions','quiz_options','submissions'
  ] loop
    execute format('drop policy if exists "staff read %1$s" on %1$s', t);
    execute format(
      'create policy "staff read %1$s" on %1$s for select to authenticated using (is_staff())', t);
    execute format('drop policy if exists "staff write %1$s" on %1$s', t);
    execute format(
      'create policy "staff write %1$s" on %1$s for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;
