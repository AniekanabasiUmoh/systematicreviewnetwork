-- Phase 7 — member area.
--
-- Three sprints share one migration because they share one idea: things a
-- person already gave SRN should be visible and manageable by that person,
-- rather than only by staff.
--
--   7.1  applications get an owner and supporting documents
--   7.2  events get staff-defined questions; registrations store the answers
--   7.3  event attendance earns a certificate, reusing 6.7's register
--
-- ---------------------------------------------------------------------------
-- 7.1 — applications belong to somebody
-- ---------------------------------------------------------------------------
--
-- `applications` has carried an email since Phase 4 and nothing else: there was
-- no account system when it was built. Adding learner_id lets an applicant see
-- their own status without staff intervention.
--
-- NULLABLE and ON DELETE SET NULL, deliberately. Applications arrive from
-- people with no account and must keep doing so — §4's public form is not
-- behind a login and should not become so. The column is a convenience for
-- people who DO have an account, never a requirement.

alter table applications
  add column if not exists learner_id uuid references learners (id) on delete set null;

create index if not exists applications_learner_idx
  on applications (learner_id) where learner_id is not null;

comment on column applications.learner_id is
  'Sprint 7.1. Nullable by design: the public application form has no login and must keep working for people without accounts. Set when a signed-in learner applies, or matched later by email.';

/* Supporting documents — a CV, a protocol draft.
 *
 * PRIVATE bucket, reusing the 6.3 pattern rather than inventing a second one.
 * A CV carries a home address and a phone number as often as not; it has no
 * business in the public media bucket, and there is no public URL for these
 * objects by construction. */
create table if not exists application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete restrict,

  -- A path in the private `application-documents` bucket, never a URL.
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,

  -- What the applicant says it is, so a reviewer knows before opening it.
  kind text not null default 'other'
    check (kind in ('cv', 'protocol', 'reference', 'other')),

  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists application_documents_application_idx
  on application_documents (application_id);

comment on table application_documents is
  'Sprint 7.1. Private bucket + signed URLs, the same posture as lesson_materials (6.3). A CV is personal data, not content.';

-- ---------------------------------------------------------------------------
-- 7.2 — per-event questions
-- ---------------------------------------------------------------------------
--
-- Four field types and no more. §7.2 names the scope trap explicitly: "a
-- general form builder is a product in itself". The check constraint is the
-- thing that stops it becoming one.

create table if not exists event_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete restrict,

  -- The question as the registrant reads it.
  label text not null,
  help_text text,

  field_type text not null default 'short_text'
    check (field_type in ('short_text', 'long_text', 'select', 'checkbox')),

  -- Options for `select`, one per element. Ignored for the other three types.
  options jsonb not null default '[]'::jsonb,

  required boolean not null default false,
  sort_order integer not null default 0,

  -- Archived rather than deleted: a question removed after people have answered
  -- it must not orphan their answers or break the export.
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A select with no options is a dead end for the person filling it in.
  constraint event_questions_select_needs_options check (
    field_type <> 'select' or jsonb_array_length(options) > 0
  )
);

create index if not exists event_questions_event_idx
  on event_questions (event_id, sort_order);

comment on table event_questions is
  'Sprint 7.2. Four field types by constraint, not by convention — §7.2 names the general-form-builder scope trap and this is what holds the line.';

/* Answers live as jsonb on the registration, keyed by question id, so adding a
   question never needs a migration. §7.2 is explicit about this. */
alter table registrations
  add column if not exists answers jsonb not null default '{}'::jsonb;

comment on column registrations.answers is
  'Sprint 7.2. {question_id: answer}. jsonb rather than columns so a new question needs no schema change; lib/admin/submissions.ts flattens it for CSV export.';

-- ---------------------------------------------------------------------------
-- 7.3 — attendance certificates
-- ---------------------------------------------------------------------------
--
-- §7.3: "build that first and extend it to events, rather than a second
-- certificate system". So `certificates` gains an optional registration link
-- and its enrolment link becomes optional — one register, one verification
-- page, one revocation flow, two kinds of thing being certified.

alter table certificates
  add column if not exists registration_id uuid
    references registrations (id) on delete restrict;

alter table certificates
  alter column enrolment_id drop not null;

/* Exactly one parent. A certificate is for a course OR an event, never both
   and never neither — without this a row with two nulls would verify as a
   credential for nothing. */
alter table certificates
  drop constraint if exists certificates_one_parent;
alter table certificates
  add constraint certificates_one_parent check (
    (enrolment_id is not null and registration_id is null)
    or (enrolment_id is null and registration_id is not null)
  );

create unique index if not exists certificates_registration_unique
  on certificates (registration_id) where registration_id is not null;

comment on column certificates.registration_id is
  'Sprint 7.3. Event attendance certificates reuse this table rather than a second one: same code alphabet, same public /verify page, same revocation.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists event_questions_updated_at on event_questions;
create trigger event_questions_updated_at before update on event_questions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table application_documents enable row level security;
alter table event_questions enable row level security;

/* Documents: staff manage them; an applicant may read their OWN, scoped
   through the application's learner_id. No insert policy for learners — the
   upload goes through a server action on the service role, which checks
   ownership and validates the file before anything is written. */
drop policy if exists "staff manage application documents" on application_documents;
create policy "staff manage application documents" on application_documents
  for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "applicants read own documents" on application_documents;
create policy "applicants read own documents" on application_documents
  for select to authenticated
  using (
    exists (
      select 1 from applications a
       where a.id = application_documents.application_id
         and a.learner_id = auth.uid()
    )
  );

/* Event questions are PUBLIC to read: they are part of a public registration
   form, and anon must be able to render them. Only non-archived questions on
   published events, matching how every other public content read works. */
drop policy if exists "public reads event questions" on event_questions;
create policy "public reads event questions" on event_questions
  for select to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1 from events e
       where e.id = event_questions.event_id
         and e.status = 'published'
    )
  );

drop policy if exists "staff write event questions" on event_questions;
create policy "staff write event questions" on event_questions
  for all to authenticated using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Private bucket for application documents
-- ---------------------------------------------------------------------------
--
-- Separate from `course-materials` on purpose. Both are private, but they hold
-- different things for different people: one is teaching material a learner
-- bought, the other is somebody's CV. Keeping them apart means a future policy
-- change to one cannot silently widen access to the other.

insert into storage.buckets (id, name, public, file_size_limit)
values ('application-documents', 'application-documents', false, 10485760)
on conflict (id) do update set public = false;
