-- Lock security-definer helpers to the service role only (Design.md §1, §3.2).
--
-- `revoke ... from public` in the prior migrations was insufficient: Supabase
-- grants EXECUTE to the `anon` and `authenticated` roles independently of
-- PUBLIC, and PostgREST will happily expose any callable function in the
-- `public` schema over the anon REST endpoint. So an attacker could invoke
-- bump_rate_limit() directly and inflate the rate-limit table, or probe
-- is_staff(). Neither is a data breach, but both are needless surface.
--
-- Revoke from the API roles explicitly. is_staff() must stay callable by the
-- authenticated role, because the RLS policies on the content tables invoke it
-- as that role — but it is SECURITY DEFINER, so the caller still can't read
-- profiles directly; they only get the boolean. bump/prune are service-role
-- only (server actions run on the service-role client, which bypasses these
-- grants entirely).

revoke execute on function bump_rate_limit(text, text) from anon, authenticated;
revoke execute on function prune_rate_limits() from anon, authenticated;
revoke execute on function is_staff() from anon;
