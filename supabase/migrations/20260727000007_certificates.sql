-- Sprint 6.7 — Certificates.
--
-- A certificate is a claim SRN makes about a person, and its whole value comes
-- from an employer being able to check it. Two things follow from that.
--
-- 1. THE CODE MUST NOT BE GUESSABLE OR ENUMERABLE. A sequential or short code
--    would let anyone walk the range and harvest real names and courses. The
--    code is generated in application code from a CSPRNG (lib/academy/
--    certificates.ts) over an unambiguous alphabet, and the column is simply
--    `text unique` — the database's job is to refuse duplicates, not to invent
--    the secret.
--
-- 2. THE FACTS ARE FROZEN AT ISSUE. Learner name, course title, cohort label
--    and dates are DENORMALISED onto the row. A certificate that silently
--    changed when a course was renamed would be worthless as evidence — and a
--    verification page that showed today's course title against a 2026 award
--    would be actively misleading. Same reasoning as applications.programme
--    (§5.7) and the roster snapshot (§6.4), applied where it matters most.

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),

  -- One per enrolment. Re-taking the course later is a different enrolment and
  -- earns its own certificate.
  enrolment_id uuid not null references enrolments (id) on delete restrict,

  -- The public verification code. Unique, unguessable, never reissued.
  code text not null unique,

  -- Frozen facts. Never rewritten after issue.
  learner_name text not null,
  course_title text not null,
  cohort_label text not null,
  cohort_dates text,
  completed_on date not null,

  -- Revocation is a state, never a delete: an employer who checks a revoked
  -- code must be told it was revoked, not that it never existed. Deleting the
  -- row would turn a withdrawn credential into a forged-looking one.
  revoked_at timestamptz,
  revoked_reason text,
  revoked_by text,

  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists certificates_enrolment_unique
  on certificates (enrolment_id);

-- The verification lookup. Every public check hits this index.
create index if not exists certificates_code_idx on certificates (code);

comment on table certificates is
  'Sprint 6.7. Facts are frozen at issue: renaming a course must not rewrite a credential already awarded. Revocation is a state, never a delete — a revoked code must verify as revoked, not as nonexistent.';

comment on column certificates.code is
  'Public verification code. Generated from a CSPRNG in application code over an unambiguous alphabet; unique and never reissued.';

drop trigger if exists certificates_updated_at on certificates;
create trigger certificates_updated_at before update on certificates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
--
-- No anon policy, deliberately, even though verification is PUBLIC. The
-- verification page is a server route that looks up ONE code supplied by the
-- visitor and returns only what that code names. Granting anon a SELECT policy
-- would expose the table over the REST endpoint, where `?select=*` returns
-- every certificate ever issued — every learner's name, course and date. The
-- public feature is "check this code", not "read the register".

alter table certificates enable row level security;

drop policy if exists "learners read own certificates" on certificates;
create policy "learners read own certificates" on certificates
  for select to authenticated
  using (
    exists (
      select 1 from enrolments e
       where e.id = certificates.enrolment_id
         and e.learner_id = auth.uid()
    )
  );

drop policy if exists "staff read certificates" on certificates;
create policy "staff read certificates" on certificates
  for select to authenticated using (is_staff());

drop policy if exists "staff write certificates" on certificates;
create policy "staff write certificates" on certificates
  for all to authenticated using (is_staff()) with check (is_staff());
