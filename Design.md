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
| Fonts               | **next/font (Google)**               | Fraunces + Inter (§3). Self-hosted via next/font, no layout shift.                                          |
| Analytics           | **Plausible**                        | Privacy-friendly, added at launch.                                                                          |

**Locked decisions:** fixed registration fields (no per-event form builder in v1) · anonymous public submissions (no end-user accounts) · accounts/members area = phase 2 · staff are non-technical, the admin UX is a first-class deliverable.

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

### 3.1 Palette (Tailwind tokens) — anchored to the existing SRN logo

SRN keeps its logo: navy "SRN" wordmark + a four-color knot mark (blue, orange-red, yellow, green). The palette derives from it:

```
--brand      #24276E   SRN navy (sample the EXACT value from the logo vector in Sprint 1.1)
                       — headings, nav, footer, strong surfaces, photo overlays
--ink        #191C45   darkened brand navy — body text (AA at text sizes)
--evidence   #1F6F5C   evidence green, harmonized with the mark's green
                       — THE action color: CTAs, links, active states, focus rings
--gold       #C9A227   refined gold (the mark's yellow, darkened for text-scale use)
                       — impact numbers + max one highlighted CTA per page
--paper      #FFFFFF   base background
--mist       #F4F6F8   alternating section background
--slate      #5A6B7B   secondary text, captions, metadata
--evidence-tint #E8F2EF  light green tint — card hovers, tag backgrounds
```

**Rules that keep the logo from turning the site into a carnival:**

- The four mark colors appear together **only in the logo itself**, plus one sanctioned echo: resource/event **category tag hues** may each pick one mark color (tinted backgrounds, dark text). Nowhere else. No multicolor gradients, no rainbow icons.
- Navy is the institutional anchor (it matches the wordmark, and sits comfortably next to Cochrane/JBI). Green remains the _action_ identity — every button and link reads "evidence green," which still differentiates SRN from the blue-only academic crowd at the interaction level.
- Photo overlays (§3.3) use `--brand` multiply, so photography carries the brand navy.
- Contrast: all text pairs pass WCAG AA; `--slate` on `--mist` is metadata only, never body copy; `--gold` never below 20px.

### 3.2 Typography (committed)

**REVISED 2026-07-24 (Thorpeboss): Inter only — no display serif.** Fraunces was rejected on sight after a side-by-side comparison of eight pairings rendered in context. The hierarchy is now carried by **weight and tracking, not by family**.

- **Display: Inter 700**, tight leading, negative tracking (`-0.02em`, or `-0.03em` at hero/impact-number scale — large sans set at serif sizes reads loose otherwise). Used for: hero headline, section headlines (h2), page titles, pull quotes, impact numbers. Applied via the `.text-display` / `.text-display-tight` utilities so weight and tracking live in one place.
- **Body & UI: Inter** — 400/500/600. Everything else: paragraphs, cards, nav, forms, admin.
- **Utility labels:** Inter 600, 12–13px, +0.08em letter-spacing, uppercase, `--evidence` or `--slate` — the "eyebrow" above every section headline.

**Consequences of dropping the serif, to be watched during Phase 2:**

- One family means one set of font metrics, so there is no mismatched-fallback layout shift and one fewer font to load.
- The scholarly signal a serif carries is now gone. The institutional register has to come from **layout discipline, generous whitespace, and photography** instead. If the site starts reading generic or SaaS-like, that is the cause — the fix is spacing and imagery, not reintroducing a serif.
- `--font-display` is retained as a CSS token aliased to `--font-sans`, so a display face can be reintroduced in exactly one place if that judgement changes.

Type scale (desktop → mobile): hero 56→36 · h2 36→28 · h3 24→20 · body 17→16 · small 14 · eyebrow 13. Line-length cap on prose: 68ch.

### 3.3 Layout system

- Max content width 1200px; prose columns 720px. Section vertical padding 96px desktop / 56px mobile. Grid gap 24px.
- Sections alternate `--paper` / `--mist`; the footer and at most one mid-page CTA band are `--ink` (light text).
- Cards: white, 1px `#E3E8ED` border, 12px radius, subtle shadow on hover only, 24px padding. No glassmorphism, no gradient borders.
- Photography treatment: hero and CTA-band images get a **navy multiply overlay (–ink at 55–70%)** so white text always sits legibly on real photos — this also visually unifies photos of mixed quality, which matters when the sources are Zoom screenshots and phone photos (§7).
- Motion: impact counters count up on first scroll into view; cards lift 2px on hover; one soft fade-up per section, 300ms, once. Nothing else. `prefers-reduced-motion` disables all of it.

### 3.4 Signature element — the Reach Map

A quiet, Africa-centered world map (static inline SVG, no map library) with `--evidence` dots on member/activity countries (Nigeria, Rwanda, Ghana, Cameroon, Pakistan, Brazil + whatever Fortune confirms), country names on hover. Full-size on the Impact page; a small monochrome echo behind the hero's impact strip. It encodes the true story — LMIC capacity across many countries — and is the one memorable device. Everything else stays disciplined.

### 3.5 Quality floor (every page, not announced)

Responsive to 360px · visible keyboard focus (2px `--evidence` outline) · semantic headings, one h1 per page · alt text everywhere · WCAG AA contrast · reduced motion respected · no layout shift from fonts or images (dimensions always set).

---

## 4. Component kit (build once, Sprint 1.1)

