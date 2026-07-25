import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { SectionHeader, Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { StatCounter } from "@/components/ui/StatCounter";
import { PartnerLogoBar } from "@/components/ui/PartnerLogoBar";
import { Figure } from "@/components/ui/Media";
import { Thread } from "@/components/ui/Thread";
import { Icon } from "@/components/ui/Icon";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import {
  ResourceCard,
  TestimonialBlock,
  CTABand,
} from "@/components/ui/Cards";
import { formatEventDate, formatPrice } from "@/lib/events";
import { categoryLabel, resourceHref, resourceKind } from "@/lib/resources";
import {
  getHomepage,
  getImpactStats,
  getPartners,
  getTestimonials,
  getUpcomingEvents,
  getLatestResources,
  getProgrammes,
  getMedia,
  getMediaByUrl,
} from "@/lib/queries";

/* Homepage — the ESI-informed redesign, built on the real component kit.

   The direction is editorial, not a card catalogue: a full-bleed two-weight
   hero, an ink photo-backed impact band, and programmes/events as typographic
   indexes rather than grids. Near-monochrome — plain white, ink, one green used
   only on button fills. Every read is a server component; ISR revalidates 60s.

   Order leads a NEW visitor: hero → proof → what we do → where to start →
   what a review is → mentorship → events → voice → resources → partner. */

export const revalidate = 60;

/* The homepage programme index reads the same published rows as the Programmes
   hub (Sprint 5.7), so the two can never drift apart. */
const programmeHref = (slug: string) =>
  slug === "mentorship" ? "/programmes/mentorship" : `/programmes/${slug}`;

export default async function HomePage() {
  const [
    homepage,
    stats,
    partners,
    testimonials,
    events,
    resources,
    ctaImage,
    impactPhoto,
    mentorPhoto,
    aboutPhoto,
    programmes,
  ] = await Promise.all([
    getHomepage(),
    getImpactStats(),
    getPartners(),
    getTestimonials(1),
    getUpcomingEvents(3),
    getLatestResources(3),
    getMedia("workshop-full-room.jpg"),
    getMedia("award-of-honour.jpg"),
    getMedia("award-of-honour.jpg"),
    getMedia("workshop-full-room.jpg"),
    getProgrammes(),
  ]);

  const testimonial = testimonials[0];

  /* Image and alt must describe the SAME picture: resolve the hero's alt from
     the URL actually rendered, not a fixed fallback record. */
  const heroUrl = homepage?.hero_image_url ?? null;
  const heroMedia = heroUrl
    ? await getMediaByUrl(heroUrl)
    : await getMedia("hero-cohort-steps.jpg");
  const heroSrc = heroUrl ?? heroMedia?.url ?? null;

  /* Four strongest stats — a clean 4-up reads complete; six leaves a ragged
     second row. */
  const topStats = stats.slice(0, 4);

  return (
    <>
      {/* ── 1. Hero — full-bleed, two-weight headline ───────────────────── */}
      <header className="relative flex min-h-[88vh] items-end overflow-hidden bg-ink">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt={heroMedia?.alt ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        {/* Layered scrim: darkens the bottom where the headline sits, guarantees
            the header always reads over darkness, and lifts overall contrast so
            no bright patch of photo fights white text. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(22,24,43,0.72) 0%, rgba(22,24,43,0) 22%)," +
              "linear-gradient(to top, rgba(22,24,43,0.94) 0%, rgba(22,24,43,0.68) 34%, rgba(22,24,43,0.34) 62%, rgba(22,24,43,0.22) 100%)," +
              "rgba(22,24,43,0.18)",
          }}
        />

        <Container className="relative pt-32 pb-[clamp(48px,7vw,96px)]">
          <div className="max-w-[46ch]">
            <Eyebrow tone="paper">
              {homepage?.hero_eyebrow ?? "Systematic Reviews Network"}
            </Eyebrow>
            <h1 className="text-paper mt-5 text-[clamp(2.8rem,7vw,5.5rem)]">
              <span className="hero-thin">Better evidence.</span>
              <span className="hero-black">Smarter decisions.</span>
            </h1>
            <p className="text-paper/85 mt-6 max-w-[52ch] text-[1.15rem] leading-relaxed">
              {homepage?.hero_subheading ??
                "We build capacity for systematic reviews and meta-analyses across low- and middle-income countries — training researchers to produce evidence that stands up to scrutiny."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/programmes" prefetch={false} size="lg">
                Explore programmes
              </ButtonLink>
              <ButtonLink
                href="/resources?category=guide"
                prefetch={false}
                variant="secondary"
                size="lg"
                className="border-paper/50 text-paper hover:border-paper hover:bg-paper/10"
              >
                What is a systematic review?
              </ButtonLink>
            </div>
          </div>
        </Container>
      </header>

      {/* ── 2. Partner logo bar ─────────────────────────────────────────── */}
      {partners.length > 0 ? (
        <Section surface="paper" className="!py-12">
          <Container>
            <PartnerLogoBar partners={partners} />
          </Container>
        </Section>
      ) : null}

      {/* ── 3. Impact band — ink, photo-backed, real counters ───────────── */}
      {topStats.length > 0 ? (
        <section
          className="relative overflow-hidden bg-ink"
          aria-labelledby="impact"
        >
          {impactPhoto?.url ? (
            <Image
              src={impactPhoto.url}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-[0.18]"
            />
          ) : null}
          <Container className="relative">
            <h2 id="impact" className="sr-only">
              Our impact
            </h2>
            <div className="grid grid-cols-2 gap-px bg-paper/10 md:grid-cols-4">
              {topStats.map((s) => (
                <div key={s.id} className="bg-ink px-7 py-10">
                  <StatCounter value={s.value} label={s.label} tone="paper" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── 4. About in one confident statement ─────────────────────────── */}
      <Section surface="paper">
        <Container>
          <Eyebrow>About SRN</Eyebrow>
          <p className="text-display text-ink mt-5 max-w-[24ch] text-[clamp(1.8rem,4vw,3rem)] leading-[1.05]">
            Formerly ACSRM. Launched in 2022. Working across Africa and beyond.
          </p>
          <p className="text-slate prose-measure mt-6 text-[1.15rem] leading-[1.6]">
            {homepage?.about_paragraph ??
              "The Systematic Reviews Network builds capacity for evidence synthesis across low- and middle-income countries through training, mentorship, and research collaboration."}
          </p>
          <Link
            href="/about"
            prefetch={false}
            className="text-ink hover:text-evidence mt-6 inline-flex items-center gap-1.5 font-semibold"
          >
            Read the full story
            <Icon icon={ArrowRight} size="sm" />
          </Link>
        </Container>
      </Section>

      {/* ── The thread — signature divider ──────────────────────────────── */}
      <Container>
        <Thread />
      </Container>

      {/* ── 5. What we do — split statement (breaks the grid) ───────────── */}
      <Section surface="paper">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-[clamp(32px,5vw,72px)]">
            <div>
              <Eyebrow>What we do</Eyebrow>
              <h2 className="text-display text-ink mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.1]">
                Training, mentorship, and the tools to do a review well.
              </h2>
              <p className="text-slate mt-5 leading-relaxed">
                From a first course to a completed meta-analysis, SRN supports
                researchers at every stage — with hands-on training, one-to-one
                mentorship, and open resources anyone can use.
              </p>
              <ButtonLink
                href="/programmes"
                prefetch={false}
                variant="secondary"
                className="mt-7"
              >
                All programmes
              </ButtonLink>
            </div>
            <Figure
              src={aboutPhoto?.url}
              alt={aboutPhoto?.alt ?? ""}
              width={4}
              height={3}
              label="workshop"
              className="w-full"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </Container>
      </Section>

      {/* ── 6. Programmes — typographic index, not cards ────────────────── */}
      <Section surface="mist">
        <Container>
          <Eyebrow>Programmes</Eyebrow>
          <h2 className="text-display text-ink mt-3 mb-8 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
            Find the right starting point.
          </h2>
          <ul className="index-list">
            {programmes.map((p, i) => (
              <li key={p.slug}>
                <Link href={programmeHref(p.slug)} className="index-row">
                  <span className="text-display text-slate text-[1.1rem] font-light tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="text-display text-ink block text-[clamp(1.3rem,2.6vw,1.9rem)] font-bold leading-tight">
                      {p.title}
                    </span>
                    <span className="text-slate text-small">{p.audience}</span>
                  </span>
                  <span className="index-meta-end text-small">{p.duration}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── 7. Mentorship — full-bleed feature ──────────────────────────── */}
      <section
        className="relative flex min-h-[60vh] items-center overflow-hidden bg-ink"
        aria-labelledby="mentorship"
      >
        {mentorPhoto?.url ? (
          <Image
            src={mentorPhoto.url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div
          aria-hidden
          className="from-ink/90 via-ink/60 to-ink/20 absolute inset-0 bg-gradient-to-r max-md:bg-gradient-to-t"
        />
        <Container className="relative">
          <div className="max-w-[540px] py-16 text-paper">
            <Eyebrow tone="paper">Mentorship</Eyebrow>
            <h2
              id="mentorship"
              className="text-display text-paper mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]"
            >
              Guidance from someone who has done it before.
            </h2>
            <p className="text-paper/85 mt-5 leading-relaxed">
              The Mentorship Programme pairs researchers with experienced
              reviewers through the whole of a live review — so you stop
              second-guessing every methodological choice.
            </p>
            <ButtonLink
              href="/programmes/mentorship"
              prefetch={false}
              className="mt-7"
            >
              Learn more
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* ── 8. Upcoming events ──────────────────────────────────────────── */}
      <Section surface="paper">
        <Container>
          <Eyebrow>What&apos;s on</Eyebrow>
          <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
            Upcoming events
          </h2>
          {events.length > 0 ? (
            <>
              <ul className="index-list mt-8">
                {events.map((e, i) => (
                  <li key={e.id}>
                    <Link
                      href={`/news/events/${e.slug}`}
                      prefetch={false}
                      className="index-row"
                    >
                      <span className="text-display text-slate text-[1.1rem] font-light tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="text-display text-ink block text-[clamp(1.15rem,2.2vw,1.5rem)] font-bold leading-tight">
                          {e.title}
                        </span>
                        <span className="text-slate text-small">
                          {formatEventDate(e.starts_at, e.ends_at)} ·{" "}
                          {e.location_type === "online" ? "Online" : "In person"}
                        </span>
                      </span>
                      <span className="index-meta-end text-small">
                        {formatPrice(e.price_kobo, e.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
            <div className="border-hairline mt-8 border border-dashed p-10 text-center">
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

      {/* ── 9. Testimonial ──────────────────────────────────────────────── */}
      {testimonial ? (
        <Section surface="mist">
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

      {/* ── 10. Resource library preview ────────────────────────────────── */}
      {resources.length > 0 ? (
        <Section surface="paper">
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
                  categoryLabel={categoryLabel(r.category)}
                  href={resourceHref(r)}
                  kind={resourceKind(r)}
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

      {/* ── 11. Newsletter ──────────────────────────────────────────────── */}
      <Section surface="mist">
        <Container>
          <div className="border-hairline bg-paper mx-auto max-w-[var(--container-prose)] border p-8 text-center md:p-10">
            <Eyebrow>Stay in touch</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-[1.2] md:text-[1.75rem]">
              Hear about new training first
            </h2>
            <p className="text-slate text-small mt-3">
              Occasional emails about courses, resources, and opportunities. No
              more than once a month, and you can unsubscribe any time.
            </p>
            <div className="mx-auto mt-6 max-w-md text-left">
              <NewsletterForm surface="light" />
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 12. CTA band ────────────────────────────────────────────────── */}
      <Section surface="paper" className="!pt-0">
        <Container>
          <CTABand
            heading={
              homepage?.cta_heading ??
              "Bring evidence synthesis training to your institution."
            }
            body="Host a workshop, sponsor researchers, or co-create evidence with SRN. We work with institutions and funders across LMICs."
            buttonLabel={homepage?.cta_button_label ?? "Partner with SRN"}
            buttonHref={homepage?.cta_button_href ?? "/partner"}
            imageUrl={ctaImage?.url}
            imageAlt={ctaImage?.alt}
          />
        </Container>
      </Section>
    </>
  );
}
