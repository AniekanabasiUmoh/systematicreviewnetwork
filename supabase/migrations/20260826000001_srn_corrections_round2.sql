-- Round-2 client corrections, from `new/SRN Corrections to Web.txt` (26 August
-- 2026), a follow-up to `SRN Corrections to Web.md` (18 August) already applied
-- in 20260818000001_client_corrections.sql and 20260818000003_team_affiliations.sql.
--
-- This migration applies only what the new document actually answers with
-- concrete, unambiguous content. See SRN_CORRECTIONS_STATUS_2.md for the full
-- accounting of what changed here and what is still missing from the client
-- (real testimonials, bios, YouTube links, confirmed DOIs, the "2,000" figure
-- the client wants removed but which does not match any current impact_stats
-- row, etc.) — those are deliberately left untouched rather than guessed at.

-- ── Impact — reach map narrowed to in-person workshop countries ────────────
-- The client asked the map to show only where SRN has run in-person workshops:
-- Nigeria, Ghana, Rwanda, Uganda. Round 1 flagged this as an open decision
-- between narrowing the map (and retitling it) or keeping all eight and
-- retitling instead; the client's follow-up picks the former outright.
-- "Countries reached: 8" stays as-is — it is a separate, wider figure that the
-- page text now explicitly distinguishes from the map (see about/page.tsx-style
-- TSX change in the same commit).
delete from reach_countries
where country_code not in ('NG', 'GH', 'RW', 'UG');

-- ── Mentorship — annual cadence detail ──────────────────────────────────────
-- The client's new document describes the real intake pattern: mostly once a
-- year, occasionally twice, opening in January, calling for mentors, mentees
-- and librarians together. Folded into the programme intro so the page reflects
-- reality rather than a generic "rolling basis" claim with no cadence at all.
update programmes
set intro = 'The Mentorship Programme pairs researchers with experienced reviewers throughout a live review process, helping them make confident methodological decisions from protocol development to final synthesis. We call for mentees, mentors, and librarians together, typically once a year with applications opening in January, and match people once an intake closes.'
where slug = 'mentorship';

-- ── Team — Nafisa Elehamer added, and two title corrections ────────────────
-- The client's new roster gives Roseline Dzekem Dine as "Deputy Director" and
-- Prof Ejaz Ahmad Khan as "Research and Scientific Director" — swapped from
-- what the site currently shows. Applying the client's titles as authoritative
-- over the live (evidently stale) values, per their explicit instruction.
update team_members set role = 'Deputy Director'
  where name = 'Roseline Dzekem Dine';

update team_members set role = 'Research and Scientific Director'
  where name = 'Prof Ejaz Ahmad Khan';

-- Nafisa Elehamer is new to the roster (Programmes Committee, alongside
-- Fortune Effiong and Julia Ribeiro per the client's list). No photo,
-- affiliation, or bio supplied yet — the team page already renders a card
-- correctly with just a name and role, and shows "Read more" only once a real
-- bio exists, so this is safe to add incomplete.
insert into team_members (name, role, "group", sort_order)
values ('Nafisa Elehamer', 'Programmes Committee', 'executive', 3);
