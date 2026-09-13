-- Events can hand registration to Zoom (or another external provider).
-- A nullable link preserves the existing SRN registration flow for events that
-- still use the built-in form while giving staff an explicit external option.
alter table public.events
  add column if not exists registration_url text;

comment on column public.events.registration_url is
  'Optional external registration link (for example a Zoom registration page).';
