-- The _migrations bookkeeping table is created by supabase/migrate.mjs before
-- any migration runs, so it misses the blanket RLS pass in the initial schema.
-- Enable it here: no policies, so only the service role can read or write it.

alter table _migrations enable row level security;
