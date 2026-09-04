/* Complaint cleanup (3 September 2026).

   The launch-year value was being presented as an impact statistic even though
   it was a date, not a measured outcome. Remove only that exact row; the
   launch date remains in the About copy where it has context.

   Rising Scholars' official logo is bundled locally so a third-party asset
   outage cannot leave a broken image in the partner bar. The partner URL is
   unchanged by this migration.
*/
delete from public.impact_stats
where label = 'Launched'
  and value = '2022';

update public.partners
set logo_url = '/rising-scholars-logo.png'
where name = 'Rising Scholars';

/* This exact-prefix course was left behind by an interrupted learning-access
   test. Archive it rather than deleting its three test enrolments; the Academy
   access model deliberately keeps historical enrolment records intact. */
update public.courses
set status = 'draft',
    archived_at = coalesce(archived_at, now())
where slug = 'zz-test-6-5-course';
