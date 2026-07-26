# SRN Website — Design.md (v2)

**Client:** Fortune Effiong / Systematic Reviews Network (SRN)
**Deliverable:** A credible international evidence-synthesis website with staff-editable content (custom admin) and native event registration + application intake from launch.

**How to use this document:** This is the single source of truth for an agentic build (Claude Code, phase by phase). Each sprint has a **Build** list and a **Done when** check. Build exactly what is specified; where a judgment call is genuinely open, it is listed in §12 Open Items — do not invent scope beyond this doc. Placeholder content must be visibly marked `[PLACEHOLDER]` so it cannot silently ship.

---

## 1. Stack (locked)

| Layer               | Choice                               | Notes                                                                                                       |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Framework           | **Next.js (App Router, TypeScript)** | Frontend + custom admin in one app. SSG/ISR for content pages.                                              |
| Styling             | **Tailwind CSS**                     | Tokens from §3 defined in the Tailwind theme. No component library; components built from the kit in §4.    |
| Hosting             | **Vercel**                           | One project, frontend + admin.                                                                              |
| DB / Auth / Storage | **Supabase**                         | Postgres for all data, Supabase Auth for staff login, Storage for media.                                    |
| Admin               | **Custom `/admin` in Next.js**       | No third-party CMS.                                                                                         |
| Email               | **Resend + React Email**             | Transactional confirmations. Newsletter emails captured to DB for v1; campaigns via a marketing tool later. |
| Icons               | **Lucide**                           | Single icon family, 1.5px stroke, brand colors only.                                                        |
| Fonts               | **next/font (Google)**               | Archivo (display) + Inter (body) — §3.2, revised 2026-07-24. Self-hosted via next/font, no layout shift.    |
| Analytics           | **Plausible**                        | Privacy-friendly, added at launch.                                                                          |

**Locked decisions:** fixed registration fields (no per-event form builder in v1) · ~~anonymous public submissions (no end-user accounts)~~ — **reversed 2026-07-26, see Phase 6 decision 5:** learner accounts arrive in Sprint 6.1 and anonymous event registration ends there · accounts/members area = Phase 6 (learner) and Phase 7 (member) · staff are non-technical, the admin UX is a first-class deliverable.

**Architecture rule for all public forms:** the browser never writes to Supabase directly. Every public form submits to a **Next.js server action / route handler** which validates, rate-limits, and writes using the server-side service role. Supabase RLS then denies the anon key _everything_ on submission tables — defense in depth, not the primary gate. (§9, Sprint 3.1.)

---

## 2. Field review — what the reference sites teach us

Reviewed: Cochrane, JBI, Evidence Synthesis Ireland (screenshots + live), Campbell Collaboration, Africa Evidence Network.

**Adopted into this design:**

