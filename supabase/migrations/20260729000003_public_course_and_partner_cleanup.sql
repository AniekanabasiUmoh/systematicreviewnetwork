-- Public-facing Academy URLs must never expose internal demo seed names.
-- IDs and enrolments are unchanged; only public slugs move. The app keeps
-- permanent redirects for previously shared links.
update courses
set slug = 'systematic-review-methodology'
where slug = 'demo-systematic-review-methodology';

update cohorts
set slug = 'september-2026'
where slug = 'demo-cohort'
  and course_id = (
    select id from courses where slug = 'systematic-review-methodology'
  );

-- Keep the credibility bar consistent: every displayed partner has a verified
-- organisation URL, or staff can deliberately remove the partner row.
update partners
set url = 'https://unilag.edu.ng'
where name = 'University of Lagos'
  and url is null;
