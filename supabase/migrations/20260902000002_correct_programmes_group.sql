/* Nafisa was added during the corrections pass as an Executive member, but
   her current SRN role is Programmes Committee. */
update public.team_members
set "group" = 'programmes', updated_at = now()
where name = 'Nafisa Elehamer';
