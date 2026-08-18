-- Mentorship applications need to say which side the applicant is offering.
--
-- The programme runs by matching three groups: mentees bringing a review,
-- mentors offering supervision, and librarians supporting the search strategy.
-- The old WordPress site handled this with two separate bit.ly Google Forms
-- (one for mentees, one for mentors); the client asked for it to be one form
-- that captures the role, so staff can match people after an intake closes.
--
-- Nullable, with no default. Every existing application predates the field, and
-- the overwhelming majority are mentee-side, but "overwhelming majority" is not
-- a fact about any individual row — back-filling a guess would put words in
-- real applicants' mouths. Null reads honestly as "not asked".
--
-- Only the Mentorship programme renders the selector, so applications to the
-- other four programmes will continue to leave this null by design.

create type applicant_role as enum ('mentee', 'mentor', 'librarian');

alter table applications
  add column applicant_role applicant_role;

comment on column applications.applicant_role is
  'Which side of the Mentorship Programme the applicant is offering. Null for applications to other programmes, and for any application submitted before 2026-08.';
