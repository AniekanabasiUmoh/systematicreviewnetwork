-- SRN initial schema — Design.md §6 (data model) + §13 (payments)
-- Sprint 0.2. RLS policies land in Sprint 3.1; this migration enables RLS on
-- every table with NO policies, so nothing is readable until 3.1 writes them
-- deliberately. Fail closed, not open.

-- ============================================================================
-- Enums
-- ============================================================================

create type event_type as enum ('webinar', 'course', 'mentorship', 'workshop');
create type location_type as enum ('online', 'in_person');
create type content_status as enum ('draft', 'published');
create type resource_category as enum ('guide', 'template', 'webinar', 'tool', 'publication');
create type team_group as enum ('executive', 'scientific', 'country_lead', 'mentor');
create type application_status as enum ('received', 'under_review', 'accepted', 'waitlisted', 'rejected');
create type contact_type as enum ('general', 'partnership');
create type currency_code as enum ('NGN', 'USD');

-- §13.2 — 'not_required' is the free-event case, kept distinct from 'paid' so
-- free and paid registrations are never conflated in reporting.
create type payment_status as enum (
  'not_required', 'pending', 'paid', 'failed', 'expired', 'refunded'
);

-- ============================================================================
-- Content tables (staff-edited; public reads published rows only)
-- ============================================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description_rich jsonb,
  type event_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_type location_type not null,
  location_or_link text,
  registration_opens timestamptz,
  registration_closes timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  banner_url text,
  recording_url text,
  status content_status not null default 'draft',
  -- §13.1 — minor units (kobo/cents), integer only. null or 0 means free.
  price_kobo integer check (price_kobo is null or price_kobo >= 0),
  currency currency_code not null default 'NGN',
  -- Staff can close registration early without editing dates (§8).
  registration_closed_manually boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body_rich jsonb,
  excerpt text,
  featured_image_url text,
  author text,
  published_at timestamptz,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  bio text,
  affiliation text,
  linkedin_url text,
  orcid_url text,
  "group" team_group not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category resource_category not null,
  -- Populated when the resource is an on-site article rather than a file (§6).
  body_rich jsonb,
  file_url text,
  external_url text,
  thumbnail_url text,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table impact_stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drives the §3.4 Reach Map; staff-editable.
create table reach_countries (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  country_name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  quote text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton: hero fields + per-section editable homepage copy (§6).
-- The check constraint enforces exactly one row.
create table homepage (
  id boolean primary key default true check (id),
  hero_eyebrow text,
  hero_heading text,
  hero_subheading text,
  hero_image_url text,
  about_paragraph text,
  explainer_heading text,
  explainer_body text,
  cta_heading text,
  cta_button_label text,
  cta_button_href text,
  updated_at timestamptz not null default now()
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body_rich jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Media library backing the admin image picker (§8).
create table media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  -- Required on insert: §3.5 demands alt text everywhere.
  alt_text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Submission tables (server-action writes only; staff read)
-- ============================================================================

create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  full_name text not null,
  email text not null,
  institution text,
  country text,
  -- §13.2 payment fields. Free events are 'not_required' and hold a seat
  -- immediately; paid events hold a seat only at 'paid'.
  payment_status payment_status not null default 'not_required',
  paystack_reference text unique,
  amount_kobo integer check (amount_kobo is null or amount_kobo >= 0),
  currency currency_code,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- §4.1 — one registration per email per event, case-insensitive.
create unique index registrations_event_email_unique
  on registrations (event_id, lower(email));

create table applications (
  id uuid primary key default gen_random_uuid(),
  programme text not null,
  full_name text not null,
  email text not null,
  institution text,
  country text,
  motivation text,
  status application_status not null default 'received',
  internal_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

-- §4.3 — dedupe by lower(email).
create unique index newsletter_signups_email_unique
  on newsletter_signups (lower(email));

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  type contact_type not null default 'general',
  created_at timestamptz not null default now()
);

-- §13.5 — donations, live Paystack processing.
create table donations (
  id uuid primary key default gen_random_uuid(),
  amount_kobo integer not null check (amount_kobo > 0),
  currency currency_code not null default 'NGN',
  -- Nullable: anonymous giving is allowed.
  donor_name text,
  email text not null,
  message text,
  paystack_reference text not null unique,
  payment_status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- §13.4 — webhook idempotency ledger. Paystack retries events; recording each
-- processed event id lets the handler no-op on repeats instead of
-- double-fulfilling or double-emailing.
create table paystack_events (
  id text primary key,
  event_type text not null,
  reference text,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes (§9 Sprint 0.2)
-- ============================================================================

create index events_status_starts_at_idx on events (status, starts_at);
create index news_status_published_at_idx on news (status, published_at desc);
create index registrations_event_id_idx on registrations (event_id);
create index registrations_payment_status_idx on registrations (payment_status);
-- Supports the §13.2 expiry sweep of stale unpaid rows.
create index registrations_pending_created_idx
  on registrations (created_at)
  where payment_status = 'pending';
create index resources_category_idx on resources (category, status);
create index team_members_group_sort_idx on team_members ("group", sort_order);
create index donations_payment_status_idx on donations (payment_status);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at before update on events
  for each row execute function set_updated_at();
create trigger news_updated_at before update on news
  for each row execute function set_updated_at();
create trigger team_members_updated_at before update on team_members
  for each row execute function set_updated_at();
create trigger resources_updated_at before update on resources
  for each row execute function set_updated_at();
create trigger impact_stats_updated_at before update on impact_stats
  for each row execute function set_updated_at();
create trigger reach_countries_updated_at before update on reach_countries
  for each row execute function set_updated_at();
create trigger testimonials_updated_at before update on testimonials
  for each row execute function set_updated_at();
create trigger partners_updated_at before update on partners
  for each row execute function set_updated_at();
create trigger homepage_updated_at before update on homepage
  for each row execute function set_updated_at();
create trigger pages_updated_at before update on pages
  for each row execute function set_updated_at();
create trigger applications_updated_at before update on applications
  for each row execute function set_updated_at();

-- ============================================================================
-- RLS — enabled everywhere, policies deliberately absent until Sprint 3.1.
-- With RLS on and no policies, anon and authenticated are denied everything;
-- only the service role (which bypasses RLS) can reach these tables. That is
-- the correct fail-closed starting point.
-- ============================================================================

alter table events enable row level security;
alter table news enable row level security;
alter table team_members enable row level security;
alter table resources enable row level security;
alter table impact_stats enable row level security;
alter table reach_countries enable row level security;
alter table testimonials enable row level security;
alter table partners enable row level security;
alter table homepage enable row level security;
alter table pages enable row level security;
alter table media enable row level security;
alter table registrations enable row level security;
alter table applications enable row level security;
alter table newsletter_signups enable row level security;
alter table contact_messages enable row level security;
alter table donations enable row level security;
alter table paystack_events enable row level security;
