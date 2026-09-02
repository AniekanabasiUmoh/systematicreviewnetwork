/* Phase 2.1 — represent the full SRN organisation structure. */
alter type public.team_group add value if not exists 'programmes';
alter type public.team_group add value if not exists 'communications';
