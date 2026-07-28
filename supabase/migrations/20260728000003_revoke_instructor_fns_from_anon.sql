-- Revoke the 6.8 functions from anon.
--
-- 20260728000002 said `revoke all ... from public` then granted to
-- `authenticated`, which reads as sufficient and is not: Supabase grants
-- EXECUTE to anon and authenticated INDEPENDENTLY, so revoking from `public`
-- leaves the anon grant untouched. PostgREST then exposes the function on the
-- public REST endpoint.
--
-- This is the same trap that already bit 20260725000003, and tests/rls.test.ts
-- carries a loop specifically to catch it. It caught this one — the adversarial
-- test failed and this migration is the fix, rather than the test being
-- softened to match the behaviour.
--
-- What was exposed:
--
--   is_instructor_for(uuid) — a probe: anon could ask whether any given cohort
--     id has an instructor assigned. Minor on its own, but it is a boundary
--     function and boundary functions are not for the public.
--
--   cohort_report(uuid) — enrolment counts, completion rates, average scores
--     and certificate totals for any cohort, to anyone who could guess a uuid.
--     These are the figures that go into funder applications; they are SRN's
--     to publish, not a stranger's to scrape.

revoke all on function is_instructor_for(uuid) from anon;
revoke all on function cohort_report(uuid) from anon;

-- Re-assert the intended grants, so this migration fully describes the end
-- state rather than depending on what the previous one happened to leave.
grant execute on function is_instructor_for(uuid) to authenticated;
grant execute on function cohort_report(uuid) to authenticated;
