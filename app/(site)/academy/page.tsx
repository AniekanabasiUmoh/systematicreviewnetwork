import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { CTABand } from "@/components/ui/Cards";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { getMedia } from "@/lib/queries";

/* The Academy catalogue.
 *
 * Built as a typographic index in the same idiom as /programmes, so the Academy
 * reads as part of the site rather than a bolted-on LMS (Design.md's phase-wide
 * constraint: "indistinguishable in styling from the public pages").
 *
 * 2026-08 — held at "coming soon" at the client's request: course content is
 * being written by the facilitation team over the coming months. The catalogue
 * listing is deliberately NOT rendered from `getCourses()` any more. Reading
 * the table would mean that publishing any course silently reopens the Academy
 * and undoes this decision; holding it closed has to be an explicit edit here.
 *
 * Everything behind this page still works — sign-in, enrolment, the LMS — so it
 * can be demonstrated to facilitators. Those routes simply are not linked from
 * anywhere public. When the first course is ready, restore the `getCourses()`
 * index from git history and delete the block below. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "SRN Academy",
  description:
    "Structured courses in systematic reviews and meta-analysis, taught in full, assessed transparently, and certified by SRN. Coming soon.",
};

export default async function AcademyPage() {
  const headerPhoto = await getMedia("workshop-session.jpg");

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
          <div className="max-w-3xl">
            <h2 className="text-display text-ink text-[clamp(1.5rem,3vw,2rem)] leading-tight">
              Coming soon.
            </h2>
            <p className="text-slate mt-4 max-w-2xl text-sm/7">
              The Academy is being built. Our facilitation team is developing
              the course content over the coming months, and we would rather
              open it late than open it half-written. Two other routes are open
              to you today.
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
                href="/news"
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

            {/* Notify-me. Reuses the newsletter signup rather than adding a
                separate waiting list: one list, one unsubscribe path. */}
            <div className="border-hairline mt-12 border-t pt-8">
              <h3 className="text-ink font-semibold">
                Hear when the first course opens
              </h3>
              <p className="text-slate mt-2 max-w-[52ch] text-sm/7">
                Leave your email and we will tell you when enrolment opens. It
                is the same list we use for the newsletter, and you can
                unsubscribe from any message.
              </p>
              <div className="mt-5 max-w-md">
                <NewsletterForm surface="light" />
              </div>
            </div>
          </div>
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
