import Link from "next/link";
import {
  GraduationCap,
  Users,
  BookOpen,
  Handshake,
  ArrowRight,
  Building2,
  UserRound,
  Landmark,
  FlaskConical,
} from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { SectionHeader, Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { StatCounter } from "@/components/ui/StatCounter";
import { ReachMap } from "@/components/ui/ReachMap";
import { PartnerLogoBar } from "@/components/ui/PartnerLogoBar";
import { OverlayImage } from "@/components/ui/Media";
import { Icon } from "@/components/ui/Icon";
import {
  EventCard,
  ProgrammeCard,
  ResourceCard,
  TestimonialBlock,
  CTABand,
} from "@/components/ui/Cards";
import { registrationState } from "@/lib/events";
import {
  getHomepage,
  getImpactStats,
  getPartners,
  getReachCountries,
  getTestimonials,
  getUpcomingEvents,
  getLatestResources,
  getSeatCounts,
} from "@/lib/queries";

/* Sprint 2.1 — the homepage. All 13 sections in Design.md §5 order, exactly.
   Every read is a server component; ISR revalidates every 60s. */

/* Must be a literal: Next statically analyses segment config exports, so
   `export const revalidate = SOME_IMPORT` is rejected at build time. Keep this
   in step with REVALIDATE in lib/queries.ts. */
export const revalidate = 60;

/* §5.5 — the four things SRN does. Static: these are structural, not content
   staff edit per-item. */
const PROGRAMMES = [
  {
    href: "/programmes#training",
    icon: GraduationCap,
    title: "Training",
    blurb:
      "[PLACEHOLDER] Structured courses that take researchers from first principles to a completed review.",
    audience: "Beginner to intermediate",
  },
  {
    href: "/programmes/mentorship",
    icon: Users,
    title: "Mentorship",
    blurb:
      "[PLACEHOLDER] Paired guidance from experienced reviewers, through the whole of a live review.",
    audience: "Active review teams",
  },
  {
    href: "/resources",
    icon: BookOpen,
    title: "Resources",
    blurb:
      "[PLACEHOLDER] Guides, templates, and recorded sessions, free to use and openly available.",
    audience: "Everyone",
  },
  {
    href: "/partner",
    icon: Handshake,
    title: "Partnerships",
    blurb:
      "[PLACEHOLDER] Working with institutions to build evidence synthesis capacity that lasts.",
    audience: "Institutions and funders",
  },
];

/* §5.6 — audience pathways. Each routes into the site rather than dead-ending. */
const AUDIENCES = [
  {
    href: "/programmes#beginner",
    icon: UserRound,
    title: "I'm a student",
    blurb: "New to systematic reviews and looking for a place to start.",
  },
  {
    href: "/programmes/mentorship",
    icon: FlaskConical,
    title: "I'm running a review",
    blurb: "Underway and want methodological support to finish well.",
  },
  {
    href: "/partner",
    icon: Building2,
    title: "I'm at an institution",
    blurb: "Looking to build review capacity across a department or faculty.",
  },
  {
    href: "/impact",
    icon: Landmark,
    title: "I make decisions",
    blurb: "Need evidence you can trust to inform policy or practice.",
  },
];

export default async function HomePage() {
  /* Fetched in parallel: these are independent reads and the page should not
     wait on them serially. */
  const [
    homepage,
    stats,
    partners,
    countries,
    testimonials,
    events,
    resources,
  ] = await Promise.all([
    getHomepage(),
    getImpactStats(),
    getPartners(),
    getReachCountries(),
    getTestimonials(1),
    getUpcomingEvents(3),
    getLatestResources(3),
  ]);

  const seats = await getSeatCounts(events.map((e) => e.id));
  const testimonial = testimonials[0];

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <OverlayImage
        src={homepage?.hero_image_url}
        alt={homepage?.hero_image_url ? "SRN training session" : ""}
        width={2400}
        height={900}
        priority
      >
        <Container>
          <div className="relative py-24 md:py-32">
            {/* §3.4 — the small monochrome reach-map echo, behind the hero. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 items-center opacity-70 lg:flex"
            >
              <ReachMap variant="echo" countries={countries} />
            </div>

            <div className="relative max-w-[52ch] lg:max-w-[30ch]">
              <Eyebrow tone="paper">
                {homepage?.hero_eyebrow ?? "Systematic Reviews Network"}
              </Eyebrow>
              <h1 className="text-display-tight text-paper mt-4 text-[2.25rem] leading-[1.05] md:text-[3.25rem] lg:text-[3.5rem]">
                {homepage?.hero_heading ??
                  "Better evidence. Smarter decisions."}
              </h1>
              <p className="text-paper/85 mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed">
                {homepage?.hero_subheading ??
                  "[PLACEHOLDER] The capacity-building sentence from the brief."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/programmes" prefetch={false} size="lg">
                  Explore programmes
                </ButtonLink>
                <ButtonLink
                  href="/partner"
                  prefetch={false}
                  variant="secondary"
                  size="lg"
                  className="border-paper/40 text-paper hover:border-paper hover:bg-paper/10"
                >
                  Partner with SRN
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </OverlayImage>

      {/* ── 2. Partner logo bar ─────────────────────────────────────────── */}
      {partners.length > 0 ? (
        <Section surface="paper" className="!py-12">
          <Container>
            <PartnerLogoBar partners={partners} />
          </Container>
        </Section>
      ) : null}

      {/* ── 3. Impact strip ─────────────────────────────────────────────── */}
      {stats.length > 0 ? (
        <Section surface="mist">
          <Container>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
              {stats.map((s) => (
                <StatCounter key={s.id} value={s.value} label={s.label} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ── 4. About in one paragraph ───────────────────────────────────── */}
      <Section surface="paper">
        <Container>
          <div className="max-w-[var(--container-prose)]">
            <Eyebrow>About SRN</Eyebrow>
            <p className="text-ink prose-measure mt-4 text-[1.25rem] leading-[1.55]">
              {homepage?.about_paragraph ??
                "[PLACEHOLDER] A single paragraph about SRN, as it appears on the homepage."}
            </p>
            <Link
              href="/about"
              prefetch={false}
              className="text-evidence mt-6 inline-flex items-center gap-1.5 font-semibold"
            >
              About SRN
              <Icon icon={ArrowRight} size="sm" />
            </Link>
          </div>
        </Container>
      </Section>

      {/* ── 5. What we do ───────────────────────────────────────────────── */}
      <Section surface="mist">
        <Container>
          <SectionHeader
            eyebrow="What we do"
            heading="Four ways we build capacity"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAMMES.map((p) => (
              <ProgrammeCard key={p.title} {...p} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ── 6. Who we serve ─────────────────────────────────────────────── */}
      <Section surface="paper">
        <Container>
          <SectionHeader
            eyebrow="Who we serve"
            heading="Find your starting point"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <Link
                key={a.title}
                href={a.href}
                prefetch={false}
                className="border-hairline hover:border-evidence hover:bg-evidence-tint/40 group rounded-[var(--radius-card)] border p-6 transition-colors"
              >
                <Icon icon={a.icon} size="lg" color="evidence" />
                <h3 className="text-ink mt-4 font-semibold">{a.title}</h3>
                <p className="text-slate text-small mt-2 leading-relaxed">
                  {a.blurb}
                </p>
                <span className="text-evidence mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold">
                  Start here
                  <Icon icon={ArrowRight} size="sm" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── 7. New to systematic reviews? (the Campbell pattern) ────────── */}
      <Section surface="mist">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>New to systematic reviews?</Eyebrow>
              <h2 className="text-display text-ink mt-3 text-[1.75rem] leading-[1.2] md:text-[2.25rem] md:leading-[1.15]">
                {homepage?.explainer_heading ?? "What is a systematic review?"}
              </h2>
              <p className="text-slate prose-measure mt-4 leading-relaxed">
                {homepage?.explainer_body ??
                  "[PLACEHOLDER] A three-sentence plain-language explanation of what a systematic review is and why it matters."}
              </p>
              <ButtonLink
                href="/resources?category=guide"
                prefetch={false}
                className="mt-6"
              >
                Read the beginner guide
              </ButtonLink>
            </div>
            <div className="border-hairline bg-paper rounded-[var(--radius-card)] border p-8">
              <ol className="space-y-5">
                {[
                  "Ask a clear, answerable question",
                  "Search the literature systematically",
                  "Screen studies against set criteria",
                  "Appraise, synthesise, and report",
                ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="bg-evidence-tint text-evidence text-small flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-ink text-small pt-1 font-medium">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 8. Featured programmes ──────────────────────────────────────── */}
      <Section surface="paper">
        <Container>
          <SectionHeader
            eyebrow="Programmes"
            heading="Start with a course built for your stage"
            lede="[PLACEHOLDER] A sentence introducing the featured programmes."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROGRAMMES.slice(0, 3).map((p) => (
              <ProgrammeCard key={`featured-${p.title}`} {...p} />
            ))}
          </div>
          <ButtonLink
            href="/programmes"
            prefetch={false}
            variant="secondary"
            className="mt-8"
          >
            All programmes
          </ButtonLink>
        </Container>
      </Section>

      {/* ── 9. Upcoming events ──────────────────────────────────────────── */}
      <Section surface="mist">
        <Container>
          <SectionHeader eyebrow="What's on" heading="Upcoming events" />
          {events.length > 0 ? (
            <>
              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((e) => (
                  <EventCard
                    key={e.id}
                    href={`/news/events/${e.slug}`}
                    title={e.title}
                    type={e.type}
                    starts_at={e.starts_at}
                    ends_at={e.ends_at}
                    locationType={e.location_type}
                    state={registrationState(e, seats[e.id] ?? 0)}
                    price_kobo={e.price_kobo}
                    currency={e.currency}
                    capacity={e.capacity}
                    seatsTaken={seats[e.id] ?? 0}
                  />
                ))}
              </div>
              <ButtonLink
                href="/news"
                prefetch={false}
                variant="secondary"
                className="mt-8"
              >
                All events
              </ButtonLink>
            </>
          ) : (
            /* §4 — empty states are invitations, not dead ends. */
            <div className="border-hairline mt-10 rounded-[var(--radius-card)] border border-dashed p-10 text-center">
              <p className="text-ink font-semibold">
                No events scheduled right now
              </p>
              <p className="text-slate text-small mt-1">
                Join the newsletter and we&apos;ll tell you when the next one
                opens.
              </p>
            </div>
          )}
        </Container>
      </Section>

      {/* ── 10. Testimonial (the ESI pattern) ───────────────────────────── */}
      {testimonial ? (
        <Section surface="paper">
          <Container>
            <TestimonialBlock
              quote={testimonial.quote}
              name={testimonial.name}
              role={testimonial.role}
              photoUrl={testimonial.photo_url}
            />
          </Container>
        </Section>
      ) : null}

      {/* ── 11. Resource library preview ────────────────────────────────── */}
      {resources.length > 0 ? (
        <Section surface="mist">
          <Container>
            <SectionHeader
              eyebrow="Resources"
              heading="Free guides, templates, and recordings"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {resources.map((r) => (
                <ResourceCard
                  key={r.id}
                  title={r.title}
                  description={r.description}
                  category={r.category}
                  href={
                    r.body_rich
                      ? `/resources/${r.slug}`
                      : (r.file_url ?? r.external_url ?? `/resources/${r.slug}`)
                  }
                  kind={
                    r.body_rich
                      ? "article"
                      : r.file_url
                        ? "download"
                        : "external"
                  }
                />
              ))}
            </div>
            <ButtonLink
              href="/resources"
              prefetch={false}
              variant="secondary"
              className="mt-8"
            >
              Browse the library
            </ButtonLink>
          </Container>
        </Section>
      ) : null}

      {/* ── 12. Newsletter ──────────────────────────────────────────────── */}
      <Section surface="paper">
        <Container>
          <div className="border-hairline mx-auto max-w-[var(--container-prose)] rounded-[var(--radius-card)] border p-8 text-center md:p-10">
            <Eyebrow>Stay in touch</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-[1.2] md:text-[1.75rem]">
              Hear about new training first
            </h2>
            <p className="text-slate text-small mt-3">
              Occasional emails about courses, resources, and opportunities. No
              more than once a month, and you can unsubscribe any time.
            </p>
            {/* Wired for real in Sprint 4.3. Disabled rather than silently
                inert, so it never looks like it worked when it did not. */}
            <form className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
              <label htmlFor="home-email" className="sr-only">
                Email address
              </label>
              <input
                id="home-email"
                type="email"
                disabled
                placeholder="you@example.com"
                className="border-hairline text-ink placeholder:text-slate/60 text-small disabled:bg-mist min-w-0 flex-1 rounded-lg border px-3.5 py-2.5 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled
                className="bg-evidence text-paper text-small rounded-lg px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Subscribe
              </button>
            </form>
            <p className="text-slate mt-3 text-[0.75rem]">
              [PLACEHOLDER] Sign-up opens when the site goes live.
            </p>
          </div>
        </Container>
      </Section>

      {/* ── 13. CTA band ────────────────────────────────────────────────── */}
      <Section surface="paper" className="!pt-0">
        <Container>
          <CTABand
            heading={
              homepage?.cta_heading ??
              "Bring evidence synthesis training to your institution."
            }
            body="[PLACEHOLDER] A supporting sentence explaining what partnering involves."
            buttonLabel={homepage?.cta_button_label ?? "Partner with SRN"}
            buttonHref={homepage?.cta_button_href ?? "/partner"}
          />
        </Container>
      </Section>
    </>
  );
}
