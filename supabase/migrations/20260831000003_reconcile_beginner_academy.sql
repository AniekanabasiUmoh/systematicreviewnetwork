-- Make the database relationship and public programme metadata agree with the
-- canonical Academy course. The old /programmes/beginner-academy URL redirects
-- to that course page, so these fields are used in the programmes index and
-- admin rather than rendered as a second course description.

update programmes as p
set
  tagline = 'A structured course taking first-time reviewers from a question to a registrable protocol.',
  audience = 'Students and early-career researchers',
  format = 'Online, self-paced or cohort-led',
  duration = 'Seven modules',
  intro = 'The Beginner Academy takes you from a first, answerable question to a clear plan for a systematic review through seven practical modules. No prior review experience is assumed.',
  cta_kind = 'apply',
  cta_label = 'View course and cohorts',
  updated_at = now()
where p.slug = 'beginner-academy';

update courses as c
set programme_id = p.id,
    updated_at = now()
from programmes as p
where c.slug = 'systematic-review-methodology'
  and p.slug = 'beginner-academy'
  and c.programme_id is distinct from p.id;
