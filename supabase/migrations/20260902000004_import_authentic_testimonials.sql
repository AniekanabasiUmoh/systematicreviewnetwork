/* Phase 3 — replace provisional copy with the two supplied participant quotes.
   No photo is attached: the supplied artwork shows placeholders rather than
   identity-linked portraits, so a deliberate text-only rendering is safer. */
delete from public.testimonials
where name in (
  'Dr Amina Yusuf',
  'Samuel K. Mensah',
  'Dr Chantal Mukamana',
  'Workshop participant',
  'Mentorship participant'
);

insert into public.testimonials (name, role, photo_url, quote, sort_order)
values
  (
    'Joy',
    'Workshop participant, Uganda',
    null,
    'Thank you very much for your hardwork and dissemination of knowledge and skills. It was challenging, eye opening, and inspiring. Blessings.',
    1
  ),
  (
    'Joseph',
    'Workshop participant, Uganda',
    null,
    'I wish to thank the organizers, facilitators and funders for the great opportunity of capacity building - moreover free of charge. I don''t take it for granted. Much appreciated.',
    2
  );
