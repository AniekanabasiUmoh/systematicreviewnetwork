import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { CTABand } from "@/components/ui/Cards";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { getMedia } from "@/lib/queries";
import { getCourses } from "@/lib/academy/courses";

/* The Academy catalogue.
 *
 * Built as a typographic index in the same idiom as /programmes, so the Academy
 * reads as part of the site rather than a bolted-on LMS (Design.md's phase-wide
 * constraint: "indistinguishable in styling from the public pages").
 *
 * The Academy opens when at least one course has been deliberately published.
 * Course material, cohorts and enrolment each have their own publish controls,
 * so this catalogue only ever exposes what staff have approved publicly. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "SRN Academy",
  description:
    "Structured courses in systematic reviews and meta-analysis, taught in full, assessed transparently, and certified by SRN.",
};

export default async function AcademyPage() {
  const [headerPhoto, courses] = await Promise.all([
    getMedia("drive-selected/2026-09/ghanavirtual2.jpg"),
    getCourses(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Learn the method properly."
        lede="Structured courses in systematic reviews and meta-analysis, taught in full, assessed transparently, and certified by SRN."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          {courses.length > 0 ? (
            <ul className="index-list">
              {courses.map((course, index) => (
                <li key={course.id}>
                  <Link href={`/academy/${course.slug}`} className="index-row">
                    <span className="text-display text-slate text-[1.1rem] font-light tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="text-display text-ink block text-[clamp(1.3rem,2.6vw,1.9rem)] leading-tight font-bold">
                        {course.title}
                      </span>
                      {course.summary ? (
                        <span className="text-slate text-small mt-1 block max-w-[58ch]">
                          {course.summary}
                        </span>
                      ) : null}
                    </span>
                    <span className="index-meta-end text-small">
                      <span className="block capitalize">
                        {course.delivery}
                      </span>
                      {course.duration_label ? (
                        <span className="block">{course.duration_label}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="max-w-3xl">
              <h2 className="text-display text-ink text-[clamp(1.5rem,3vw,2rem)] leading-tight">
                Courses are being prepared.
              </h2>
              <p className="text-slate mt-4 max-w-2xl text-sm/7">
                Leave your email and we will tell you when the next course
                opens. You can also explore SRN programmes and events today.
              </p>
              <div className="mt-5 max-w-md">
                <NewsletterForm surface="light" />
              </div>
            </div>
          )}
        </Container>
      </Section>

      <Section surface="mist">
        <Container>
          <CTABand
            heading="Not sure which course fits?"
            body="Tell us where you are in your review and we'll point you to the right starting point, whether that is a course, a programme, or a mentor."
            buttonLabel="Ask us"
            buttonHref="/contact"
          />
        </Container>
      </Section>
    </>
  );
}
