-- Per-IP rate limiting, Postgres-backed (Design.md §9 Sprint 3.2, §11).
--
-- The spec offered Upstash Redis or Vercel KV. We use Postgres instead: the
-- project already has a database and a service-role client, so a rate limiter
-- here adds no new service, no new secret, and behaves identically in dev and
-- prod. At a few hundred submissions/month the load is negligible.
--
-- One row per (form, ip, window-hour). The counter is bumped atomically with an
-- upsert; the server action reads the returned count and rejects at the cap.
-- RLS enabled with no policies: only the service role touches this table.

create table rate_limits (
  form text not null,
  ip text not null,
  -- Truncated to the hour: this is the fixed window the cap applies to.
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (form, ip, window_start)
);

alter table rate_limits enable row level security;

-- Bump the counter for the current hour window and return the new count.
-- SECURITY DEFINER + pinned search_path so it can be granted narrowly if ever
-- needed; today only the service role calls it.
create or replace function bump_rate_limit(p_form text, p_ip text)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  w timestamptz := date_trunc('hour', now());
  c integer;
begin
  insert into rate_limits (form, ip, window_start, count)
    values (p_form, p_ip, w, 1)
  on conflict (form, ip, window_start)
    do update set count = rate_limits.count + 1
  returning count into c;
  return c;
end;
$$;

revoke all on function bump_rate_limit(text, text) from public;

-- Housekeeping: drop windows older than a day. Called opportunistically by the
-- limiter so the table cannot grow without bound; no cron dependency.
create or replace function prune_rate_limits()
  returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;

revoke all on function prune_rate_limits() from public;
