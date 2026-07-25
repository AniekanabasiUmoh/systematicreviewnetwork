import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import {
  getProgrammes,
  getProgrammeBySlug,
  programmeCtaHref,
  programmeList,
} from "@/lib/queries";

/* Sprint 2.3 — a subpage per programme. Mentorship is excluded here: it has its
   own bespoke, permanent page at /programmes/mentorship.
   Sprint 5.7 — reads from the database rather than a hard-coded array. */

export const revalidate = 60;

/* Pre-render every published programme subpage except mentorship. */
export async function generateStaticParams() {
  const programmes = await getProgrammes();
  return programmes
    .filter((p) => p.slug !== "mentorship")
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgrammeBySlug(slug);
  if (!p || p.slug === "mentorship") return { title: "Programme" };
  return { title: p.title, description: p.tagline ?? undefined };
}

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProgrammeBySlug(slug);
  if (!p || p.slug === "mentorship") notFound();

  const covers = programmeList(p.covers);
  const forWho = programmeList(p.for_who);

  return (
    <>
      <PageHeader
        eyebrow="Programme"
        title={p.title}
        lede={p.tagline ?? undefined}
      />

      {/* At-a-glance facts. Any that are unset are simply not shown. */}
      <Section surface="paper" className="!pb-0">
        <Container>
          <dl className="border-hairline grid grid-cols-1 gap-px border sm:grid-cols-3">
            {(
              [
                ["Who it's for", p.audience],
                ["Format", p.format],
                ["Duration", p.duration],
              ] as const
            )
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="bg-paper p-6">
                  <dt className="text-eyebrow-style text-slate">{label}</dt>
                  <dd className="text-display text-ink mt-2 text-[1.15rem] font-bold leading-snug">
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
        </Container>
      </Section>

      {/* Intro + what it covers. */}
      <Section surface="paper">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div>
              <Eyebrow>About this programme</Eyebrow>
              <p className="text-ink mt-4 text-[1.25rem] leading-[1.55]">
                {p.intro}
              </p>
              {forWho.length > 0 ? (
                <div className="mt-8">
                  <p className="text-eyebrow-style text-slate">
                    Who it&apos;s for
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {forWho.map((w) => (
                      <li
                        key={w}
                        className="text-slate flex gap-3 leading-relaxed"
                      >
                        <span
                          aria-hidden
                          className="bg-evidence mt-[0.6em] h-1.5 w-1.5 shrink-0"
                        />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="border-hairline bg-mist border p-8">
              {covers.length > 0 ? (
                <>
                  <p className="text-eyebrow-style text-slate">
                    What you&apos;ll cover
                  </p>
                  <ul className="mt-5 space-y-4">
                    {covers.map((c) => (
                      <li
                        key={c}
                        className="text-ink flex gap-3 leading-relaxed"
                      >
                        <Icon
                          icon={Check}
                          size="sm"
                          color="evidence"
                          className="mt-1 shrink-0"
                        />
                        {c}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <ButtonLink
                href={programmeCtaHref(p)}
                prefetch={false}
                className={covers.length > 0 ? "mt-8" : ""}
              >
                {p.cta_label ?? "Apply now"}
              </ButtonLink>
            </div>
          </div>

          <p className="mt-12">
            <Link
              href="/programmes"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon
                icon={ArrowRight}
                size="sm"
                className="rotate-180"
              />
              All programmes
            </Link>
          </p>
        </Container>
      </Section>

      <Section surface="mist">
        <Container>
          <CTABand
            heading="Have a question before you apply?"
            body="Tell us about your work and what you're hoping to get from the programme, and we'll point you to the right starting point."
            buttonLabel="Get in touch"
            buttonHref="/contact"
          />
        </Container>
      </Section>
    </>
  );
}
