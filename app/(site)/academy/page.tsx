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
            /* Sprint 6.10 — this was one sentence adrift in an empty band. An
               empty catalogue is the normal state until the first course is
               reviewed and published, so it has to do some work: say what is
               coming, and point at the two things that ARE open today. */
            <div className="max-w-3xl">
              <h2 className="text-display text-ink text-[clamp(1.5rem,3vw,2rem)] leading-tight">
                The first courses are being finalised.
              </h2>
              <p className="text-slate mt-4 max-w-2xl text-sm/7">
                SRN Academy courses are written and reviewed by the people who
                run our workshops, so they take a while to get right. Two other
                routes are open to you today.
              </p>

              <div className="mt-10 grid gap-px sm:grid-cols-2">
                <Link
                  href="/programmes"
                  className="border-hairline group border p-6 sm:p-7"
                >
                  <h3 className="text-ink font-semibold group-hover:underline">
                    Programmes
                  </h3>
                  <p className="text-slate mt-2 text-sm/7">
                    The same ground as a course, taught with a mentor alongside
                    you. Applications open at intervals through the year.
                  </p>
                </Link>
                <Link
                  href="/news/events"
                  className="border-hairline group border p-6 sm:border-l-0 sm:p-7"
                >
                  <h3 className="text-ink font-semibold group-hover:underline">
                    Workshops and webinars
                  </h3>
                  <p className="text-slate mt-2 text-sm/7">
                    Shorter sessions on a single topic, most of them free.
                    Anything with a date open for registration is listed here.
                  </p>
                </Link>
              </div>

              <p className="text-slate/80 mt-8 text-[0.8125rem]/6">
                Want to hear when the first course opens? The newsletter at the
                foot of this page is the only thing we use it for.
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
