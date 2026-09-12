import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { StatCounter } from "@/components/ui/StatCounter";
import { ReachMap } from "@/components/ui/ReachMap";
import { Thread } from "@/components/ui/Thread";
import { TestimonialBlock, CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import {
  getImpactStats,
  getReachCountries,
  getTestimonials,
  getImpactStories,
  getMedia,
} from "@/lib/queries";

/* Sprint 2.5 — Impact. The reach map is the page's memorable device; the rest
   stays disciplined. Everything is data-driven (impact_stats, reach_countries,
   testimonials, and the impact-story-* pages)
   and the page reads correctly with zero JavaScript: the map has a list
   fallback, the counters server-render their real values. */

export const revalidate = 3600;

const UPCOMING_IMPACT_STORIES = [
  "A review that changed local practice",
  "Improving evidence-informed malaria policy-making in Nigeria and Ghana",
  "Building research capacity in Africa",
];

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Where SRN works and the change our training and mentorship set in motion, across Africa, South Asia, and Latin America.",
};

export default async function ImpactPage() {
  const [stats, countries, testimonials, stories, headerPhoto] =
    await Promise.all([
      getImpactStats(),
      getReachCountries(),
      getTestimonials(),
      getImpactStories(),
      getMedia("drive-selected/2026-09/srnrwanda.jpg"),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Our impact"
        title="Capacity that stays, long after training ends."
        lede="SRN measures success not only by completed reviews, but by researchers, institutions, and policymakers who can produce, interpret, adapt, and use trustworthy evidence again and again, especially in the places where that evidence is needed most."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      {/* Stats — ink band, real counters, no-JS safe. */}
      {stats.length > 0 ? (
        <section className="bg-ink" aria-labelledby="impact-numbers">
          <Container>
            <h2 id="impact-numbers" className="sr-only">
              Impact in numbers
            </h2>
            <div className="bg-paper/10 grid grid-cols-2 gap-px md:grid-cols-3">
              {stats.map((s) => (
                <div key={s.id} className="bg-ink px-7 py-10">
                  <StatCounter value={s.value} label={s.label} tone="paper" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Reach map — the one memorable device. */}
      <Section surface="paper">
        <Container>
          <div className="max-w-[56ch]">
            <Eyebrow>Where we&apos;ve run in-person workshops</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
              Training delivered on the ground, in {countries.length} countries
            </h2>
            <p className="text-slate mt-5 text-[1.1rem] leading-relaxed">
              What began between two universities in 2022 has taken root in
              person across Nigeria, Ghana, Rwanda, and Uganda. SRN&apos;s wider
              network, through online training and mentorship, reaches further
              still: see the numbers above.
            </p>
          </div>
          <div className="mt-10">
            <ReachMap countries={countries} />
          </div>
        </Container>
      </Section>

      {/* Stories of change. */}
      <Section surface="mist">
        <Container>
          <Eyebrow>Stories of change</Eyebrow>
          <h2 className="text-display text-ink mt-3 max-w-[20ch] text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
            What the work looks like up close
          </h2>
          <div className="border-hairline mt-10 border-t">
            {[
              ...stories.map((s) => s.title),
              ...UPCOMING_IMPACT_STORIES.filter(
                (title) => !stories.some((story) => story.title === title),
              ),
            ].map((title, i) => (
              <div
                key={title}
                className="border-hairline flex items-center justify-between gap-6 border-b py-7"
              >
                <div className="flex items-baseline gap-5">
                  <span className="text-slate text-small tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-display text-ink text-[1.35rem] leading-tight">
                    {title}
                  </span>
                </div>
                <span className="text-slate text-small shrink-0">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Voices. */}
      {testimonials.length > 0 ? (
        <Section surface="paper">
          <Container>
            <Eyebrow>In their words</Eyebrow>
            <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-10">
              {testimonials.map((tm) => (
                <TestimonialBlock
                  key={tm.id}
                  quote={tm.quote}
                  name={tm.name}
                  role={tm.role}
                  photoUrl={tm.photo_url}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Publications belong in Resources, not in the impact-story index. */}
      <Section surface="mist">
        <Container>
          <Thread />
          <div className="mt-8 max-w-[56ch]">
            <Eyebrow>Research publications</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1]">
              Read the evidence SRN has contributed to.
            </h2>
            <p className="text-slate mt-4 leading-relaxed">
              Peer-reviewed publications and verified DOI links are kept in the
              Resources library, separate from stories about SRN&apos;s work.
            </p>
            <Link
              href="/resources?category=publication"
              className="text-ink hover:text-evidence mt-6 inline-flex items-center gap-1.5 font-semibold"
            >
              Browse research publications
              <Icon icon={ArrowRight} size="sm" />
            </Link>
          </div>
        </Container>
      </Section>

      <Section surface="paper">
        <Container>
          <CTABand
            heading="Help the network reach further."
            body="Every partnership, sponsored place, and hosted workshop extends where evidence skills can take root next."
            buttonLabel="Partner with SRN"
            buttonHref="/partner"
          />
        </Container>
      </Section>
    </>
  );
}
