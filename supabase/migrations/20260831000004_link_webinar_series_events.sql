-- The Webinar Series CTA now opens the live Events hub, where all published
-- upcoming webinars (and their registration states) are listed together.
update programmes
set cta_label = 'View upcoming webinars',
    updated_at = now()
where slug = 'webinar-series';
