import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { CTABand } from "@/components/ui/Cards";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { getMedia } from "@/lib/queries";
import { getCourses } from "@/lib/academy/courses";
import { getSessionUser } from "@/lib/admin/auth";

/* The Academy catalogue.
 *
 * Built as a typographic index in the same idiom as /programmes, so the Academy
 * reads as part of the site rather than a bolted-on LMS (Design.md's phase-wide
 * constraint: "indistinguishable in styling from the public pages").
 *
 * The Academy opens when at least one course has been deliberately published.
 * Course material, cohorts and enrolment each have their own publish controls,
 * so this catalogue only ever exposes what staff have approved publicly. */

/* This page reads the staff session so the public catalogue can be hidden
 * without taking the Academy away from the team. Keep it request-rendered:
 * a cached staff response must never be served to an anonymous visitor. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SRN Academy",
  description:
    "Structured courses in systematic reviews and meta-analysis, taught in full, assessed transparently, and certified by SRN.",
};

export default async function AcademyPage() {
  const staff = await getSessionUser();
  const [headerPhoto, courses] = await Promise.all([
    getMedia("drive-selected/2026-09/ghanavirtual2.jpg"),
    staff ? getCourses() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={
          staff ? "Learn the method properly." : "The Academy is coming soon."
        }
        lede={
          staff
            ? "Staff preview: structured courses in systematic reviews and meta-analysis, taught in full, assessed transparently, and certified by SRN."
            : "We are putting the finishing touches to structured courses in systematic reviews and meta-analysis. Join the newsletter and we will let you know when enrolment opens."
        }
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          {!staff ? (
            <div className="max-w-3xl">
              <h2 className="text-display text-ink text-[clamp(1.5rem,3vw,2rem)] leading-tight">
                Courses are being prepared.
              </h2>
              <p className="text-slate mt-4 max-w-2xl text-sm/7">
                Our team is preparing the first public Academy intake. You can
                explore SRN programmes and events while we get it ready.
              </p>
              <div className="mt-5 max-w-md">
                <NewsletterForm surface="light" />
              </div>
            </div>
          ) : courses.length > 0 ? (
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
                No public courses yet.
              </h2>
              <p className="text-slate mt-4 max-w-2xl text-sm/7">
                Staff can continue preparing courses in the admin workspace.
              </p>
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
