-- Sprint 5.11 — participant communication.
--
-- Three things:
--   1. newsletter_signups gains a one-click unsubscribe token. There is
--      currently NO unsubscribe mechanism at all — a legal exposure, not just
--      a missing feature.
--   2. registrations gains attended_at, cancelled_at, reminder_sent_at.
--   3. unsubscribe_newsletter(): SECURITY DEFINER, token-only, boolean-only,
--      revoked from anon AND authenticated — the public route uses
--      supabaseAdmin, so granting anon would put an enumerable mutation on
--      the public REST surface for no reason (same trap as every other
--      definer function here; see 20260725000003).

-- ---------------------------------------------------------------------------
-- 1. Newsletter unsubscribe
-- ---------------------------------------------------------------------------

alter table newsletter_signups
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz;

create unique index if not exists newsletter_signups_unsubscribe_token_idx
  on newsletter_signups (unsubscribe_token);

create or replace function unsubscribe_newsletter(p_token uuid)
  returns boolean
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  update newsletter_signups
     set unsubscribed_at = now()
   where unsubscribe_token = p_token
     and unsubscribed_at is null;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke all on function unsubscribe_newsletter(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Registration lifecycle columns
-- ---------------------------------------------------------------------------

alter table registrations
  add column if not exists attended_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

-- Supports the reminder cron's per-run scan (§5.11) and the seat-count fix
-- carried forward from §5.12 (cancelled rows must never count as held seats).
create index if not exists registrations_reminder_scan_idx
  on registrations (payment_status, cancelled_at, reminder_sent_at);
