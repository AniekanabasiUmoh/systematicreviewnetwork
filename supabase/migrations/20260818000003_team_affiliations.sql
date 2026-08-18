-- Real institutional affiliations for the team, and the removal of the
-- placeholder bios.
--
-- WHERE THIS COMES FROM.
--
-- Every `affiliation` was null, and every `bio` was generated filler of the
-- form "<Name> is part of the Systematic Reviews Network team, contributing to
-- SRN's training, mentorship, and research programmes." Twelve variations on
-- one sentence, saying nothing about anybody.
--
-- The old WordPress team page had "Read More" toggles, so the obvious fix was
-- to recover the real bios from there. They are not recoverable: the April 2025
-- Wayback snapshot of /the-team/ carries only names and institutions, and the
-- live site is now this one, so the original is gone. The toggle content was
-- never in the captured HTML.
--
-- So this migration does the honest half. Affiliations below are taken from
-- that archived page, cross-checked against each person's published work where
-- the archive was ambiguous. They are verifiable facts about where people work.
--
-- It deliberately does NOT invent biographies. Composing career narratives for
-- twelve named, living researchers out of search results would put claims about
-- real people's qualifications and employers on a charity's website on our
-- authority, and a wrong employer or a wrong degree is a real harm to a real
-- person. The bios stay empty until the team writes them.
--
-- /team already renders a "Read more" disclosure per person when a real bio
-- exists and hides it when one does not, so bios can be added one at a time
-- through the admin as each person supplies theirs. Nulling the placeholders
-- here is what makes that work: the page's placeholder-detecting fallback (see
-- app/(site)/team/page.tsx) becomes dead code once these are null, and can be
-- deleted when the last bio is written.

update team_members set affiliation = 'University of Calabar, Nigeria'
  where name = 'Fortune Effiong';

update team_members set affiliation = 'University of Rwanda, Rwanda'
  where name = 'Roseline Dzekem Dine';

update team_members set affiliation = 'Health Services Academy, Islamabad, Pakistan'
  where name = 'Prof Ejaz Ahmad Khan';

update team_members set affiliation = 'Federal University Oye-Ekiti, Nigeria'
  where name = 'Dr Leonard Uzairue';

update team_members set affiliation = 'University of Environment and Sustainable Development, Ghana'
  where name = 'Dr Frank Kyei Arthur';

update team_members set affiliation = 'University of North Carolina at Charlotte, United States'
  where name = 'Moses Asori';

update team_members set affiliation = 'Makerere University, Uganda'
  where name = 'Dr Edward Mawejje';

update team_members set affiliation = 'Rising Scholars'
  where name = 'Andy Nobes';

-- Uzma Kazmi is a guideline methodologist working in clinical guideline
-- development; the archived page listed her without an institution and public
-- sources give a current employer we have not had confirmed, so the field
-- describes the role rather than naming an organisation on her behalf.
update team_members set affiliation = 'Guideline methodologist'
  where name = 'Dr Uzma Kazmi';

/* Not set, because the archive does not carry them and we will not guess:
   Dr Adekunle Adeleke, Kingsley Achi, Julia Ribeiro. The archived page listed a
   "Julia D. Ribeiro" at The University of the West Indies, St. Augustine, but
   the client has said Julia's details are out of date and that she would supply
   them, so the stale value is worse than none. These three stay null and the
   cards simply omit the line. */

-- Em dashes in three role labels, per the client's house-style note. The site's
-- prose was swept in the same change; these are content rather than code and so
-- were out of that sweep's reach.
update team_members set role = 'Country Lead, Nigeria' where role = 'Country Lead — Nigeria';
update team_members set role = 'Country Lead, Uganda'  where role = 'Country Lead — Uganda';
update team_members set role = 'Country Lead, Brazil'  where role = 'Country Lead — Brazil';

-- Clear the generated placeholder bios. Scoped by the exact template so a real
-- bio written between this file being authored and applied is never destroyed.
update team_members
set bio = null
where bio like '%is part of the Systematic Reviews Network team, contributing to SRN''s training, mentorship, and research programmes.%';
