import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getMedia, getTestimonials } from "@/lib/queries";
import { getProgramme, ctaHref } from "@/lib/programmes";

/* Sprint 2.3 — the flagship Mentorship page. Permanent and linkable; richer
   than a generic programme subpage because it's the offering SRN is known for. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Mentorship Programme",
  description:
    "Paired guidance from an experienced reviewer, through the whole of a live systematic review.",
};

const STEPS = [
  {
    n: "01",
    title: "Tell us about your review",
    body: "You apply with your question and where you've got to. We match you with a mentor whose topic and method fit your work.",
  },
  {
    n: "02",
    title: "Meet your mentor",
    body: "Regular one-to-one sessions across the review. Your mentor has done this before, so the choices that usually stall a review get made with confidence.",
  },
  {
    n: "03",
    title: "Work through the method",
    body: "Protocol, search, screening, appraisal, synthesis — reviewed as you go, not graded at the end. Meta-analysis where your data supports it.",
  },
  {
    n: "04",
    title: "Finish, and submit",
    body: "Support preparing the manuscript, so the review doesn't stall at the last step — the one where most first reviews quietly die.",
  },
];

export default async function MentorshipPage() {
  const programme = getProgramme("mentorship")!;
  const [feature, testimonials] = await Promise.all([
    getMedia("workshop-full-room.jpg"),
    getTestimonials(1),
  ]);
  const testimonial = testimonials[0];

  return (
    <>
      <PageHeader
        eyebrow="Mentorship Programme"
        title="Guidance from someone who has done it before."
        lede="The Mentorship Programme pairs you with an experienced reviewer for the length of a live review — so you stop second-guessing every methodological choice."
        imageUrl={feature?.url}
        imageAlt={feature?.alt ?? ""}
      />

      {/* At a glance + apply. */}
      <Section surface="paper">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <Eyebrow>Why mentorship</Eyebrow>
              <p className="text-ink mt-4 text-[1.25rem] leading-[1.55]">
                {programme.intro}
              </p>
              <p className="text-slate mt-5 leading-relaxed">
                A first systematic review is rarely stopped by a lack of
                effort. It stalls on the dozens of small methodological
                decisions where it isn&apos;t clear what &ldquo;right&rdquo;
                looks like. A mentor who has made those decisions before turns
                each one from a week of doubt into a short conversation.
              </p>
            </div>

            <div className="border-hairline bg-mist border p-8">
              <div className="grid grid-cols-3 gap-px">
                {[
                  ["Format", programme.format],
                  ["Duration", programme.duration],
                  ["For", "Live reviews"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-eyebrow-style text-slate">{label}</p>
                    <p className="text-ink mt-1.5 text-small font-semibold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <hr className="border-hairline my-6" />
              <p className="text-eyebrow-style text-slate">What&apos;s included</p>
              <ul className="mt-4 space-y-3">
                {programme.covers.map((c) => (
                  <li key={c} className="text-ink flex gap-3 leading-relaxed">
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
              <ButtonLink
                href={ctaHref(programme)}
                prefetch={false}
                size="lg"
                className="mt-8 w-full"
              >
                {programme.cta.label}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works — a genuine sequence, so numbered steps are earned. */}
      <Section surface="mist">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
            From application to submission.
          </h2>
          <ol className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-paper border-hairline border p-6">
                <span className="text-display-tight text-ink text-[2rem] leading-none">
                  {s.n}
                </span>
                <h3 className="text-display text-ink mt-4 text-[1.15rem] font-bold leading-snug">
                  {s.title}
                </h3>
                <p className="text-slate text-small mt-2 leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Testimonial, if one exists. */}
      {testimonial ? (
        <section className="relative overflow-hidden bg-ink">
          {feature?.url ? (
            <Image
              src={feature.url}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-[0.18]"
            />
          ) : null}
          <Container className="relative py-20 md:py-28">
            <blockquote className="text-display text-paper mx-auto max-w-[40ch] text-center text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.3]">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <p className="text-paper/70 mt-6 text-center">
              <span className="text-paper font-semibold">
                {testimonial.name}
              </span>
              {testimonial.role ? (
                <span className="text-small"> · {testimonial.role}</span>
              ) : null}
            </p>
          </Container>
        </section>
      ) : null}

      {/* Apply CTA + back link. */}
      <Section surface="paper">
        <Container>
          <div className="border-hairline bg-mist flex flex-col items-start gap-6 border p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <h2 className="text-display text-ink text-[1.5rem] leading-tight md:text-[1.75rem]">
                Ready to start your review with a mentor?
              </h2>
              <p className="text-slate mt-2">
                Applications are reviewed on a rolling basis. Tell us about your
                work and we&apos;ll match you.
              </p>
            </div>
            <ButtonLink
              href={ctaHref(programme)}
              prefetch={false}
              size="lg"
              className="shrink-0"
            >
              {programme.cta.label}
            </ButtonLink>
          </div>
          <p className="mt-10">
            <Link
              href="/programmes"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon icon={ArrowRight} size="sm" className="rotate-180" />
              All programmes
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
