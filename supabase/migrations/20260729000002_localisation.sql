-- Sprint 7.4 — French localisation, schema half.
--
-- §7.4: "Every content table in §6 needs a translation strategy: either
-- per-locale rows or a `translations` jsonb column. Decide once, early —
-- retrofitting is expensive."
--
-- DECISION: a `translations` jsonb column, not per-locale rows.
--
--   * One row per thing keeps the slug, the status, the sort order and every
--     foreign key single-sourced. Per-locale rows would duplicate all of it and
--     then need rules for what happens when the two copies disagree about
--     whether something is published.
--   * A missing translation is a missing KEY, not a missing row. The French
--     page falls back to English rather than 404ing, which is the right
--     behaviour while a translator works through a backlog.
--   * The admin can author both locales side by side against one record. With
--     two rows a staffer edits one and forgets the other, and nothing tells
--     them.
--
-- Shape: {"fr": {"title": "...", "summary": "..."}}. Only the fields that
-- actually carry prose are translated; slugs stay in English so a URL is stable
-- across locales and inbound links never break.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS MIGRATION DOES NOT DO
-- ---------------------------------------------------------------------------
--
-- It ships no French copy. §7.4 carries an honest constraint in its own words:
-- "this only works if SRN has a French speaker to write and maintain the copy.
-- Machine translation of methodological training material will produce errors
-- that damage credibility. Do not ship it without a human translator
-- committed."
--
-- SRN has no committed translator today. So this builds the machinery — the
-- column, the fallback, the admin fields, the missing-translation view — and
-- leaves every value empty. The day a translator starts, they type into a form
-- that already exists. Until then `/fr` is not linked from anywhere and the
-- locale switcher is not rendered.

do $$
declare t text;
begin
  foreach t in array array[
    'news', 'events', 'programmes', 'resources', 'pages', 'courses'
  ] loop
    execute format(
      'alter table %I add column if not exists translations jsonb not null default ''{}''::jsonb',
      t
    );
    execute format(
      'comment on column %I.translations is %L',
      t,
      'Sprint 7.4. {"fr": {field: value}}. Only prose fields; slugs stay English so URLs are stable across locales. A missing key falls back to the English column rather than 404ing.'
    );
  end loop;
end $$;

/* A staffer needs to see what still needs translating, and a query that scans
   six tables every page load is the wrong way to answer that. One view, one
   read. Counting only PUBLISHED rows: a draft nobody can see in English does
   not need French yet.

   security_invoker so the caller's own RLS applies — this view must not become
   a way to read draft content that the underlying policies would refuse. */
create or replace view translation_status
with (security_invoker = true)
as
  select 'news' as resource, id, title as label, status,
         (translations -> 'fr' ->> 'title') is not null as has_fr
    from news where status = 'published'
  union all
  select 'events', id, title, status,
         (translations -> 'fr' ->> 'title') is not null
    from events where status = 'published' and archived_at is null
  union all
  select 'programmes', id, title, status,
         (translations -> 'fr' ->> 'title') is not null
    from programmes where status = 'published' and archived_at is null
  union all
  select 'resources', id, title, status,
         (translations -> 'fr' ->> 'title') is not null
    from resources where status = 'published'
  union all
  /* `pages` has no status column — the handful of standing pages (privacy,
     terms, FAQ) are always live, so there is nothing to publish. They are
     listed unconditionally with a literal status so the view's shape holds. */
  select 'pages', id, title, 'published'::content_status,
         (translations -> 'fr' ->> 'title') is not null
    from pages
  union all
  select 'courses', id, title, status,
         (translations -> 'fr' ->> 'title') is not null
    from courses where status = 'published' and archived_at is null;

comment on view translation_status is
  'Sprint 7.4. One read to answer "what still needs French?". Published rows only — a draft nobody can see in English does not need a translation yet.';

revoke all on translation_status from anon;
grant select on translation_status to authenticated;
