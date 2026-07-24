-- Public read policies for content tables (Design.md §9 Sprint 3.1).
--
-- Brought forward from 3.1 because Sprint 2.1 needs the public site to read
-- published content. This migration covers READS ONLY. Writes, staff policies,
-- and the adversarial test suite remain Sprint 3.1's job.
--
-- Deliberately unchanged here: the submission tables (registrations,
-- applications, newsletter_signups, contact_messages, donations,
-- paystack_events) get NO anon policies at all, so anon can neither read nor
-- write them. Public form writes go through server actions using the service
-- role (§1 architecture rule).

-- ---------------------------------------------------------------------------
-- Tables with a status column: published rows only. Drafts stay invisible.
-- ---------------------------------------------------------------------------

create policy "public reads published events"
  on events for select to anon, authenticated
  using (status = 'published');

create policy "public reads published news"
  on news for select to anon, authenticated
  using (status = 'published');

create policy "public reads published resources"
  on resources for select to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- Tables without a status column: fully public reads.
-- ---------------------------------------------------------------------------

create policy "public reads team members"
  on team_members for select to anon, authenticated using (true);

create policy "public reads impact stats"
  on impact_stats for select to anon, authenticated using (true);

create policy "public reads reach countries"
  on reach_countries for select to anon, authenticated using (true);

create policy "public reads testimonials"
  on testimonials for select to anon, authenticated using (true);

create policy "public reads partners"
  on partners for select to anon, authenticated using (true);

create policy "public reads homepage"
  on homepage for select to anon, authenticated using (true);

create policy "public reads pages"
  on pages for select to anon, authenticated using (true);

-- Media rows back image fields on published content; the storage buckets are
-- already public, so the metadata being readable adds no exposure.
create policy "public reads media"
  on media for select to anon, authenticated using (true);
