-- Final client-facing content pass, August 2026.
--
-- This applies the content Fortune explicitly authorised us to draft where
-- source material is not yet available. Team bios and photography remain
-- untouched because they will be supplied separately.

-- The Academy course now has its completed curriculum and is published, so the
-- public Academy catalogue is reopened in the accompanying TSX change.

-- Representative testimonials, approved as provisional copy by Fortune. They
-- are regular CMS rows and can be replaced in /admin/testimonials at any time.
insert into testimonials (name, role, quote, sort_order)
select * from (values
  ('Dr Amina Yusuf', 'Workshop participant, Nigeria', 'The workshop made the review process feel practical. I left with a clearer question, a plan for my search, and the confidence to take the next step.', 1),
  ('Samuel K. Mensah', 'Mentorship participant, Ghana', 'Having someone experienced to discuss each decision with changed the way I approached my review. The guidance was practical, patient, and exactly what I needed.', 2),
  ('Dr Chantal Mukamana', 'Webinar participant, Rwanda', 'The sessions translate complex methods into steps that researchers and evidence users can apply in their own work straight away.', 3)
) as seed(name, role, quote, sort_order)
where not exists (select 1 from testimonials);

-- Publications supplied by Fortune. These use publisher DOI URLs rather than
-- copied files, so readers reach the version of record and the library stays
-- current if an article is corrected or updated.
insert into resources (title, slug, description, category, external_url, status)
values
  ('Mpox surveillance in endemic regions', 'mpox-surveillance-endemic-regions', 'A scoping review of surveillance trends, challenges, and recommendations in endemic regions.', 'publication', 'https://doi.org/10.1186/s12879-025-12175-9', 'published'),
  ('Dapivirine vaginal ring adherence in African women', 'dapivirine-vaginal-ring-adherence-african-women', 'A systematic review and meta-analysis of adherence and associated factors.', 'publication', 'https://doi.org/10.1371/journal.pgph.0006422', 'published'),
  ('Immunization disparities among migrants in Sub-Saharan Africa', 'immunization-disparities-migrants-sub-saharan-africa', 'A scoping review of immunization disparities, barriers, and facilitators.', 'publication', 'https://doi.org/10.1186/s12982-026-01814-4', 'published'),
  ('Risk compensation and the Dapivirine vaginal ring in Africa', 'risk-compensation-dapivirine-vaginal-ring-africa', 'A scoping review of sexually transmitted infection risk among women using the Dapivirine vaginal ring.', 'publication', 'https://doi.org/10.1080/19317611.2025.2514031', 'published')
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    external_url = excluded.external_url,
    status = excluded.status;

-- The old site has no archived malaria-specific content. This replacement is
-- intentionally scoped to SRN's capacity-building role: it names no outcomes,
-- policy adoption, partners, or figures that have not been verified.
update pages
set title = 'Improving evidence-informed malaria policy-making in Nigeria and Ghana',
    body_rich = '{
      "type": "doc",
      "content": [
        {"type":"paragraph","content":[{"type":"text","text":"Malaria decisions are made in settings where the evidence is often extensive, but time, access, and confidence to use it are limited. SRN works to help researchers and decision-makers move from a broad policy question to evidence that can be examined, discussed, and applied in context."}]},
        {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Making evidence usable"}]},
        {"type":"paragraph","content":[{"type":"text","text":"Through practical training and facilitated conversations, participants strengthen the skills needed to frame answerable questions, find and assess relevant research, and interpret systematic review findings alongside local priorities. The aim is not to prescribe a single answer, but to make the reasoning behind a decision clearer and more transparent."}]},
        {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"A shared starting point"}]},
        {"type":"paragraph","content":[{"type":"text","text":"For teams working across Nigeria and Ghana, this creates a shared starting point for discussing what is known, what remains uncertain, and what evidence may be most useful for policy, programming, and implementation. As local capacity grows, researchers and policymakers are better placed to return to the evidence when the next decision is needed."}]}
      ]
    }'::jsonb
where slug = 'impact-story-2';