1. **Partner/credibility bar directly under the hero** (ESI does this with Cochrane Ireland, University of Galway, HRB, HSC). Trust is established in the first screen, not the footer. SRN's equivalents: AuthorAID/INASP, partner universities, any institutional collaborators Fortune can confirm.
2. **Animated impact counters** (ESI: 210+ events, 19,500 attendees, 8 stats). We use 4–6, not 8. **Implementation gotcha seen live on ESI:** their counters render `0` without JS. Ours must server-render the real numbers and only _animate_ on scroll as an enhancement. Numbers exist without JavaScript.
3. **Plain-language explainer on the homepage** (Campbell: "What is a systematic review?"). SRN serves beginners; a short "New to systematic reviews?" strip earns SEO and welcomes the exact audience the mission targets.
4. **A leader quote as the testimonial anchor** (ESI: Prof Devane over a campus photo). SRN: one strong quote from Fortune or a scientific committee member, over a real event photo.
5. **Real workshop photography as the credibility engine** (JBI's short-courses grid is carried entirely by real classroom photos). Drives the image manifest in §7.
6. **Community scale as proof** (AEN leads with "5,000+ members, all African countries"). SRN's LinkedIn following and member count belong in the impact strip.

**Deliberately rejected:**

- JBI's product-first grid (SUMARI, PACES). SRN sells capacity, not software. Programme-first, like ESI.
- Cochrane's news-first homepage. SRN is a training org; training-first ordering.
- Multilingual bar (Cochrane). Phase 2 note: French would serve Cameroon/Francophone West Africa, matching SRN's growth arc. Not v1.
- Carousel heroes (JBI). One strong hero, no carousels anywhere. Carousels hide content and read as template.

---

## 3. Design direction

Goal: **calm institutional authority with warmth.** Must read as an international evidence organisation next to Cochrane/JBI, while feeling African-rooted rather than borrowed. Explicitly avoid the three generative-design defaults (cream+serif+terracotta; near-black+acid accent; broadsheet hairlines).

### 3.1 Palette (Tailwind tokens) — REVISED 2026-07-24, ESI-informed redesign

**Direction shipped:** near-monochrome, "simple and elegant." After building the
site against the earlier navy/gold palette it read generic; Thorpeboss chose
Evidence Synthesis Ireland as the north star and set the constraints — no gold,
no green on text, plain white paper (not warm), elegance from type/space/
photography. The palette is now:

```
--brand      #16182B   ink-navy — wordmark, nav, footer, photo overlays
                       (folded into --ink; there is no separate lighter navy)
--ink        #16182B   near-black with a faint navy bias — body AND headings
--evidence   #1F6F5C   THE action color — button FILLS and focus accent ONLY.
                       Never on headings, body, links, or eyebrows.
--evidence-ink #123F34 pressed / hover state for green fills
--paper      #FFFFFF   plain white — crisp, gallery-like (not warm cream)
--mist       #F4F5F7   alternating band, cool neutral
--slate / --ink-soft #494C63  secondary text, captions, metadata (AA on white)
--evidence-tint #E8F2EF  green button-ghost hover wash only
--hairline   #E4E5EA   hairline rules + typographic-index rows
```

**Retired in this revision:**

- **Gold is gone** (`--gold` / `--gold-bright` aliased to `--ink` so any straggler
  resolves to ink, not a missing token). Impact numbers are now ink on white, or
  white on the dark impact band.
- **The four category-tag hues are retired to mono** — every `--tag-*` token
  resolves to the same ink-outline / slate-text pair, so tags read as quiet
  labels, not a colour-coding system. `Tag.tsx` needs no structural change.
- **No green text anywhere.** `Eyebrow` defaults to slate; card audience/role/
  meta lines are slate/ink. Green survives only as a button fill and the `:hover`
  interaction accent.

**Rules:**

- One accent, spent in one place: the green button fill. Everything else is ink,
  slate, and white, so photography and type carry the page.
- Photo overlays (§3.3) use `--ink` multiply, so photography carries the ink-navy.
- Contrast: all text pairs pass WCAG AA; `--slate` on `--mist` is metadata only.
  Focus ring is a two-tone white-halo + ink-core so it clears 3:1 on both the
  white bands and the dark hero/footer (the single green ring measured 2.91:1 on
  navy).

### 3.2 Typography — REVISED 2026-07-24, two families (Archivo + Inter)

The Inter-only decision (a serif having been rejected earlier) was superseded by
the ESI-informed redesign: an Inter-only site read generic. Headings now get a
**display face**, which is what gives the page its art-directed, institutional
register.

- **Display: Archivo** (variable, 100–900, with a width axis), set via
  `--font-display`. Used for: the wordmark, section headlines (h2), page titles,
  pull quotes, impact numbers, and the typographic index. `.text-display` is
  Archivo 700 at ~110% width; `.text-display-tight` is 800/112% for hero and
  impact numbers. Archivo's genuine thin→black range enables the **signature hero
  move**: `.hero-thin` (300) over `.hero-black` (800) at the same size — thin over
  black reads as deliberate, not defaulted.
- **Body & UI: Inter** — 400/500/600. Paragraphs, cards, nav, forms, admin.
- **Utility labels ("eyebrow"):** Inter 600, 12–13px, +0.08em, uppercase,
  `--slate` (never green) — above every section headline.

Two families means one webfont more to load, but both use `display:swap` so a
slow font never blocks paint, and dimensions are always set so there is no
layout shift. Sharp corners (`--radius-card: 0`) are the rule across cards,
panels, inputs, and buttons; the pill shape is reserved for small tags.

Type scale (desktop → mobile): hero 56→36 · h2 36→28 · h3 24→20 · body 17→16 · small 14 · eyebrow 13. Line-length cap on prose: 68ch.

### 3.3 Layout system

- Max content width 1200px; prose columns 720px. Section vertical padding 96px desktop / 56px mobile. Grid gap 24px.
- Sections alternate `--paper` / `--mist`; the footer and at most one mid-page CTA band are `--ink` (light text).
- Cards: white, 1px `#E4E5EA` hairline border, **0px radius** (sharp corners are the rule post-redesign — `--radius-card: 0`), subtle shadow on hover only, 24px padding. No glassmorphism, no gradient borders.
- **Typographic index** (`.index-list` / `.index-row`): programmes and events render as a hairline-ruled list, not a card grid — number · title/who · trailing meta, with a hover shift-right. On mobile it stacks and keeps its metadata (never `display:none`).
- Photography treatment: hero and CTA-band images get an **ink multiply overlay (55–70%)** so white text always sits legibly on real photos — this also visually unifies photos of mixed quality, which matters when the sources are Zoom screenshots and phone photos (§7). The homepage hero uses a layered scrim (top band + bottom-up gradient + flat wash) so the header always reads over darkness.
- Motion: impact counters count up on first scroll into view; cards lift 2px on hover; one soft fade-up per section, 300ms, once. Nothing else. `prefers-reduced-motion` disables all of it.

### 3.4 Signature element — the Reach Map

A quiet, Africa-centered world map (static inline SVG, no map library) with `--evidence` dots on member/activity countries (Nigeria, Rwanda, Ghana, Cameroon, Pakistan, Brazil + whatever Fortune confirms), country names on hover. Full-size on the Impact page; a small monochrome echo behind the hero's impact strip. It encodes the true story — LMIC capacity across many countries — and is the one memorable device. Everything else stays disciplined.

### 3.5 Quality floor (every page, not announced)

Responsive to 360px · visible keyboard focus (two-tone white-halo + ink-core ring, ≥3:1 on light and dark grounds — revised 2026-07-24 from the single green outline) · semantic headings, one h1 per page · alt text everywhere (and hero alt resolves from the rendered image URL, so it always matches the photo) · WCAG AA contrast · reduced motion respected · no layout shift from fonts or images (dimensions always set).

---

## 4. Component kit (build once, Sprint 1.1)

`Eyebrow` · `SectionHeader` (eyebrow + h2 + optional lede) · `Button` (primary green fill / secondary outline-ink; sharp corners; the `gold` variant is retired and aliased to green) · `StatCounter` (SSR number + scroll animation) · `EventCard` (type tag, date block, title, capacity/status chip, register CTA) · `ProgrammeCard` (icon, title, blurb, audience line) · `PersonCard` (photo, name, role, affiliation, links) · `ResourceCard` (category tag, title, description, download/external) · `TestimonialBlock` (quote, person, photo) · `CTABand` (ink background, headline, one button) · `PartnerLogoBar` (greyscale logos, color on hover) · `ReachMap` (§3.4) · `FormField` set (input, select, textarea, error/success states written in plain language per the writing rules below) · `Table` + `CSVExportButton` (admin) · `StatusBadge` (application workflow colors).

**Interface writing rules (public + admin):** active voice; buttons say what happens ("Register for this event", "Save changes", "Export CSV"); an action keeps its name through the flow (button "Publish" → toast "Published"); errors say what went wrong and how to fix it, never apologize, never vague; empty states are invitations ("No events yet. Create your first event."); sentence case everywhere except eyebrows.

---

## 5. Information architecture & page specs

Nav: `Home · About · Programmes · Resources · Impact · Team · News & Events · Partner with SRN · Contact` — Mentorship lives under Programmes; Community merges into Impact/News for v1 (one less thin page). Donate is a section of Partner with SRN. Mobile: full-screen sheet menu.

### Homepage — REVISED 2026-07-24 (ESI-informed rebuild; order now leads a new visitor)

The earlier 13-section card-catalogue order was replaced by an editorial layout
that opens with presence, proves it, then explains. The "Who we serve" pathway
cards and the standalone "New to systematic reviews?" strip were folded in (the
second hero CTA now points at the beginner guide); programmes and events became
typographic indexes rather than card grids.

1. **Hero** — full-bleed real photo (layered ink scrim). Eyebrow: "Systematic Reviews Network". H1 uses the two-weight move: thin **"Better evidence."** over black **"Smarter decisions."** Buttons: "Explore programmes" (green) + "What is a systematic review?" (ghost outline → beginner guide).
2. **Partner logo bar** — "Supported by / working with", greyscale.
3. **Impact band** — ink, photo-backed; **4 strongest** `StatCounter`s, white Archivo numbers (no gold), counters server-render real figures.
4. **About in one statement** — "Formerly ACSRM. Launched in 2022…" in bold Archivo + the paragraph + "Read the full story →" (ink, not green).
5. **Thread divider** — SRN's signature woven line, in hairline ink.
6. **What we do** — split statement (copy + photo), "All programmes".
7. **Programmes** — typographic index (`.index-row`), not cards: Training, Mentorship, Resources, Partnerships.
8. **Mentorship** — full-bleed feature photo with left/bottom scrim + "Learn more".
9. **Upcoming events** — next 3 as a typographic index + "All events".
10. **Testimonial** — leader quote over photo (ESI pattern).
11. **Resource library preview** — 3 `ResourceCard`s.
12. **Newsletter** — one email field, plain-language consent line.
13. **CTA band** — "Bring evidence synthesis training to your institution." One green button.

### Other public pages (structure fixed; copy from brief + Fortune)

- **About** — story (ACSRM → SRN, 2022 launch Rwanda/Nigeria, AuthorAID seed), mission/vision, values. Fix the current site's typos ("Passsion", "Diverty") — copy is re-written, never copied.
- **Programmes** (hub) — Beginner Academy · Practical Course · Mentorship Programme · Webinar Series · Institutional Training. Each: who it's for, format, duration, what you'll learn, CTA (register interest / apply / request training). Mentorship gets its own permanent subpage (not a blog post).
- **Resources** — category-filterable library: Beginner Guides, Templates, Recorded Webinars, Tool Guides, Publication Support. Beginner Guides are actual on-site articles (SEO), not just PDFs.
- **Impact** — full `ReachMap` · impact numbers · 2–3 short stories of change · testimonials · annual report downloads.
- **Team** — grouped: Executive · Scientific & Advisory Committee · Country Leads · Mentors & Facilitators. `PersonCard`s, consistent photo treatment (§7).
- **News & Events** — events list (upcoming/past toggle, type filter) + event detail (registration form or recording link when past) · news list + article page.
- **Partner with SRN** — partnership options (host a training / sponsor researchers / fund a cohort / co-create evidence) + Donate section + partnership contact form.
- **Contact** — form + email + socials.
- **Utility pages** — FAQ, Privacy, Terms (editable via `pages` table).

---

## 6. Data model (Supabase)

**Content** (staff-edited, public reads published rows only)

- `programmes` — id, title, slug (unique), programme_type (academy|course|mentorship|webinar|institutional_training|other), tagline, audience, format, duration, intro, body_rich, covers jsonb, for_who jsonb, featured_image_url, **icon_name** (text — see below), cta_label, cta_kind (apply|interest|partner|external), cta_url (nullable), sort_order, status (draft|published), created_at, updated_at. **Programmes are staff-managed content, never a hard-coded TypeScript list.** Events may optionally reference a programme; existing application text values must be backfilled safely before a programme foreign key becomes required.
  - `icon_name` exists because the current `Programme.icon` field in `lib/programmes.ts` is a **`LucideIcon` component reference**, which a database row cannot hold. Store the icon's *name* and map it through a fixed allowlist in code; an unrecognised value falls back to a default icon rather than crashing the page. Staff pick from that list — they never type a component name.
  - Retiring vs deleting: a programme referenced by any application is **archived, never hard-deleted**, so historic applications and CSV exports keep their meaning (§5.7).
- `events` — id, title, slug, description_rich, type (webinar|course|mentorship|workshop), starts_at, ends_at, location_type (online|in_person), location_or_link, registration_opens, registration_closes, capacity, banner_url, recording_url, status (draft|published), **price_kobo (int, nullable — null/0 = free), currency (NGN|USD, default NGN)** (§13.1), created_at
- `news` — id, title, slug, body_rich, excerpt, featured_image_url, author, published_at, status
- `team_members` — id, name, role, photo_url, bio, affiliation, linkedin_url, orcid_url, group (executive|scientific|country_lead|mentor), sort_order
- `resources` — id, title, description, category (guide|template|webinar|tool|publication), body_rich (nullable — used when the resource is an on-site article), file_url, external_url, thumbnail_url, created_at
- `impact_stats` — id, label, value, sort_order
- `reach_countries` — id, country_code, country_name, note _(drives the map — staff-editable)_
- `testimonials` — id, name, role, photo_url, quote, sort_order
- `partners` — id, name, logo_url, url, sort_order
- `homepage` — singleton: hero fields + per-section editable copy
- `pages` — id, slug, title, body_rich

**Submissions** (server-action writes only; staff read)

- `registrations` — id, event_id fk, full_name, email, institution, country, **payment_status (not_required|pending|paid|failed|expired|refunded), paystack_reference (unique, nullable), amount_kobo, currency, paid_at** (§13.2), created_at
- `donations` — id, amount_kobo, currency, donor_name (nullable — anonymous allowed), email, message, paystack_reference (unique), payment_status, created_at _(§13.5)_
- `applications` — id, programme, full_name, email, institution, country, motivation, status (received|under_review|accepted|waitlisted|rejected), internal_notes, created_at
- `newsletter_signups` — id, email, created_at
- `contact_messages` — id, name, email, subject, message, type (general|partnership), created_at

---

## 7. Images & media manifest

Photography is the credibility engine (see JBI). Three sources, in strict priority order:

**A. From Fortune (required — the launch gate):**

| Asset                                                   | Used in                             | Spec                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1 strong training/workshop photo                        | Homepage hero                       | landscape ≥2400px, people mid-activity, not posed                                                                              |
| 4–6 event photos (workshops, Zoom grids, presentations) | Programmes, Impact, CTA bands, news | ≥1600px; Zoom screenshots acceptable — the navy overlay (§3.3) unifies them                                                    |
| Team headshots, every listed member                     | Team                                | square ≥800px; mixed backgrounds fine — rendered greyscale-with-green-hover for consistency                                    |
| Partner/funder logos                                    | Logo bar, Partner page              | SVG or transparent PNG                                                                                                         |
| Real impact numbers + country list                      | Impact strip, ReachMap              | numbers Fortune will stand behind publicly                                                                                     |
| Logo **vector** (SVG/AI/EPS)                            | Everywhere                          | confirmed keeping current logo; vector needed so exact hexes are sampled in Sprint 1.1 — the JPG won't cut it for a crisp site |

**B. Stock (Unsplash/Pexels), texture only:** abstract research/library/African university imagery for secondary section backgrounds — always under the navy overlay, never depicting "fake SRN people" doing SRN's work.

**C. AI-generated, decoration only:** abstract patterns or iconographic illustration if needed. **Never** generated photorealistic people or fake events — an evidence organisation must not illustrate itself with synthetic evidence. This is a hard rule.

All raster images through `next/image`, dimensions set, WebP/AVIF, lazy below the fold, descriptive alt text.

---

## 8. Admin (`/admin`) specs

Roles via Supabase Auth: **admin** (all + user management) · **editor** (content + submissions, no settings/users).

- **Dashboard** — counts: upcoming events, registrations this month, pending applications, drafts.
- **Content CRUD** for every §6 content table: list → edit form; draft/publish toggle; drag-reorder where sort_order exists; slug auto-generated, editable; rich text via a clean editor (Tiptap); image fields pick from **Media library** (Supabase Storage: upload, browse, reuse, alt text stored).
- **Registrations** — per-event table (name, email, institution, country, date), count vs capacity, filter/search, **CSV export**, manual close toggle.
- **Applications** — filterable list, detail view, status workflow (received → under_review → accepted/waitlisted/rejected) as `StatusBadge` steps, internal notes, CSV export.
- **Newsletter & Contact** — view + CSV export.
- Admin uses the same design tokens: this is part of the design deliverable, not an afterthought. Plain-language empty states and errors per §4 writing rules.

- **Programmes & Academy** — a dedicated collection, not a source-code file. Staff can add, edit, reorder, draft, publish and retire any programme (including a new Academy), set its programme type, audience, format, duration, learning outcomes, CTA, feature image and related events/resources. The Programme hub and every programme detail page read this data. A programme must not be hard-deleted while applications reference it; retire/archive it instead.
- **Safe media embeds** — rich text may insert a structured `embed` block for an approved YouTube/Vimeo video or a Zoom recording/link. Staff paste a normal URL; the server parses and allowlists the host and stores a normalised provider/id, never raw iframe or arbitrary HTML. YouTube embeds use the privacy-enhanced domain and a title; Zoom live meetings and any access-controlled recording stay as a labelled external button/link, never an iframe or a password-bearing URL in public content. Every embed needs a meaningful title and must render accessibly with a no-JavaScript fallback link.
- **Admin visual quality is a delivery requirement.** It uses the same §3 palette, Archivo/Inter typography, sharp-cornered panels, hairline rules, focus treatment and buttons as the public site, and must feel like SRN rather than a default database dashboard. **Density is where it deliberately differs:** the public pages are read top-to-bottom and use `--spacing-section` (6rem) to breathe; the admin is scanned and operated for an hour at a time, so it uses a tighter vertical rhythm and a compact type scale. A list showing eight events must not take three screens. Use real content thumbnails and concise previews where they help staff recognise an item; do not add decorative hero photos, oversized headings, or public-site-style section spacing that pushes work below the fold.

**Admin scope boundary (decided 2026-07-25, revised after review).** The admin manages **content**, not **site design**. This is not a mini-WordPress and staff must not be able to restructure the site from it.

The test is not "how often does this change" but: **does this describe SRN, or does it describe the website?**

| Describes SRN → **in admin** | Describes the website → **stays in code** |
| --- | --- |
| Programmes & Academy, courses | Homepage layout and copy blocks |
| Events | Site pages (About, FAQ, Privacy, Terms) |
| News & articles | Navigation, section ordering |
| Team members | Impact counters (`impact_stats`) |
| Resources | Countries reached (`reach_countries`) |
| Testimonials, partners | The visual system itself |
| Media library | |

**Removed from the admin** (they were exposed at the top level by the Sprint 5.2 sidebar, before this boundary was agreed): `homepage`, `pages`, `impact_stats`, `reach_countries`. These are layout and presentation; they belong in version control where a change is reviewable and revertible.

**Kept, with reasoning**, because the first review round proposed cutting them:

- **Team members** — people join and leave SRN. Locking this in code makes every new hire a developer ticket. It describes the organisation, not the website.
- **Testimonials and partners** — these grow as SRN grows, and each is a piece of evidence about the organisation, not a design element.
- **Drag-reorder** — kept only for `team_members` and `partners`, and only because without it, display order is insert order: the Director ends up below a country lead by accident. This is one ordering control, not a page builder. It is not offered anywhere else.

Scope discipline: this list **is** v1. No analytics dashboards, no certificate generation, no member management.

---

## 9. Phases & sprints (expanded)

> **Standing rules for every sprint:** work on a branch · lint + typecheck + `next build` must pass clean · self-review against the §3.5 quality floor · check every "Done when" before calling it complete · placeholder content is always literally marked `[PLACEHOLDER]` · never invent scope beyond this doc (open questions go to §12, not into code).

---

### Phase 0 — Foundations

**Phase goal:** a deployed skeleton with tokens, schema, and realistic seed data, so every later sprint builds against something real.

**Sprint 0.1 — Project setup**

- _Goal:_ Next.js project standing on Vercel with the design tokens live.
- _Build:_
  - Next.js (App Router, TypeScript, strict), Tailwind configured with every §3.1 token + type scale + spacing from §3.3.
  - `next/font`: display + body faces wired into Tailwind font families. (Historical: this began as Fraunces+Inter, then Inter-only; the shipped pairing is **Archivo + Inter** per the revised §3.2.)
  - Lucide installed; icon wrapper component enforcing 1.5px stroke + brand colors.
  - Repo structure: `app/(site)/`, `app/admin/`, `app/api/`, `components/ui/`, `components/site/`, `components/admin/`, `lib/` (supabase clients, validation, utils), `emails/` (React Email), `supabase/` (migrations, seed).
  - `/styleguide` route rendering: full palette swatches with hex labels, type scale specimens, spacing scale, buttons in all variants/states.
  - Prettier + ESLint, `.env.example` with every §11 var commented.
- _Done when:_ deployed to Vercel; `/styleguide` shows palette, type, buttons; build is clean.

**Sprint 0.2 — Supabase schema**

- _Goal:_ the full §6 data model, migrated and typed.
- _Build:_
  - Supabase project; SQL migrations for every §6 table exactly as specified (names, enums as Postgres types, timestamps default `now()`).
  - Storage buckets `media` (public read) and `resources` (public read).
  - Generated TypeScript types committed; two clients in `lib/`: browser (anon) and server (service role, never imported into client components).
  - **Build note (verified 2026-07-24):** the `server-only` package does **not** fail the build under Next 16 + Turbopack — a `"use client"` module importing the service-role client compiled cleanly (the key was correctly stripped from the browser bundle, but silently). The guard is therefore an **ESLint `no-restricted-syntax` rule** that errors on any `"use client"` file importing `lib/supabase/server`. Verified to fire on a client component and to stay silent for server actions and server components. Do not remove it in favour of `server-only` alone.
  - **Type generation:** `supabase gen types --project-id` requires a dashboard access token unavailable in this environment, so types are generated by introspecting the live schema over the pooler: `npm run gen:types` (`supabase/gen-types.mjs`). Migrations run via `npm run db:migrate` (`supabase/migrate.mjs`), tracked in a `_migrations` table and transactional per file.
  - Indexes: `events(status, starts_at)`, `news(status, published_at)`, `registrations(event_id)`, slugs unique.
- _Done when:_ fresh migration run succeeds on a clean project; typed queries compile; buckets exist.

**Sprint 0.3 — Content gate (Fortune)**

- _Goal:_ Fortune knows exactly what to supply; launch is formally blocked on it.
- _Build:_ a one-page checklist document (from §7A + §12 open answers): hero photo, 4–6 event photos, all headshots, partner logos, logo vector, impact numbers, country list, programme details, 2–3 testimonials with permission, annual report PDFs if any. Written in plain language, with the photo specs translated simply ("wide photo, at least 2400px across, people mid-activity").
- _Done when:_ checklist delivered to Fortune; tracked as the launch blocker for Sprint 8.1.

**Sprint 0.4 — Seed data**

- _Goal:_ the site is never developed against empty tables.
- _Build:_ idempotent seed script (`supabase/seed.ts`): 6 events (mix of types, past/upcoming, one at capacity, one closed), 4 news posts, 12 team members across all four groups, 10 resources across all categories (2 as on-site articles with real-length rich text), 6 impact stats, 8 reach countries, 3 testimonials, 5 partners, homepage singleton, FAQ/Privacy/Terms pages. Every title/name prefixed `[PLACEHOLDER]`. Placeholder images: solid `--mist` blocks with dimension labels — not stock, so nothing fake can accidentally ship.
- _Done when:_ clean clone + migrate + seed = fully populated local site; seed re-runs without duplicating.

---

### Phase 1 — Design system & shell

**Phase goal:** every visual decision made once, in components, before any page exists.

**Sprint 1.1 — Component kit**

- _Goal:_ all of §4, built against seed data, reviewable on `/styleguide`.
- _Build:_
  - Sample exact brand hexes from the logo vector; update tokens if they differ from §3.1 estimates; note final values in this doc's §3.1.
  - Every §4 component with all states: default, hover, focus-visible, disabled, empty, error. `StatCounter` server-renders the number; IntersectionObserver animation only enhances. `ReachMap`: static inline SVG, Africa-centered equirectangular world, dots driven by props, hover tooltips, keyboard-focusable dots, and a visually-hidden country list fallback.
  - Category tag hues per §3.1 (one mark color each, tinted background + dark text).
  - Form fields with error/success writing per §4 rules.
- _Done when:_ `/styleguide` shows every component in every state; all interactive components pass keyboard navigation; reduced-motion verified by toggling the OS setting.

**Sprint 1.2 — Shell**

- _Goal:_ nav, footer, and page chrome, responsive and accessible.
- _Build:_
  - Header: logo left, nav center/right, "Partner with SRN" as the single highlighted item. Sticky, white, hairline bottom border on scroll. Mobile: full-screen sheet, focus-trapped, closes on route change.
  - Footer on `--brand`: contact block, nav links, socials, policies, newsletter mini-form (wired later, disabled state now).
  - Layout primitives: `Section` (paper/mist/ink variants, §3.3 padding), `Container` (1200px), `Prose` (720px, 68ch).
  - Default metadata, OG template, favicon from the mark, 404/500 pages written per §4 voice ("This page doesn't exist. Try the homepage or search the resources library.").
- _Done when:_ shell responsive 360→1440px with no horizontal scroll; tab order sane; sheet menu traps focus.

---

### Phase 2 — Public site

**Phase goal:** every public page, pixel-disciplined, from Supabase data. All reads via server components; content pages ISR (revalidate 60s).

**Sprint 2.1 — Homepage**

- _Build:_ the homepage sections in the revised §5 order (ESI-informed rebuild, 2026-07-24). Data: homepage singleton, impact_stats (4 strongest), partners, events (next 3 published upcoming), testimonials (first), resources (3 latest). Hero photo with layered ink scrim.
- _Done when:_ matches the revised §5 section-by-section; counters show real numbers with JS disabled; Lighthouse ≥90 (perf/a11y/SEO) on deployed preview at mobile + desktop. **Status: shipped + redesigned.**

**Sprint 2.2 — About, Team, Contact**

- _Build:_ About from `pages` content with story/mission/values layout; Team grouped by the four §6 groups with `sort_order`, `PersonCard` photos greyscale→color-tint on hover; Contact page with form (name, email, subject, message) posting to a stubbed server action (wired for real in 4.3), plus email + socials.
- _Done when:_ team ordering controllable from data alone; contact form validates client + server side with §4 voice errors.

**Sprint 2.3 — Programmes hub + subpages**

- _Build:_ hub page with the five programmes as rich cards; a subpage per programme (Beginner Academy, Practical Course, Mentorship, Webinar Series, Institutional Training), each: who it's for, format, duration, what you'll learn, and the correct CTA — register interest (→ application form, Phase 4), apply (→ application form), or request training (→ partnership contact). Mentorship page is permanent and linkable (`/programmes/mentorship`).
- _Done when:_ every programme page complete per §5; CTAs route correctly (to stubs where Phase 4 lands later).

**Sprint 2.4 — Resources library**

- _Build:_ filterable grid (category filter in the URL query, shareable/back-button friendly); `ResourceCard` linking to file, external URL, or on-site article page (`/resources/[slug]`) when `body_rich` exists; article pages in `Prose` styling.
- _Done when:_ filters URL-driven; article pages render seeded rich text correctly (headings, lists, links, images).

**Sprint 2.5 — Impact**

- _Build:_ full-width `ReachMap` from `reach_countries`; stats row; 2–3 stories of change (from `news` tagged or `pages` content — use a simple `pages` slug convention `impact-story-*`); testimonial blocks; annual report downloads from `resources` category filter.
- _Done when:_ map data-driven and keyboard-accessible with the list fallback; page reads correctly with zero JS.

**Sprint 2.6 — News & Events**

- _Build:_ events list with upcoming/past toggle + type filter (URL-driven); event detail: hero, description, date/location block, and a **registration state machine** — `open` (form area, Phase 4), `not_yet_open`, `closed`, `full`, `past` (shows recording link if present). News list + article pages.
- _Done when:_ every registration state renders correctly against seed events crafted for each state; past/upcoming logic correct across timezones (store UTC, display Africa/Lagos).

**Sprint 2.7 — Partner with SRN + utility pages**

- _Build:_ partnership options as cards (host a training / sponsor researchers / fund a cohort / co-create), Donate section per §12 answer, partnership form (type=partnership); FAQ (accordion, accessible disclosure pattern), Privacy, Terms from `pages`.
- _Done when:_ partnership form typed correctly; FAQ keyboard-operable; all utility pages editable from data.

---

### Phase 3 — Data security & form infrastructure

**Phase goal:** the layer that must not be wrong. Specified tightly; test it like an adversary.

**Sprint 3.1 — RLS + server actions**

- _Build:_
  - RLS enabled on **every** table. Content tables: public `select` where `status = 'published'` (tables without status: public `select true`); insert/update/delete require authenticated staff. Submission tables (`registrations`, `applications`, `newsletter_signups`, `contact_messages`): **no anon policies at all** — anon can neither read nor write.
  - All public form writes go through server actions in `lib/actions/`, using the service-role client, each with a zod schema (§6 fields exactly), normalized errors.
  - An automated test (Vitest) using the anon key that asserts: cannot select from any submission table; cannot insert/update/delete anywhere; can select published content; cannot select drafts.
- _Done when:_ the adversarial test suite passes and is wired into CI (`npm test` gate).

**Sprint 3.2 — Abuse protection**

- _Build:_ honeypot field (visually hidden, name like `website`) on every public form, silently dropping on fill; per-IP rate limiting (Upstash Redis or Vercel KV — pick one, document in §11) at 5 submissions/hour/form; server-side length caps; suspicious-burst logging.
- _Done when:_ scripted burst is demonstrably blocked; honeypot submissions vanish without user-visible error; legit flow unaffected.

---

### Phase 4 — Registration & applications

**Phase goal:** the interactive core. A few hundred submissions/month flow through this.

**Sprint 4.1 — Event registration**

- _Build:_
  - Registration form on event detail (full_name, email, institution, country — country as a searchable select), server action performing atomically: event published? window open? capacity remaining? email already registered for this event (unique index on `event_id + lower(email)`, graceful "You're already registered — check your email" on conflict)?
  - On success: insert + Resend confirmation via a branded React Email template (logo, event name, date with timezone, location/link, "add to calendar" .ics attachment).
  - The five §2.6 registration states now fully live.
- _Done when:_ happy path + full + closed + duplicate + invalid all tested; confirmation renders correctly in Gmail web + mobile; .ics opens in Google Calendar.

**Sprint 4.2 — Applications**

- _Build:_ application form (programme select, §6 fields, motivation textarea with counter, 2000 char cap), server action, status `received`, confirmation email ("what happens next" copy).
- _Done when:_ application lands with correct status; email delivered; form recovers gracefully from validation errors without losing input.

**Sprint 4.3 — Newsletter + contact wiring**

- _Build:_ newsletter signup (footer + homepage): dedupe by lower(email), friendly "You're on the list" including when already subscribed; contact + partnership forms wired for real: store + forward via Resend to SRN's inbox with reply-to set to the sender.
- _Done when:_ signups deduped; contact messages arrive in a test inbox with working reply-to.

**Phase 4 delivery note (2026-07-25).** All three sprints shipped, plus the §13
payment path. Two things are code-complete but cannot be exercised until
credentials land, and both fail *honestly* rather than faking success:

- **Paystack** (`PAYSTACK_SECRET_KEY` etc. are empty). Initialize, hosted-
  checkout redirect, server-side verify, HMAC-SHA512 webhook, and the 30-minute
  pending-expiry cron are all written to the live REST contract. `isConfigured()`
  gates every paid path: until keys are set, a paid registration or donation
  returns "payment is being switched on — email us" instead of a dead checkout.
  Signature rejection is tested and verified against forged requests (401, no
  DB write). Two signing tests self-skip until a key exists, then run.
- **Resend domain** is unverified until Sprint 8.3, so `RESEND_FROM` must point
  at the sandbox sender for now (see §11). Transport itself is verified working.

Test gate is now `npm test` → 85 passing / 2 skipped across RLS, Paystack
signature + .ics, and action-schema/DB-invariant suites.

---

### Phase 5 — Admin

**Phase goal:** a non-technical staffer runs the whole site from `/admin` without help.

**Sprint 5.1 — Auth & gating**

- _Build:_ Supabase Auth email+password, invite-only (no public signup); `profiles` table with `role` (admin|editor); middleware protecting `/admin/*`; role checks server-side on every mutation, not just UI hiding; login page on brand; sign-out.
- _Done when:_ anon → login redirect; editor cannot reach user management by URL; sessions survive refresh.

**Sprint 5.2 — Content CRUD + media library**

- _Build:_
  - Admin shell: sidebar (Dashboard, Events, News, Team, Resources, Impact, Testimonials, Partners, Homepage, Pages, Submissions, Media, Users[admin]), same tokens as the site.
  - Dashboard: upcoming events, registrations this month, pending applications, drafts.
  - For each content table: list view (status chip, updated_at, search) → edit form. Slug auto from title, editable, uniqueness-checked. Draft/publish toggle. Drag-reorder where `sort_order` exists. Rich text via Tiptap (headings, bold/italic, lists, links, images from media library, blockquote — nothing more). Delete = soft confirm dialog naming the item.
  - Media library: upload to Storage, browse grid, search by filename, alt text stored and required on insert, "copy into field" picker used by every image field.
- _Done when:_ a staffer can create → publish an event and a news post end-to-end, images from the library, without touching code; ISR revalidation makes it live within 60s.

**Sprint 5.3 — Registrations & submissions views**

- _Build:_ per-event registrations table (name, email, institution, country, registered_at), live count vs capacity with a progress bar, manual "close registration" toggle on the event; global submissions search; newsletter + contact views; **CSV export** on every table — UTF-8 with BOM so Excel opens it clean, filename `srn-{table}-{date}.csv`.
- _Done when:_ CSV opens correctly in Excel with Nigerian names/diacritics intact; filters compose (event + date range + search).

**Sprint 5.4 — Application workflow**

- _Build:_ applications list (filter by programme + status), detail view with full application, status stepper (received → under_review → accepted/waitlisted/rejected) with confirm on transition, internal notes (append-only, author + timestamp), CSV export.
- _Done when:_ full workflow drivable from UI; notes attributable; status history visible via updated_at + notes.

---

#### Delivery status & sprint ordering (recorded 2026-07-25)

**Built and verified:** 5.1 (auth, middleware gating, invite-only accounts,
session survival, open-redirect guard) and 5.2 (resource registry, generic CRUD
for eleven tables, Tiptap, media library, users page). 5.3 and 5.4 are specified
but not built; they are delivered by Sprint 5.6 below.

**Sprints 5.5–5.9 replace an earlier single "5.5" that bundled five unrelated
workstreams** — defect fixes, submissions, applications, programmes, embeds and
a visual pass — into one item. They were split because they differ in size, risk
and urgency, and because 5.3/5.4 were already specified to the file path and
should not be re-planned by absorption into a larger bundle.

Recommended order, and why:

| # | Sprint | Why here |
| --- | --- | --- |
| 5.5 | Live-site defect sweep | Minutes of work on **currently shipping** defects. Never queue these behind features. |
| 5.6 | Operations workspace | Already fully specified; it is the **weekly** work (attendee lists, application review). |
| 5.7 | Programmes as content | Large and structural, but a **quarterly** need. Correctness of the migration matters more than speed. |
| 5.8 | Safe embeds | Depends on the rich-text editor being stable; security-sensitive, wants its own attention. |
| 5.9 | Scope narrowing & UX pass | Narrowing scope over routes that don't exist yet would be re-work, so it follows the routes. |
| 5.10 | Staff self-service & notifications | Small but high-frequency pain; safe to run in parallel with 5.9 if capacity allows. |
| 5.11 | Participant communication | Contains the unsubscribe compliance item — **must land before any newsletter campaign is sent.** |
| 5.12 | Data safety | Guards data created by everything above; the cascade-delete exposure exists **today**, so pull it earlier if events are being deleted in anger. |

Two ordering claims worth stating plainly:

1. **Do not let 5.7 jump the queue over 5.6.** Programmes-as-content is the more
   interesting problem, but Fortune's staff export an attendee list every week
   and launch an Academy every few months. Build the thing they touch most often.
2. **5.11's unsubscribe is a gate, not a feature.** No newsletter campaign goes
   out until it exists.

The Academy was briefly scoped here as a courses-and-cohorts sprint, then moved
out entirely: it is **Phase 7**, a full learning platform, not an admin feature.
Phase 5 stops at programmes-as-content (5.7), which is the foundation Phase 7
builds on.

Sprints 5.10–5.12 came out of a functionality review on 2026-07-25 that asked
"what is missing that nobody has noticed." The three findings that were genuinely
invisible until then, all recorded above: `newsletter_signups` has no unsubscribe
mechanism at all; `registrations.event_id` cascades on delete so removing an
event silently destroys its registrations; and `admin_audit` has been collecting
a full mutation history since 5.1 that no screen has ever displayed.

---

**Sprint 5.5 — Live-site defect sweep**

Small, unglamorous, and first. These are shipped-site defects found in the
2026-07-25 audit, not new features. They are separated out because bundling a
one-line component swap into a feature phase is how small bugs become permanent.

- _Build:_
  - Homepage newsletter block (`app/(site)/page.tsx`, §11 strip) renders a
    hard-coded `disabled` input and button — a Phase 4 leftover. Replace with the
    working `<NewsletterForm />` already live in the footer, or remove the strip.
    A visibly dead form on the homepage reads as a broken site.
  - Four `href="#"` placeholder social links (`components/site/Footer.tsx`,
    `app/(site)/contact/page.tsx`). Either point them at SRN's real LinkedIn/X
    profiles or remove the marks entirely. Placeholder hrefs violate the standing
    §7 no-placeholder rule and were missed because `grep "PLACEHOLDER"` doesn't
    catch `#`.
  - Re-run the public sweep afterwards to confirm nothing else ships a dead
    control.
- _Done when:_ no disabled-looking form and no `href="#"` anywhere in
  `app/` or `components/`; the homepage newsletter accepts a real signup.

**Sprint 5.6 — Operations workspace (registrations, submissions, applications)**

This is Sprints 5.3 and 5.4 delivered as one coherent area, since they share
filters, CSV plumbing and navigation. **The 5.3/5.4 specs above are unchanged and
remain the authority** — they are already specified to the file path (the CSV
injection guard, the atomic notes RPC, the transition map, the date-boundary
off-by-one). This sprint is the packaging, not a re-plan.

Sequencing note: this lands **before** programmes-as-content (5.7) deliberately.
Exporting an attendee list and reviewing applications is *weekly* work for
Fortune's staff; launching a new Academy is *quarterly*. Build the weekly thing
first.

- _Build:_ everything in Sprints 5.3 and 5.4, plus a single `Operations` nav
  section grouping Registrations, Applications, Newsletter, Contact and
  Donations, so the sidebar gains one item rather than five.
- _Done when:_ both 5.3 and 5.4 "done when" conditions hold, and no operations
  route is reachable from the sidebar before it works.

**Sprint 5.7 — Programmes & Academy as managed content**

The largest item, and a genuine design correction: `lib/programmes.ts` is a
hard-coded TypeScript array, so launching a new Academy is currently a code
change and a deploy. That is indefensible for SRN's core offering.

- _Build:_
  - Create the `programmes` table per §6 and migrate all five existing entries,
    **preserving the current slugs exactly** (`beginner-academy`,
    `practical-course`, `mentorship`, `webinar-series`,
    `institutional-training`) so no public URL breaks and no inbound link dies.
  - Rebuild the six consumers to read published rows: the homepage index,
    `/programmes`, `/programmes/[slug]`, `/programmes/mentorship`,
    `/programmes/apply`, and `lib/actions/application.ts`.
  - Add, edit, draft, publish, reorder and retire controls. A new Academy is a
    new row, not a developer task.
  - Optional programme↔event relationship, so an event can name the programme it
    belongs to.
- _Three constraints that must be designed for, not discovered:_
  1. **`Programme.icon` is a `LucideIcon` component reference.** A database row
     cannot store a React component. Replace it with a stored icon *name* mapped
     through a fixed allowlist in code (`GraduationCap | Users | BookOpen |
     Presentation | Building2 | …`). Do not store arbitrary component names, and
     do not let an unknown value crash the page — fall back to a default icon.
  2. **`lib/actions/application.ts` validates against `PROGRAMMES.map(p => p.title)`.**
     Moving programmes to the database moves the validation boundary of a **live
     public form**. The validation must switch to a query against published
     programmes, and must keep accepting a submission whose programme was
     retired between page load and submit — reject the *unknown*, not the *retired*.
  3. **`applications.programme` is a `text` column holding the title string.**
     Renaming a programme silently orphans every historic application from its
     label. Add a nullable `programme_id` FK for new rows and keep the text as a
     historic snapshot; never rewrite stored application text. A programme with
     applications is **retired, never hard-deleted** — enforce that in the
     delete action, with a plain-language refusal naming the count.
- _Done when:_ Fortune creates and publishes a new Academy from `/admin`, it
  appears on the homepage and the hub, its detail page renders at its own URL,
  and an application against it records correctly — with every pre-existing
  programme URL still resolving.

**Sprint 5.8 — Safe media embeds**

- _Build:_ a structured `embed` node in the rich text editor per §8. Staff paste
  an ordinary URL; the **server** parses it, allowlists the host, and stores a
  normalised `{provider, id, title}` — never raw HTML, never an iframe from user
  input. YouTube uses the privacy-enhanced domain (`youtube-nocookie.com`).
  Every embed requires a title and renders a no-JavaScript fallback link.
- _Security floor (non-negotiable):_ **a live Zoom meeting link is not public
  content.** Anyone who finds the page can join the session. Recordings may be
  embedded or linked; live meeting joins render as a labelled external link only,
  are never iframed, and any URL carrying a password or passcode parameter is
  rejected at the server with a plain-language error explaining why. This is the
  same posture as the §13.4 webhook: validate on the server, never trust what
  arrived from the client.
- _Done when:_ a YouTube recording embeds and plays; a pasted `<iframe>`, a
  non-allowlisted host, and a password-bearing Zoom URL are each refused with a
  clear reason; embeds render accessibly with JS disabled.

**Sprint 5.9 — Admin scope narrowing & UX pass**

The Sprint 5.2 sidebar exposed every content table at the top level, including
the six that govern how the site *presents* itself. The scope boundary in §8 was
agreed after that was built; this sprint makes the code match the decision.

- _Build:_
  - Apply the §8 admin scope boundary. **Remove** `homepage`, `pages`,
    `impact_stats` and `reach_countries` from the admin entirely — routes,
    registry entries and nav. They are layout, not content, and they return to
    code. Removing the route matters as much as removing the link: a deleted nav
    item that still resolves by URL is not a removed feature.
  - Keep Programmes, Events, News, Team, Resources, Testimonials, Partners and
    Media. Drag-reorder stays only on `team_members` and `partners`.
  - The UX pass: real hierarchy, content thumbnails and previews so staff
    recognise an item without opening it, plain-language empty states, and a
    genuine responsive treatment.
  - Visual review at desktop **and 360px** against the §3 tokens.
- _Design note:_ "match the public site" means palette, type, sharp corners,
  hairline rules and focus treatment — **not** its spacing rhythm. See the
  density note in §8. An admin that looks like the homepage is a worse tool than
  one that looks like a well-built admin.
- _Done when:_ an **editor** signing in sees only content they are meant to
  touch, and a removed route 404s rather than rendering; every list is
  scannable without horizontal scroll at 360px; nothing renders default,
  unstyled, or empty-without-explanation.

**Sprint 5.10 — Staff self-service & notifications**

Gaps that will bite in the first week of real use. None are large; all are the
difference between a system staff can run and one that needs a developer.

- _Build:_
  - **Password reset.** Staff request a reset link from the login page and set a
    new password themselves. Today the only route is the CLI or the Supabase
    dashboard — the first forgotten password becomes a support call.
  - **Change your own password** from within the admin.
  - **Submission notifications.** A new application, registration, contact
    message or donation currently lands silently in the database. Send a
    notification to SRN's inbox on arrival, plus a **daily digest** ("3 new
    applications, 12 registrations") so nothing waits on someone remembering to
    look.
  - **"Who changed this."** Every mutation already writes to `admin_audit`
    (built in 5.1) and **nothing displays it**. Surface the last edits on the
    dashboard and a per-item history on each edit form. The data is already
    there; this is a read view.
  - **Search across content** — one box, all collections. Fine at twenty events,
    necessary at two hundred.
- _Done when:_ a staffer resets their own password without help; a new
  application produces a notification; the dashboard shows who changed what and
  when.

**Sprint 5.11 — Participant communication & lifecycle**

Everything here is about the people on the other side of the form. Several are
compliance matters, not conveniences.

- _Build:_
  - **Newsletter unsubscribe.** `newsletter_signups` has **no unsubscribe token
    and no unsubscribed flag** — there is currently no way for anyone to opt out.
    Sending campaigns in that state is a legal problem in most jurisdictions, not
    a missing nicety. Add a token, a one-click unsubscribe route, and an
    `unsubscribed_at` column; exports must exclude unsubscribed addresses.
  - **Email the people who registered.** Venue changes and links move. Fortune
    currently has no way to reach an attendee list except exporting to Excel and
    pasting into Gmail. Provide at minimum a "copy all email addresses" control,
    and preferably a compose-and-send to one event's confirmed registrants.
  - **Event reminders.** Someone registering in March for a June workshop hears
    nothing until it starts. Send a reminder ahead of the event — highest-value,
    lowest-effort email SRN can send.
  - **Application outcome emails.** Accepting someone currently changes a status
    in a database and the applicant never hears. Send on transition to
    accepted/waitlisted/rejected, with the message reviewable before it goes.
    (Explicitly deferred in 5.4; this is where it lands.)
  - **Attendance marking.** Registered ≠ attended, and SRN's impact numbers
    depend on the difference. A simple present/absent toggle per registration.
- _Done when:_ an unsubscribe link works end to end and unsubscribed addresses
  never appear in an export; an accepted applicant receives an email; attendance
  is recordable per event.

**Sprint 5.12 — Data safety**

Small sprint, real consequences. Written up because the current behaviour is
silent and destructive.

- _Build:_
  - **`registrations.event_id` is `on delete cascade`.** Deleting an event today
    permanently destroys every registration attached to it, with no warning and
    no recovery. Same exposure on any future cohort/application relationship.
    Fix: refuse to delete an event that has registrations — offer **archive**
    instead — and make the confirm dialog state the count explicitly ("This
    event has 47 registrations. Deleting removes them permanently.").
  - **Archive rather than delete** across events, programmes, courses and
    cohorts: content with participant data attached is retired, never destroyed.
  - **Cancellations and refunds.** A paid registrant who cannot attend has no
    path today; the refund happens in Paystack with no record on the site. Record
    a cancellation, reflect it in seat counts, and mark refunded registrations
    so exports and capacity stay honest.
- _Done when:_ deleting an event with registrations is impossible without an
  explicit archive step; a refunded registration frees its seat and is visible
  as refunded in exports.

---

### Phase 6 — SRN Academy (learning platform)

**Swapped with Phase 8 on 2026-07-25.** This phase was Phase 8; see the note
below for why. Phase numbers are execution order in this document — when the
order changes, the numbers move with it rather than carrying a footnote
explaining why they don't match.

**Phase goal:** SRN stops *advertising* training and starts *delivering* it.
A learner signs up, enrols in a cohort, works through lessons at their own pace,
submits assignments, and finishes with a certificate — without leaving the site.

**This is a second product, not a feature** — more surface area than any single
phase so far, and the first to store data a user logs in and reads back.
Building it right after Phase 5 (rather than waiting behind Launch) is a
deliberate choice: SRN has real cohorts and a working admin today, and the
fastest way to build the wrong LMS is to let it drift further behind still more
phases before anyone tests it against a real course.

**On build vs. buy:** the obvious alternative is a hosted LMS (Teachable,
Thinkific) or self-hosted Moodle. That trade is normally decided on build cost,
but this project's actual delivery rate makes "it's faster to buy" a much weaker
argument than the industry default suggests — Phases 3, 4 and most of 5 each
landed in hours, not weeks. The real arguments for building are that the
credential is SRN-branded and SRN-verified (§6.7), the learner data lives in
SRN's own database for funder reporting (§6.8), and the Academy sits inside the
site rather than on a third-party subdomain. The real argument for buying is that
a hosted LMS has already solved quiz edge cases, SCORM, and mobile playback.
**Recommendation: build**, but keep 6.2 (courses & cohorts) shippable on its own,
so the catalogue and SEO value exist even if the rest is deferred.

**The decision that drives everything:** the Academy needs **end-user accounts**.
Until now, every public interaction has been anonymous (Design.md §1: "anonymous
public submissions, no end-user accounts"). That constraint ends here. Learner
accounts were previously listed as post-launch Phase 2.1; they move into 6.1
because nothing else in this phase can exist without them.

**Sprint 6.1 — Learner accounts**

- _Build:_ public sign-up (this is the first public auth surface on the site —
  staff `/admin` auth stays entirely separate), email verification, password
  reset, learner profile (name, country, institution, ORCID), `/account`
  dashboard. A `learners` table distinct from `profiles`; a learner is **never**
  staff and must not be able to reach `/admin` by any path.
- _Security floor:_ RLS on every learner-owned table so a learner reads their own
  rows and nobody else's. This is the first time the site stores personal data a
  user can log in and read back, so the anon key must be provably unable to read
  another learner's enrolment, submission, or grade. Adversarial test suite in
  the style of `tests/rls.test.ts`.
- _Also in scope (decision 5):_ `learners.verified_at` as the trust boundary,
  `registrations.learner_id` (nullable FK, `on delete restrict`), and the
  **verified-email backfill** — on verification, prior registrations on that
  exact address link to the learner. The event form keeps taking name + email
  with no verification step and creates an unverified learner row; course
  enrolment requires a verified one. `email` stays a snapshot and is never
  rewritten by a profile edit.
- _Done when:_ a learner signs up, verifies, signs in, edits their profile, and
  cannot see another learner's data or reach any `/admin` route; a person who
  registered for an event *before* signing up sees that registration in
  `/account` once they verify the same address; and an **unverified** row —
  created by typing any address into the event form — opens no enrolment, no
  materials, and no other person's registration history.

**Sprint 6.2 — Courses & cohorts**

The catalogue layer, built on 5.7's `programmes`.

- _Schema:_ `courses` (programme_id FK, title, slug, summary, body_rich, level,
  delivery, duration_label, learning_outcomes jsonb, prerequisites,
  featured_image_url, sort_order, status) · `cohorts` (course_id FK, label,
  starts_on, ends_on, enrolment_opens, enrolment_closes, capacity, price_kobo,
  currency, status, **`pacing`**). `pacing` is `'self_paced' | 'cohort_paced'`
  (decision 1) and gates the date-driven behaviour in 6.3, 6.5 and 6.6.
  `price_kobo = 0` is the free tier (decision 4) — no separate free-course
  concept; a free enrolment goes active with `payment_status='not_required'`.
- _Build:_ admin CRUD nested Programme → Course → Cohort, not three flat lists.
  Public course pages at `/academy/[course]` showing the open cohort. **Duplicate
  a cohort** — SRN runs the same course every term and must not retype a
  syllabus. Reuse the existing state machine in `lib/events.ts` for cohort
  open/closed/full rather than writing a second one.
- _Done when:_ Fortune creates a course, opens a cohort with dates and capacity,
  and it appears publicly with a working enrol route; last term's cohort remains
  as history.

**Sprint 6.3 — Curriculum & materials**

- _Schema:_ `modules` (cohort or course scoped, title, summary, sort_order,
  release_rule) · `lessons` (module_id FK, title, body_rich, video embed,
  attachments, estimated_minutes, sort_order, status).
- _Build:_ a curriculum builder in the admin — drag-order modules and lessons,
  attach readings and slides from the media library, embed video using the safe
  embed system from 5.8 (no raw iframes, ever). Optional **drip release**: a
  module unlocks on a date or after the previous one is complete. Drip applies
  **only to a cohort-paced cohort** (decision 1) — in a self-paced cohort
  `release_rule` is ignored entirely and every module is open from enrolment.
  Both paths must be tested; a self-paced learner must never hit a locked module.
- _Storage note:_ course materials are **not** public like `media`. A private
  bucket with signed URLs, so a paid course's slides aren't a guessable public
  link. This is a genuinely different storage posture from everything built so
  far and should not be bolted onto the `media` bucket. Because access outlives
  the cohort (decision 3), signed URLs are issued on demand **for as long as the
  enrolment exists** — the check is "is there an enrolment", never "is the cohort
  still running". Materials for a cohort with enrolments cannot be hard-deleted:
  `ON DELETE RESTRICT` plus `archived_at`, the same pattern and the same counted
  refusal as §5.7/§5.12.
- _Done when:_ a staffer builds a multi-module course with video, readings and
  downloads; an unenrolled visitor cannot reach any of it.

**Sprint 6.4 — Enrolment & payment**

- _Build:_ enrol in a cohort, free or paid, reusing the Paystack path already
  proven in Phase 4 (§13) rather than a second payment integration. Capacity and
  waitlist. Enrolment states: pending → active → completed → withdrawn.
  Admin roster per cohort with manual enrol/remove and CSV export.
- _Done when:_ a learner pays and immediately has access; an unpaid enrolment
  holds no seat and unlocks no lesson; the roster reconciles with Paystack.

**Sprint 6.5 — Learning experience**

- _Build:_ the learner's course player — lesson navigation, mark-complete,
  a progress bar, resume-where-you-left-off, and a cohort announcements feed.
  Mobile-first: a substantial share of SRN's audience will study on a phone,
  and this is the one surface where that is not a nice-to-have.
- _Live sessions (decision 2):_ a cohort-paced cohort may schedule live sessions
  (`live_sessions`: cohort_id, title, starts_at, duration, join_url,
  recording_url) with attendance recorded per learner. **The join URL is never
  public and never framed.** It is rendered server-side only to a learner with an
  **active enrolment on that cohort**, as a labelled external link — exactly the
  `zoom_live` posture `lib/admin/embeds.ts` already enforces. Do not add an
  Academy bypass to that module: paying for a course is not a reason to inline a
  meeting. Recordings, once published, go through the normal 5.8 embed path.
  Self-paced cohorts have no sessions and the UI does not show the section.
- _Done when:_ a learner completes a course end to end on a phone, and progress
  survives sign-out and a device change; a signed-out visitor and an enrolled
  learner on a *different* cohort both fail to obtain a join URL by any route.

**Sprint 6.6 — Assessment**

- _Build:_ quizzes (multiple choice, auto-marked) and assignments (file or text
  submission, manually marked). Grading queue for staff, feedback per submission,
  pass thresholds, resubmission policy. **Deadlines apply only to cohort-paced
  cohorts** (decision 1); in a self-paced cohort a submission is never late and
  no deadline is shown.
- _Done when:_ a learner submits, a marker grades with feedback, and the learner
  sees the result and can resubmit where the policy allows.

**Sprint 6.7 — Certificates**

- _Build:_ generated PDF certificate on completion, carrying learner name,
  course, cohort dates and completion date. A **public verification URL** with a
  unique code, so an employer can confirm a certificate is genuine — this is what
  makes the credential worth anything. Admin can revoke.
- _Done when:_ completing a course issues a certificate; the verification URL
  confirms a real one and rejects a forged code.

**Sprint 6.8 — Instructors & reporting**

- _Build:_ an `instructor` role scoped to their own cohorts — they see their
  learners, mark their assignments, and nothing else. Cohort reporting:
  enrolment, completion rate, average score, dropout point. Certificates issued
  per period. These are the numbers that feed SRN's impact reporting and funder
  applications, which is much of why the Academy exists.
- _Done when:_ an instructor manages only their cohorts; Fortune exports a
  completion report for a finished cohort.

**Decisions settled 2026-07-26** (these were the open questions; they are now
answered and must not be re-opened without a note here):

1. **Both self-paced and cohort-paced.** Pacing is a **property of the cohort**,
   not of the platform: `cohorts.pacing` is `'self_paced' | 'cohort_paced'`. A
   self-paced cohort has no drip dates, no live sessions, and no submission
   deadlines; a cohort-paced one may have all three. Everything that only makes
   sense for one mode is **nullable and ignored** in the other — 6.3's drip rule,
   6.5's schedule, and 6.6's deadlines each check the pacing before applying.
   Consequence: 6.3, 6.5 and 6.6 each carry two paths, and both must be tested.
2. **Yes, live sessions.** Cohort-paced cohorts may schedule live sessions. Zoom
   scheduling and attendance are in scope for 6.5. **§5.8's rule holds without
   exception:** a live join link is never public content and never framed — it is
   released only to an *active enrolment* on that cohort, server-side, behind
   auth. `lib/admin/embeds.ts` already refuses to inline a `/j/` URL; the Academy
   must not add a bypass for "but the learner paid".
3. **Yes, learners keep access after the cohort ends.** Access is granted by
   **enrolment**, not by cohort date, so a completed enrolment still opens its
   lessons and materials. Two consequences to design for rather than discover:
   signed URLs for private materials must keep being issued indefinitely (6.3),
   and course content cannot be hard-deleted once a cohort has enrolments — the
   archive/retire pattern from 5.7/5.12 applies (`ON DELETE RESTRICT` plus an
   `archived_at`), for the same reason and with the same counted refusal.
4. **Yes, a free tier.** `cohorts.price_kobo = 0` means free — one code path, not
   a separate "free course" concept. A free enrolment goes straight to `active`
   with `payment_status = 'not_required'`, matching the vocabulary registrations
   already use (§13.2), so seat counting and roster logic stay identical whether
   money moved or not. Free does **not** mean open: a free course still requires
   an account and an enrolment, because completion and certificates need a person
   attached.
5. **Accounts merge with event registration, but the bar differs by surface.**
   This reverses the standing §1 constraint and is the largest structural
   consequence in this phase. `registrations.learner_id` (nullable FK) points at
   `learners`. Two tiers, deliberately:
   - **Events: name + email, no verification required.** Registering for a
     webinar must stay as frictionless as it is today — a verification step in
     front of a free event would cost SRN sign-ups for no gain. A registration
     still creates (or matches) a `learners` row so the person is known, but that
     row is **unverified** and grants nothing beyond the registration itself.
   - **Courses: a real, verified account is required.** Enrolment, lesson access,
     submissions and certificates all sit behind a verified learner account,
     because completion is a credential and must attach to a confirmed person.
   - **The `verified` flag is the security boundary, and this is the trap to
     avoid:** an unverified row is created from an email address *anyone can
     type*. It must therefore never, by itself, open access to anything — no
     enrolment, no materials, no `/account` history beyond the session that
     created it. Linking prior registrations to an account happens **only on
     verification**; matching on an unverified address would let someone type a
     stranger's address and inherit their registration history. Same address,
     two very different levels of trust — treat unverified as "a label on a
     submission", not "a person who is signed in".
   - `registrations.email` stays as a **snapshot** for the same reason
     `applications.programme` does (§5.7): it records what was submitted, and a
     later profile edit must not rewrite history.

**Build decisions settled 2026-07-26** (asked before the phase started, so no
sprint has to guess them):

- **Paystack (6.4): build the full paid path now, verify later.** Both
  `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` are **empty in `.env`
  today**, so no paid flow can be tested end to end yet. `lib/paystack.ts` is
  already written to the live REST contract and `isConfigured()` gates every
  caller, so 6.4 reuses it verbatim and works the moment test keys land. Until
  then 6.4's paid path is **written but unverified, and must be reported that
  way** — free enrolment (`price_kobo = 0`) is fully testable and is the path
  that gets proven first.
- **6.9 images: free commercial-use stock (Unsplash/Pexels) plus SRN's own
  photos wherever the topic fits.** The 16 real SRN images already in the media
  bucket are used where they suit the lesson; licensed stock fills the rest.
  **Images must be downloaded and uploaded into Supabase Storage, never
  hotlinked** — `next.config.ts` allowlists only the project's own storage host
  for the image optimizer, so a remote URL simply will not render. Reuse
  `supabase/upload-media.mjs`; every image gets real alt text and its source
  recorded.
- **6.7 certificates: `pdf-lib`.** Small, fast, no headless browser, reliable on
  serverless — the alternative (HTML→PDF) drags in a ~50MB rendering dependency
  that is slow and fragile on Vercel. The cost is hand-positioned layout, so the
  certificate design is deliberately simple and typographic.
- **Autonomy: routine calls are made without asking**, and reported in the sprint
  summary. The standing exception is that anything **unsafe or expensive to
  undo** — a security boundary, a schema shape with data already in it, or money
  moving — is built around and *asked*, not guessed.

**Design constraint for the whole phase:** the Academy uses the **existing site
design system** — same typefaces, same palette, same components, same imagery
treatment. No gold, no green on text (green stays button/icon fills and focus
rings), plain white, sharp corners. The Academy is part of the site, not a
product with its own look. Anything the learner sees should be indistinguishable
in styling from the public pages built in Phases 2–4.

**Sprint 6.9 — A real research course**

Closes the phase by proving it with actual content rather than a fixture.

- _Build:_ one full-length course on systematic review methodology, authored
  through the 6.2/6.3 admin like any staffer would — multiple modules, real
  lesson prose, images, at least one video embed, a quiz and a marked
  assignment, running as a cohort that ends in a certificate.
- _Status of the content:_ this is a **demonstration course, not SRN-endorsed
  teaching material.** It must read and look like the real thing — no
  `[PLACEHOLDER]`, no lorem, no grey boxes where an image belongs — so that
  Fortune can see what the Academy actually feels like. But it is drafted to
  exercise the platform, not reviewed by SRN's academics, and a certificate from
  it would carry SRN's name. So: **it ships as a draft cohort, never published
  to the public catalogue, until SRN reviews the content.** Mark it clearly in
  the admin. The line to hold is that realism is for the demo's sake and must
  not turn into an un-reviewed credential going out under SRN's brand.
- _Why last:_ it is the only honest test of whether the builder is usable by the
  person who has to use it. Every gap the course author hits is a defect in
  6.2–6.7, found before learners find it.
- _Done when:_ the course exists end to end and feels genuinely real to click
  through, a test learner completes it and holds a verifiable certificate, no
  step required a developer, and the cohort is still unpublished pending review.

### Phase 7 — Member area & reach

**Renumbered 2026-07-25.** This was "Phase 2 (post-launch)", which collided with
**Phase 2 — Public site** above: one meant *build stage 2*, the other meant
*version 2 of the product*. Same words, different things, in one document. It is
now Phase 7, and everything in it has a number so nothing floats in an unowned
backlog.

**Phase goal:** the people who already use SRN — applicants, attendees,
subscribers — get self-service and get reached in their own language.

Everything here is post-launch and needs its own scoping pass before work starts.
Sequencing within the phase is Fortune's call, except where a dependency is
stated.

**Depends on Phase 6.1 (learner accounts).** 7.1 in particular cannot ship
without them. **Decided 2026-07-25: Phase 6 (Academy) is built before Phase 7**,
so this dependency is already satisfied by the time Phase 7 needs it.

**Already moved out of this list — do not rebuild:**

| Was | Now owned by |
| --- | --- |
| ~~End-user accounts~~ | **Sprint 6.1** (learner accounts) |
| ~~Certificate generation~~ | **Sprint 6.7** (certificates + verification) |
| ~~Unsubscribe~~ | **Sprint 5.11** — promoted to a compliance gate, not a nice-to-have |

**7.1 — Applicant & member dashboards**

- Applicant-facing view of application status, mirroring the staff stepper from
  Sprint 5.4 (received → under_review → accepted/waitlisted/rejected).
- Notification email on each transition — **now built in Sprint 5.11**; what
  remains here is the *self-service view*, not the email.
- Document upload (CV, protocol draft) into a private Storage bucket with its
  own RLS policies; **not** the public media bucket. Sprint 6.3 introduces
  exactly this private-bucket pattern — reuse it rather than inventing a second.
- Depends on learner accounts (Sprint 6.1).

**7.2 — Per-event custom questions (form builder)**

- Staff-defined extra fields per event ("what is your review topic?",
  "have you used Covidence?"), typed: short text, long text, select, checkbox.
- Answers stored as `jsonb` on `registrations` rather than as migrated columns,
  so a new question never requires a schema change.
- Admin needs a question editor with reorder + required toggle, and CSV export
  must flatten the jsonb into columns — otherwise the export is unusable, which
  is the whole point of Sprint 5.3.
- **Scope trap:** a general form builder is a product in itself. Cap it at the
  four field types above unless there is a concrete demand for more.

**7.3 — Event attendance certificates**

- Certificates for a **one-off workshop**, which is not an Academy course.
  Sprint 6.7 owns course certificates including issuing, public verification and
  revocation — build that first and extend it to events, rather than a second
  certificate system.
- Attendance marking itself is already Sprint 5.11's job, so check there before
  adding a `completed_at` column.

**7.4 — French localisation**

- Second locale (`fr`) covering the full public site — relevant to SRN's reach
  across Francophone West Africa (Senegal, Côte d'Ivoire, Benin, Togo, Mali,
  Burkina Faso, Niger, Cameroon, DRC).
- **This is the largest item here and touches everything.** Every content table
  in §6 needs a translation strategy: either per-locale rows or a `translations`
  jsonb column. Decide once, early — retrofitting is expensive.
- Routing (`/fr/...`), a locale switcher, `hreflang` tags, translated metadata
  and OG images, and locale-aware date/currency formatting.
- Admin must let a staffer author both locales side by side and see which
  entries are missing a translation.
- **Honest constraint:** this only works if SRN has a French speaker to write
  and maintain the copy. Machine translation of methodological training material
  will produce errors that damage credibility. Do not ship it without a human
  translator committed.

**7.5 — Campaign email tool integration**

- Sync `newsletter_signups` to a real campaign tool (Mailchimp / Brevo /
  Resend Broadcasts) for designed sends, segmentation, and analytics — the
  transactional Resend path built in Phase 4 is deliberately *not* a campaign
  tool and should not be stretched into one.
- Two-way unsubscribe sync is mandatory, not optional: an unsubscribe in the
  campaign tool must propagate back, or SRN mails people who opted out.
- Consent and provenance fields (when, from which form) for GDPR/NDPR defence.

**2.7 — Resolved during v1 (kept for the record)**

- ~~Online payments~~ — **shipped in Phase 4**, not deferred. §12.2/§12.3
  resolved to Paystack, live in v1 for both paid events (§13.1–13.4) and
  donations (§13.5).
- Still open from §12.6: **Paystack multi-currency approval** for USD pricing.
  The schema and checkout code already support USD; only the account-level
  approval is missing.

**Explicitly not planned**

Recorded so they aren't rediscovered as "obvious" gaps: a public discussion
forum or comments (moderation burden with no staff to carry it), a mobile app
(the site is responsive; an app adds a store relationship and two more build
targets for no new capability), and live chat (implies staffed response times
SRN has not committed to).

---

### Phase 8 — Launch

**Swapped with Phase 6 on 2026-07-25** so the phase numbers match execution
order: the Academy (built first, right after Phase 5) is Phase 6, and this
small phase — finishing what Phases 0–5 already built — runs last, immediately
before go-live.

**Sprint 8.1 — Real content load**

- _Build:_ §7A assets in via the admin (dogfood it — loading real content through the admin is its final QA); replace every seed row; typo-clean copy pass (the old site's "Passsion"/"Diverty" class of errors must not migrate).
- _Done when:_ `grep -r "PLACEHOLDER"` returns zero across code and database; every image has real alt text.

**Sprint 8.2 — SEO & performance**

- _Build:_ per-page metadata + OG images (template-generated with title on brand navy); sitemap.xml + robots.txt; JSON-LD: Organization sitewide, Event on event pages, Article on news/guides; image audit (dimensions, priority on hero, lazy elsewhere); font subsetting check; Lighthouse pass on homepage, one event, one programme, one article.
- _Done when:_ ≥90 perf/a11y/SEO/best-practices on all four audited pages, mobile and desktop.

**Sprint 8.3 — Check for stubs and any gaps**

- _Build:_ a final sweep of the whole site and admin for stub copy, dead links, and anything flagged but never closed out across Phases 0–7.
- _Done when:_ nothing found is left unresolved or untracked.

---

## 10. Copy source

Base copy comes from Fortune's brief (positioning, headlines, programme descriptions, audience pathways) — rewritten clean, never pasted from the old site. Tone: confident, plain, international; short sentences; no NGO filler ("empowering synergies"). Where copy is missing, write to spec and mark `[PLACEHOLDER: needs Fortune]`.

---

## 11. Env & config reference

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        (server only — never exposed)
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL
PLAUSIBLE_DOMAIN                 (launch)

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY  (browser-safe)
PAYSTACK_SECRET_KEY              (server only — initialize + verify)
PAYSTACK_WEBHOOK_SECRET          (server only — x-paystack-signature HMAC)

RESEND_FROM                      (sender identity; falls back to the verified
                                  domain. Until Sprint 8.3 verifies
                                  systematicreviewsnetwork.org, set this to
                                  Resend's sandbox sender so mail actually sends)
SRN_INBOX                        (where contact/partnership enquiries are
                                  forwarded; defaults to info@…)
CRON_SECRET                      (server only — Bearer token protecting
                                  /api/cron/expire-registrations)
```

**Email deliverability note.** `lib/email/client.ts` degrades to a logged no-op
when `RESEND_API_KEY` is absent, and every confirmation send is fire-and-forget:
a mail failure never fails the underlying registration/application write. The
domain is unverified until Sprint 8.3, so `RESEND_FROM` must point at the
sandbox sender before then or Resend returns 403.

**Rate limiting (§3.2) — Postgres, not Upstash/KV.** Sprint 3.2 offered Upstash
Redis or Vercel KV; we chose the project's own Postgres instead, so there is no
extra service, no extra secret, and identical behaviour in dev and prod. A
`rate_limits` table (RLS-on, no policies — service-role only) with a fixed
one-hour window per (form, ip); the `bump_rate_limit()` /
`prune_rate_limits()` SECURITY DEFINER functions are revoked from `anon` and
`authenticated`, so only the service-role server actions can touch them. Cap:
5 submissions / hour / form. The limiter fails **open** on infra error — a real
person is never blocked by our own hiccup; the honeypot and zod validation still
stand. Revisit only if volume outgrows a single-window Postgres counter.

---

## 12. Open items (need Fortune / Thorpeboss)

1. ~~Brand assets~~ **RESOLVED:** SRN keeps its existing logo (navy wordmark + four-color knot). Palette in §3.1 is now anchored to it. Still needed from Fortune: the **vector file**, so exact hexes are sampled in Sprint 1.1.
2. ~~Paid events?~~ **RESOLVED (2026-07-24, Thorpeboss): YES — paid via Paystack.** See §13.
3. ~~Donations~~ **RESOLVED (2026-07-24, Thorpeboss): live Paystack processing in v1**, not contact-based. See §13.
4. Final country list + impact numbers (Phase 0.3 checklist).
5. ~~Palette — open, revisit at Sprint 2.1.~~ **RESOLVED (2026-07-24, Thorpeboss):** reviewed on the real homepage, judged generic, and redesigned. Evidence Synthesis Ireland chosen as the north star; the site is now near-monochrome with an Archivo display face — see the revised §3.1/§3.2/§3.3 and the rebuilt §5 homepage. Constraints set and applied: no gold, no green on text, plain white (not warm), simple and elegant.
6. **Paystack multi-currency approval** — USD pricing (§13) requires multi-currency enabled on SRN's Paystack account; it is not on by default. Needs confirming with Fortune/Paystack. Until approved, USD-priced events cannot check out; the schema supports it regardless.

---

## 13. Payments (resolves §12.2 and §12.3)

**Provider:** Paystack. Server-side initialize → hosted checkout → webhook confirmation.

**13.1 Pricing model — per event, mixed**
`events` gains `price_kobo` (int, nullable) and `currency` (`NGN|USD`, default `NGN`). Null or `0` means **free** and the payment step is skipped entirely — the original free-registration flow in Sprint 4.1 stays intact for webinars. Amounts are stored in the **minor unit** (kobo/cents) as integers; never floats, never a display string.

**13.2 Seats are held only by confirmed payment**
For a paid event, capacity is consumed only once payment confirms. The registration lifecycle:

```
submit form  → registrations row, payment_status = 'pending'   (NO seat held)
             → Paystack transaction initialized, reference stored
             → user completes hosted checkout
             → charge.success webhook → payment_status = 'paid' (SEAT HELD)
```

Unpaid `pending` rows older than **30 minutes** are expired by a scheduled job and never count toward capacity. This prevents abandoned checkouts from silently blocking a sold-out course. Capacity checks count `paid` rows only.

**13.3 Trust rule — the webhook is the only source of truth**
Payment is confirmed **only** by a verified Paystack webhook, or by an explicit server-side `/transaction/verify` call. The browser redirect back from checkout is a UX signal, never proof of payment — a user can reach the success URL without paying. Nothing is fulfilled on the redirect alone.

**13.4 Webhook security (non-negotiable)**

- Verify the `x-paystack-signature` header: HMAC **SHA512** of the **raw, unparsed** request body, keyed with the Paystack secret key, compared in constant time. Next.js must not have parsed the body first.
- Reject any request failing verification with 401, before any DB write.
- **Idempotent by Paystack reference** (unique index): Paystack retries events, so the same `charge.success` must be safely processable more than once and never double-fulfil or double-email.
- Return 200 quickly; do slow work (email) after acknowledging.

**13.5 Donations** — live Paystack processing. New `donations` table: id, amount_kobo, currency, donor_name (nullable — anonymous giving allowed), email, message, reference, payment_status, created_at. Same webhook path and the same §13.3/§13.4 rules; separate receipt email. Admin gets a donations view with CSV export.

**13.6 Refunds/cancellations** — out of scope for v1, handled manually in the Paystack dashboard. Registrations carry `payment_status = 'refunded'` so staff can reflect it, but the site initiates no refunds.
