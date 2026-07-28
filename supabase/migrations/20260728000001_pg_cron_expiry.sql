-- Move the 10-minute expiry job from Vercel Cron to pg_cron.
--
-- WHY THIS EXISTS.
--
-- §13.2 wants abandoned checkouts released quickly: a pending payment holds a
-- seat, and on a full cohort every held seat is someone turned away. Ten
-- minutes was the right interval and was what vercel.json asked for.
--
-- Vercel's Hobby plan permits at most ONE cron run per day. Worse, it does not
-- degrade — it REJECTS the whole deployment at validation. So from 25 July the
-- */10 schedule silently blocked every deploy, and because a rejected deploy
-- leaves the previous one serving, the site sat three days and thirty-one
-- commits stale while appearing perfectly healthy.
--
-- Dropping to daily would have fixed the deploys and broken the feature: a seat
-- held for 24 hours instead of 10 minutes. pg_cron gives us the original
-- interval back, on the Supabase free tier, with no plan upgrade — and it is a
-- better fit anyway. Both jobs are pure SQL:
--
--   * no HTTP hop, so no CRON_SECRET to leak or forget;
--   * no serverless cold start every ten minutes;
--   * the schedule lives beside the function it calls, so the two cannot drift.
--
-- The Vercel route stays in place. It is now a manual lever — hit it with the
-- Bearer token to force an immediate sweep — rather than the scheduler.

create extension if not exists pg_cron;

-- pg_cron installs into its own schema; the postgres role needs to reach it.
grant usage on schema cron to postgres;

/* Idempotent: unschedule before scheduling so re-running this migration, or
   editing the interval later, cannot leave two jobs racing each other. */
do $$
begin
  perform cron.unschedule('expire-pending-checkouts');
exception
  when others then null;  -- not scheduled yet, which is the normal first run
end $$;

/* Every 10 minutes, both sweeps in one transaction.
 *
 * Deliberately ONE job rather than two: the registration and enrolment sweeps
 * are the same job on the same schedule — one abandoned checkout holding a seat
 * forever is the same bug in both places — and a single entry cannot drift out
 * of step with itself. This mirrors the comment already in the Vercel route. */
select cron.schedule(
  'expire-pending-checkouts',
  '*/10 * * * *',
  $$
    select expire_pending_registrations();
    select expire_pending_enrolments();
  $$
);
