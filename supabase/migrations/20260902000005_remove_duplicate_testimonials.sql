/* The legacy quotes were already present in the live table under the
   canonical names “Joy, Uganda” and “Joseph, Uganda”. Remove only the two
   duplicate rows added by the Phase 3 import; keep the existing records. */
delete from public.testimonials
where name in ('Joy', 'Joseph')
  and role = 'Workshop participant, Uganda';
