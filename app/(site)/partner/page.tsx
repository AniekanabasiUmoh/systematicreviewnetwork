import type { Metadata } from "next";
import {
  GraduationCap,
  Users,
  Layers,
  Handshake,
  HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { PartnerForm } from "@/components/site/PartnerForm";
import { getImpactStats, getMedia } from "@/lib/queries";
import { StatCounter } from "@/components/ui/StatCounter";

/* Sprint 2.7 — Partner with SRN. Four ways to partner, a Donate section, and a
   typed partnership enquiry form. Donations are live Paystack in v1 (§13.5),
   but the checkout itself is Phase 4 — so the Donate section makes the case and
   routes to the enquiry for now, never showing a dead payment control. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Partner with SRN",
  description:
    "Host a training, sponsor researchers, fund a cohort, or co-create an evidence-synthesis project — and help evidence skills take root where they're needed most.",
};

const OPTIONS: {
  icon: LucideIcon;
  title: string;
  body: string;
  who: string;
}[] = [
  {
    icon: GraduationCap,
    title: "Host a training",
    body: "Bring an SRN course or workshop to your institution — online or in person. We handle the teaching; you open it to your researchers.",
    who: "Universities · research institutes · hospitals",
  },
  {
    icon: Users,
    title: "Sponsor researchers",
    body: "Cover the places of researchers who couldn't otherwise attend a paid course, so cost is never the reason someone can't learn the method.",
    who: "Funders · societies · departments",
  },
  {
    icon: Layers,
    title: "Fund a cohort",
    body: "Underwrite a full cohort end to end — a group of researchers taken from first principles to a registered, reproducible review together.",
    who: "Foundations · corporate partners",
  },
  {
    icon: Handshake,
    title: "Co-create evidence",
    body: "Work with us on an evidence-synthesis project in your priority area, pairing your questions with our review method and mentorship.",
    who: "NGOs · ministries · research networks",
  },
];

export default async function PartnerPage() {
  const [stats, headerPhoto] = await Promise.all([
    getImpactStats(),
    getMedia("team-at-workshop-banner.jpg"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Partner with SRN"
        title="Help evidence skills take root where they're needed most."
        lede="Every partnership, sponsored place, and hosted workshop extends where researchers can learn to produce trustworthy reviews — and keep producing them long after the training ends."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      {/* Why partner — grounded in the network's own numbers. */}
      {stats.length > 0 ? (
        <section className="bg-ink" aria-labelledby="partner-numbers">
          <Container>
            <h2 id="partner-numbers" className="sr-only">
              The network so far
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

      {/* Ways to partner. */}
      <Section surface="paper">
        <Container>
          <div className="max-w-[56ch]">
            <Eyebrow>Ways to partner</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
              Four ways to work with us
            </h2>
            <p className="text-slate mt-5 text-[1.1rem] leading-relaxed">
              Each one is a route to the same outcome: more researchers able to
              produce evidence to standard. Not sure which fits? Tell us what you
              have in mind below.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {OPTIONS.map((o) => (
              <article
                key={o.title}
                className="border-hairline bg-paper flex flex-col border p-6"
              >
                <span className="bg-evidence-tint flex h-11 w-11 items-center justify-center">
                  <Icon icon={o.icon} size="lg" color="evidence" />
                </span>
                <h3 className="text-ink mt-4 text-[1.25rem] leading-snug font-semibold">
                  {o.title}
                </h3>
                <p className="text-slate text-small mt-2 flex-1 leading-relaxed">
                  {o.body}
                </p>
                <p className="text-slate mt-4 text-[0.8125rem] font-semibold">
                  {o.who}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* Donate. */}
      <Section surface="mist" id="donate">
        <Container>
          <div className="border-hairline bg-paper border p-8 md:p-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
              <span className="bg-evidence-tint flex h-14 w-14 shrink-0 items-center justify-center">
                <Icon icon={HeartHandshake} size="lg" color="evidence" />
              </span>
              <div>
                <Eyebrow>Donate</Eyebrow>
                <h2 className="text-display text-ink mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1]">
                  Give what you can — every amount trains someone.
                </h2>
                <p className="text-slate mt-4 max-w-[54ch] leading-relaxed">
                  A donation of any size goes directly to running courses,
                  sponsoring places, and reaching researchers in new places.
                  You can give in your own name or anonymously. Secure online
                  giving is opening here shortly; in the meantime, get in touch
                  and we&apos;ll arrange it with you.
                </p>
                <ButtonLink href="#partner-enquiry" className="mt-7">
                  Talk to us about giving
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Enquiry form. */}
      <Section surface="paper" id="partner-enquiry">
        <Container>
          <div className="mx-auto max-w-[var(--container-prose)]">
            <Eyebrow>Start a conversation</Eyebrow>
            <h2 className="text-display text-ink mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1]">
              Tell us what you have in mind
            </h2>
            <p className="text-slate mt-4 leading-relaxed">
              Whether it&apos;s a single workshop or a multi-year programme,
              we&apos;d like to hear from you. Share a few details and the right
              person will reply.
            </p>
            <div className="mt-8">
              <PartnerForm />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
