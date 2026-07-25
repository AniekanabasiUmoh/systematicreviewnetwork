-- §13.2 — expire abandoned paid-registration checkouts.
--
-- A paid registration is created as 'pending' and holds NO seat. If the user
-- never completes checkout, that row must not linger: while it doesn't consume
-- capacity (capacity counts 'paid'/'not_required' only), leaving stale pending
-- rows around muddies the unique (event_id, lower(email)) index — a user who
-- abandoned once could not retry. So we expire pending rows older than 30
-- minutes, which also frees the email to register again.
--
-- Free registrations are 'not_required' and are never touched by this.

create or replace function expire_pending_registrations()
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  update registrations
     set payment_status = 'expired'
   where payment_status = 'pending'
     and created_at < now() - interval '30 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function expire_pending_registrations() from public, anon, authenticated;