`Eyebrow` · `SectionHeader` (eyebrow + h2 + optional lede) · `Button` (primary green / secondary outline-ink / gold, one per page) · `StatCounter` (SSR number + scroll animation) · `EventCard` (type tag, date block, title, capacity/status chip, register CTA) · `ProgrammeCard` (icon, title, blurb, audience line) · `PersonCard` (photo, name, role, affiliation, links) · `ResourceCard` (category tag, title, description, download/external) · `TestimonialBlock` (quote, person, photo) · `CTABand` (ink background, headline, one button) · `PartnerLogoBar` (greyscale logos, color on hover) · `ReachMap` (§3.4) · `FormField` set (input, select, textarea, error/success states written in plain language per the writing rules below) · `Table` + `CSVExportButton` (admin) · `StatusBadge` (application workflow colors).

**Interface writing rules (public + admin):** active voice; buttons say what happens ("Register for this event", "Save changes", "Export CSV"); an action keeps its name through the flow (button "Publish" → toast "Published"); errors say what went wrong and how to fix it, never apologize, never vague; empty states are invitations ("No events yet. Create your first event."); sentence case everywhere except eyebrows.

---

## 5. Information architecture & page specs

Nav: `Home · About · Programmes · Resources · Impact · Team · News & Events · Partner with SRN · Contact` — Mentorship lives under Programmes; Community merges into Impact/News for v1 (one less thin page). Donate is a section of Partner with SRN. Mobile: full-screen sheet menu.

### Homepage (order locked)

1. **Hero** — real photo of an SRN training (navy overlay). Eyebrow: "Systematic Reviews Network". H1: **"Better evidence. Smarter decisions."** Sub: the capacity-building sentence from the brief. Buttons: "Explore programmes" (primary) + "Partner with SRN" (secondary). Small reach-map echo.
2. **Partner logo bar** — "Supported by / working with", greyscale.
3. **Impact strip** — 4–6 `StatCounter`s on `--mist` (numbers from Fortune; gold figures, Fraunces).
4. **About in one paragraph** + "About SRN →".
5. **What we do** — 4 `ProgrammeCard`s: Training, Mentorship, Resources, Partnerships.
6. **Who we serve** — 4 audience pathway cards (student / active review team / institution / policymaker), each linking into the site.
7. **"New to systematic reviews?"** — 3-sentence plain-language explainer + link to the beginner guide (Campbell pattern).
8. **Featured programmes** — 2–3 cards.
9. **Upcoming events** — next 3 `EventCard`s + "All events".
10. **Testimonial** — leader quote over photo (ESI pattern).
11. **Resource library preview** — 3 `ResourceCard`s.
12. **Newsletter** — one email field, plain-language consent line.
13. **CTA band** — "Bring evidence synthesis training to your institution." One gold button.

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
  - `next/font`: Fraunces (variable, optical size on) + Inter. Wire into Tailwind font families.
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
- _Done when:_ checklist delivered to Fortune; tracked as the launch blocker for Sprint 6.1.

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

- _Build:_ all 13 sections in §5 order, exactly. Data: homepage singleton, impact_stats, partners, events (next 3 published upcoming), testimonials (first), resources (3 latest). Hero photo with `--brand` overlay; small monochrome ReachMap echo behind the impact strip.
- _Done when:_ matches §5 section-by-section; counters show real numbers with JS disabled; Lighthouse ≥90 (perf/a11y/SEO) on deployed preview at mobile + desktop.

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

### Phase 6 — Launch

**Sprint 6.1 — Real content load**

- _Build:_ §7A assets in via the admin (dogfood it — loading real content through the admin is its final QA); replace every seed row; typo-clean copy pass (the old site's "Passsion"/"Diverty" class of errors must not migrate).
- _Done when:_ `grep -r "PLACEHOLDER"` returns zero across code and database; every image has real alt text.

**Sprint 6.2 — SEO & performance**

- _Build:_ per-page metadata + OG images (template-generated with title on brand navy); sitemap.xml + robots.txt; JSON-LD: Organization sitewide, Event on event pages, Article on news/guides; image audit (dimensions, priority on hero, lazy elsewhere); font subsetting check; Lighthouse pass on homepage, one event, one programme, one article.
- _Done when:_ ≥90 perf/a11y/SEO/best-practices on all four audited pages, mobile and desktop.

**Sprint 6.3 — Go live**

- _Build:_ production domain + DNS, Resend domain verification (SPF/DKIM so confirmations don't land in spam — test this explicitly), Plausible, full production form sweep (register, apply, subscribe, contact — real emails), staff walkthrough doc (short, screenshots, plain language: "how to add an event," "how to export your attendee list," "how to review applications"), staff logins issued.
- _Done when:_ Fortune's staff have logins and have successfully created and published a test event themselves; a test registration confirmation arrives in a normal inbox, not spam.

---

### Phase 2 (post-launch, out of scope for this build)

End-user accounts + member area · applicant dashboards · per-event custom questions (form builder) · certificate generation · French localisation · campaign email tool integration · online payments if §12 answers require them.

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
```

---

## 12. Open items (need Fortune / Thorpeboss)

1. ~~Brand assets~~ **RESOLVED:** SRN keeps its existing logo (navy wordmark + four-color knot). Palette in §3.1 is now anchored to it. Still needed from Fortune: the **vector file**, so exact hexes are sampled in Sprint 1.1.
2. ~~Paid events?~~ **RESOLVED (2026-07-24, Thorpeboss): YES — paid via Paystack.** See §13.
3. ~~Donations~~ **RESOLVED (2026-07-24, Thorpeboss): live Paystack processing in v1**, not contact-based. See §13.
4. Final country list + impact numbers (Phase 0.3 checklist).
5. **Palette — open, revisit at Sprint 2.1.** Thorpeboss flagged uncertainty about the colour choices (2026-07-24). Deliberately NOT changed yet: swatches judge badly in isolation, and the palette should be reviewed on the real homepage with real photography behind it. All colour lives in the `@theme` block of `app/globals.css`, so a revision is a single-file edit. Revisit once Sprint 2.1 is viewable.
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
