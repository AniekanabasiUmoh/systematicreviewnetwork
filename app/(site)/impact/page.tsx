import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

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
  getResources,
  getMedia,
} from "@/lib/queries";

/* Sprint 2.5 — Impact. The reach map is the page's memorable device; the rest
   stays disciplined. Everything is data-driven (impact_stats, reach_countries,
   testimonials, the impact-story-* pages, the publications resource category)
   and the page reads correctly with zero JavaScript: the map has a list
   fallback, the counters server-render their real values. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Where SRN works and the change our training and mentorship set in motion — across Africa, South Asia, and Latin America.",
};

export default async function ImpactPage() {
  const [stats, countries, testimonials, stories, publications, headerPhoto] =
    await Promise.all([
      getImpactStats(),
      getReachCountries(),
      getTestimonials(),
      getImpactStories(),
      getResources("publication"),
      getMedia("award-of-honour.jpg"),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Our impact"
        title="Evidence skills that stay where they're built."
        lede="SRN measures success not by a single review, but by researchers who can produce trustworthy reviews again and again — in the places the evidence is needed most."
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
            <div className="grid grid-cols-2 gap-px bg-paper/10 md:grid-cols-3">
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
            <Eyebrow>Where we work</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
              A network across {countries.length} countries, and growing
            </h2>
            <p className="text-slate mt-5 text-[1.1rem] leading-relaxed">
              What began between two universities in 2022 now reaches
              researchers across three continents. Each point is a place where
              SRN training or mentorship has taken root.
            </p>
          </div>
          <div className="mt-10">
            <ReachMap countries={countries} />
          </div>
        </Container>
      </Section>

      {/* Stories of change. */}
      {stories.length > 0 ? (
        <Section surface="mist">
          <Container>
            <Eyebrow>Stories of change</Eyebrow>
            <h2 className="text-display text-ink mt-3 max-w-[20ch] text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
              What the work looks like up close
            </h2>
            <div className="border-hairline mt-10 border-t">
              {stories.map((s, i) => (
                <Link
                  key={s.slug}
                  href={`/impact/${s.slug}`}
                  className="border-hairline group flex items-center justify-between gap-6 border-b py-7 transition-colors hover:bg-paper"
                >
                  <div className="flex items-baseline gap-5">
                    <span className="text-slate text-small tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-display text-ink group-hover:text-evidence text-[1.35rem] leading-tight transition-colors">
                      {s.title}
                    </span>
                  </div>
                  <Icon
                    icon={ArrowRight}
                    size="sm"
                    className="text-slate group-hover:text-evidence shrink-0 transition-colors"
                  />
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

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

      {/* Reports / publications download. */}
      {publications.length > 0 ? (
        <Section surface="mist">
          <Container>
            <Thread />
            <div className="mt-8 max-w-[56ch]">
              <Eyebrow>Read the record</Eyebrow>
              <h2 className="text-display text-ink mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1]">
                Our activities, in full
              </h2>
              <p className="text-slate mt-4 leading-relaxed">
                The detail behind the numbers — what we ran, where, and what came
                of it.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {publications.map((pub) => {
                const href = pub.file_url ?? pub.external_url;
                return (
                  <li key={pub.slug}>
                    {href ? (
                      <a
                        href={href}
                        className="border-hairline bg-paper hover:border-ink flex items-center justify-between gap-6 border p-5 transition-colors"
                      >
                        <span className="text-ink font-semibold">
                          {pub.title}
                        </span>
                        <Icon
                          icon={Download}
                          size="sm"
                          className="text-slate shrink-0"
                        />
                      </a>
                    ) : (
                      <Link
                        href={`/resources/${pub.slug}`}
                        className="border-hairline bg-paper hover:border-ink flex items-center justify-between gap-6 border p-5 transition-colors"
                      >
                        <span className="text-ink font-semibold">
                          {pub.title}
                        </span>
                        <Icon
                          icon={ArrowRight}
                          size="sm"
                          className="text-slate shrink-0"
                        />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Container>
        </Section>
      ) : null}

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
