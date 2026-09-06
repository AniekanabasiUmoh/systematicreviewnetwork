-- Remove the outdated six-step overview and its caption from the Beginner
-- Academy course body. The Academy is currently staff-preview only, but the
-- content should still be corrected at the source before it is reopened.
update courses
set body_rich = jsonb_set(
  body_rich,
  '{content}',
  (
    select jsonb_agg(item order by ordinal)
    from jsonb_array_elements(body_rich -> 'content') with ordinality as parts(item, ordinal)
    where not (
      item ->> 'type' = 'image'
      and item -> 'attrs' ->> 'src' = 'https://fqjjchlozfebkogbcvpk.supabase.co/storage/v1/object/public/media/academy-six-step-overview.png'
    )
    and not (
      item ->> 'type' = 'paragraph'
      and item -> 'content' -> 0 ->> 'text' = 'The shape of a systematic review, start to finish: from the SRN facilitator materials.'
    )
  )
)
where slug = 'systematic-review-methodology'
  and body_rich is not null
  and body_rich -> 'content' @> '[{"type":"image","attrs":{"src":"https://fqjjchlozfebkogbcvpk.supabase.co/storage/v1/object/public/media/academy-six-step-overview.png"}}]'::jsonb;
