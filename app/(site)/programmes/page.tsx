import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import { getMedia } from "@/lib/queries";
import { PROGRAMMES } from "@/lib/programmes";

/* Sprint 2.3 — Programmes hub. The five offerings as a typographic index
   (matching the homepage), each linking to its subpage. Programmes are
   structural content (see lib/programmes.ts), not a DB entity. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Programmes",
  description:
    "From a first course to a completed meta-analysis — SRN's training, mentorship, and institutional programmes for systematic reviews.",
};

const href = (slug: string) =>
  slug === "mentorship" ? "/programmes/mentorship" : `/programmes/${slug}`;

export default async function ProgrammesPage() {
  const headerPhoto = await getMedia("workshop-session.jpg");

  return (
    <>
      <PageHeader
        eyebrow="Programmes"
        title="Find the right starting point."
        lede="Whether you're framing a first question or finishing a meta-analysis, there's a programme built for your stage — and a person to guide you through it."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          <ul className="index-list">
            {PROGRAMMES.map((p, i) => (
              <li key={p.slug}>
                <Link href={href(p.slug)} className="index-row">
                  <span className="text-display text-slate text-[1.1rem] font-light tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="text-ink flex items-center gap-2.5">
                      <Icon icon={p.icon} size="md" color="evidence" />
                      <span className="text-display block text-[clamp(1.3rem,2.6vw,1.9rem)] font-bold leading-tight">
                        {p.title}
                      </span>
                    </span>
                    <span className="text-slate mt-1 block max-w-[48ch] text-small">
                      {p.tagline}
                    </span>
                  </span>
                  <span className="index-meta-end text-small">
                    <span className="block">{p.format}</span>
                    <span className="block">{p.duration}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Not sure where to start */}
      <Section surface="mist">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>Not sure where to start?</Eyebrow>
              <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
                Most people begin with the Beginner Academy or a webinar.
              </h2>
            </div>
            <p className="text-slate leading-relaxed">
              If you're new to systematic reviews, the Beginner Academy builds
              the foundations in four weeks; the free Webinar Series is a
              low-commitment way to see how we teach. Already running a review?
              The Practical Course and the Mentorship Programme meet you where
              the work is. Building capacity for a whole department? That's
              Institutional Training.
            </p>
          </div>
        </Container>
      </Section>

      <Section surface="paper">
        <Container>
          <CTABand
            heading="Bring evidence synthesis training to your institution."
            body="Host a workshop, sponsor researchers, or co-create evidence with SRN. We work with institutions and funders across low- and middle-income countries."
            buttonLabel="Partner with SRN"
            buttonHref="/partner"
          />
        </Container>
      </Section>
    </>
  );
}
