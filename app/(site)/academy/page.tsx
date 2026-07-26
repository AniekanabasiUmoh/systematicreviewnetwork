import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { CTABand } from "@/components/ui/Cards";
import { getCourses } from "@/lib/academy/courses";
import { getMedia } from "@/lib/queries";
import { LEVEL_LABELS, DELIVERY_LABELS } from "@/lib/academy/cohorts";

/* Sprint 6.2 — the Academy catalogue.
 *
 * Built as a typographic index in the same idiom as /programmes, so the Academy
 * reads as part of the site rather than a bolted-on LMS (Design.md's phase-wide
 * constraint: "indistinguishable in styling from the public pages"). */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "SRN Academy",
  description:
    "Structured courses in systematic review and meta-analysis methods, taught by the Systematic Review Network.",
};

export default async function AcademyPage() {
  const [headerPhoto, courses] = await Promise.all([
    getMedia("workshop-session.jpg"),
    getCourses(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Learn the method properly."
        lede="Structured courses in systematic review and meta-analysis — taught in full, assessed honestly, and certified by SRN."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          {courses.length === 0 ? (
            <div className="max-w-2xl">
              <p className="text-slate leading-relaxed">
                The first Academy courses are being finalised now. In the
                meantime, our{" "}
                <Link href="/programmes" className="text-ink underline underline-offset-2">
                  programmes
                </Link>{" "}
                cover the same ground with mentorship, and{" "}
                <Link href="/news/events" className="text-ink underline underline-offset-2">
                  upcoming events
                </Link>{" "}
                are open to register for today.
              </p>
            </div>
          ) : (
            <ul className="index-list">
              {courses.map((course, i) => (
                <li key={course.slug}>
                  <Link href={`/academy/${course.slug}`} className="index-row">
                    <span className="text-display text-slate text-[1.1rem] font-light tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="text-display text-ink block text-[clamp(1.3rem,2.6vw,1.9rem)] leading-tight font-bold">
                        {course.title}
                      </span>
                      {course.summary ? (
                        <span className="text-slate text-small mt-1 block max-w-[48ch]">
                          {course.summary}
                        </span>
                      ) : null}
                    </span>
                    <span className="index-meta-end text-small">
                      <span className="block">
                        {LEVEL_LABELS[course.level] ?? course.level}
                      </span>
                      <span className="block">
                        {DELIVERY_LABELS[course.delivery] ?? course.delivery}
                      </span>
                      {course.duration_label ? (
                        <span className="block">{course.duration_label}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <Section surface="mist">
        <Container>
          <CTABand
            heading="Not sure which course fits?"
            body="Tell us where you are in your review and we'll point you to the right starting point — a course, a programme, or a mentor."
            buttonLabel="Ask us"
            buttonHref="/contact"
          />
        </Container>
      </Section>
    </>
  );
}
