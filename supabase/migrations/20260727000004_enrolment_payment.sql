-- Sprint 6.4 — Enrolment & payment.
--
-- 6.3 created `enrolments` minimally so its access gate could be tested against
-- something real. This migration adds what 6.4 needs and does not recreate the
-- table: payment columns mirroring `registrations` (§13.2), a waitlist, and the
-- cancellation column §5.12 made load-bearing for seat counting.

-- ---------------------------------------------------------------------------
-- Payment
-- ---------------------------------------------------------------------------
--
-- Deliberately the SAME shape and the same vocabulary as registrations:
-- payment_status/amount_kobo/currency/paystack_reference/paid_at. One webhook
-- fulfils both, and a staffer reading a roster sees the words they already know
-- from the operations screens.
--
-- `not_required` is the free tier (decision 4): price_kobo = 0 means enrolled
-- and paid-up, not "payment outstanding". It is the default because a free
-- cohort is the path that must work without Paystack configured at all.

do $$ begin
  create type enrolment_payment_status as enum ('not_required','pending','paid','refunded','failed');
exception
  when duplicate_object then null;
end $$;

alter table enrolments
  add column if not exists payment_status enrolment_payment_status not null default 'not_required',
  add column if not exists amount_kobo integer not null default 0 check (amount_kobo >= 0),
  add column if not exists currency text not null default 'NGN' check (currency in ('NGN','USD')),
  add column if not exists paystack_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  -- Denormalised so a roster stays readable after a learner edits their
  -- profile, exactly as applications.programme does (§5.7): it records what was
  -- true at enrolment, and a later edit must not rewrite history.
  add column if not exists learner_name_at_enrolment text,
  add column if not exists learner_email_at_enrolment text;

-- A reference is Paystack's idempotency key. Two enrolments must never share
-- one, or a single charge could fulfil the wrong row. Partial, because the free
-- path leaves it null and nulls are not unique in Postgres anyway.
create unique index if not exists enrolments_reference_unique
  on enrolments (paystack_reference)
  where paystack_reference is not null;

create index if not exists enrolments_payment_status_idx
  on enrolments (payment_status);

comment on column enrolments.payment_status is
  'Mirrors registrations.payment_status. not_required = the free tier (price_kobo 0), which is enrolled and paid-up, never outstanding.';

-- ---------------------------------------------------------------------------
-- Waitlist
-- ---------------------------------------------------------------------------
--
-- A separate table rather than another enrolment state. A waitlisted person is
-- not enrolled: they hold no seat, unlock no lesson, and have paid nothing, so
-- putting them in `enrolments` would mean every access query grew an exclusion
-- it could forget. Position is derived from created_at, not stored, so it can
-- never drift out of order.

create table if not exists cohort_waitlist (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete restrict,
  learner_id uuid not null references learners (id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Set when a seat is offered, so an offer is not silently made twice.
  offered_at timestamptz,
  -- Set when they take the seat or the offer lapses; either way they are done.
  resolved_at timestamptz
);

create unique index if not exists cohort_waitlist_unique
  on cohort_waitlist (cohort_id, learner_id);

create index if not exists cohort_waitlist_queue_idx
  on cohort_waitlist (cohort_id, created_at)
  where resolved_at is null;

alter table cohort_waitlist enable row level security;

-- Same posture as enrolments: a learner reads their own row, staff read and
-- write everything, anon gets nothing.
drop policy if exists "learners read own waitlist" on cohort_waitlist;
create policy "learners read own waitlist" on cohort_waitlist
  for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists "staff read waitlist" on cohort_waitlist;
create policy "staff read waitlist" on cohort_waitlist
  for select to authenticated using (is_staff());

drop policy if exists "staff write waitlist" on cohort_waitlist;
create policy "staff write waitlist" on cohort_waitlist
  for all to authenticated using (is_staff()) with check (is_staff());

comment on table cohort_waitlist is
  'Sprint 6.4. Deliberately NOT a state on enrolments: a waitlisted person holds no seat and unlocks nothing, so they must not appear in any enrolment query.';

-- ---------------------------------------------------------------------------
-- Expiry of abandoned checkouts
-- ---------------------------------------------------------------------------
--
-- The same rule as registrations (§13.2, 20260725000004): a pending enrolment
-- is someone who opened Paystack and walked away. It must not hold a seat
-- forever, or one abandoned checkout permanently shrinks a paid cohort.
--
-- SECURITY DEFINER so the cron route can call it, and revoked from every API
-- role — Supabase grants EXECUTE to anon/authenticated independently, so
-- `revoke from public` alone is not enough. That trap has bitten this project
-- before (20260725000003).

create or replace function expire_pending_enrolments()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  update enrolments
     set state = 'withdrawn',
         payment_status = 'failed',
         withdrawn_at = now()
   where state = 'pending'
     and payment_status = 'pending'
     and created_at < now() - interval '2 hours';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function expire_pending_enrolments() from public;
revoke execute on function expire_pending_enrolments() from anon;
revoke execute on function expire_pending_enrolments() from authenticated;
