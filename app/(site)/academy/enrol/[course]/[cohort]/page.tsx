import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getCohort, getCohortSeatCounts } from "@/lib/academy/courses";
import { cohortState, cohortLabel, canEnrol, formatCohortDates } from "@/lib/academy/cohorts";
import { getLearner } from "@/lib/academy/auth";
import { formatPrice, isFree } from "@/lib/events";

/* Sprint 6.2 — the enrol route.
 *
 * §6.2's done-when requires a WORKING enrol route from the public course page;
 * §6.4 builds the payment and the enrolment record. This page is the part that
 * belongs to 6.2: it resolves the cohort, re-checks that enrolment is actually
 * open server-side (a link that was open when the page was rendered may be
 * closed by the time it is clicked), and confirms the learner is signed in and
 * verified before anything else happens.
 *
 * It states plainly what it can and cannot do yet rather than pretending. When
 * 6.4 lands, the final step becomes the Paystack handoff or the free-tier
 * enrolment; everything above it is already correct. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrol",
  robots: { index: false },
};

export default async function EnrolPage({
  params,
}: {
  params: Promise<{ course: string; cohort: string }>;
}) {
  const { course: courseSlug, cohort: cohortSlug } = await params;
  const found = await getCohort(courseSlug, cohortSlug);
  if (!found) notFound();
  const { course, cohort } = found;

  // Middleware already redirects a signed-out visitor here, so this is the
  // belt-and-braces read rather than the gate.
  const learner = await getLearner();
  const seats = await getCohortSeatCounts([cohort.id]);
  const state = cohortState(cohort, seats[cohort.id] ?? 0);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={`Enrol in ${course.title}`}
        lede={`${cohort.label} — ${formatCohortDates(cohort.starts_on, cohort.ends_on, cohort.pacing)}.`}
      />

      <Section surface="paper">
        <Container>
          <div className="border-hairline max-w-2xl border p-6">
            {!canEnrol(state) ? (
              <>
                <h2 className="text-ink font-semibold">
                  {cohortLabel[state]}
                </h2>
                <p className="text-slate mt-2 leading-relaxed">
                  This cohort is not taking enrolments. Other cohorts of this
                  course may be open.
                </p>
                <div className="mt-5">
                  <ButtonLink href={`/academy/${course.slug}`}>
                    Back to {course.title}
                  </ButtonLink>
                </div>
              </>
            ) : !learner ? (
              <>
                <h2 className="text-ink font-semibold">Sign in to enrol</h2>
                <p className="text-slate mt-2 leading-relaxed">
                  Courses need an SRN account so your progress and certificate
                  stay attached to you.
                </p>
                <div className="mt-5">
                  <ButtonLink
                    href={`/academy/sign-in?next=/academy/enrol/${course.slug}/${cohort.slug}`}
                  >
                    Sign in
                  </ButtonLink>
                </div>
              </>
            ) : !learner.verified_at ? (
              <>
                <h2 className="text-ink font-semibold">Confirm your email first</h2>
                <p className="text-slate mt-2 leading-relaxed">
                  We sent a link to {learner.email}. Following it confirms the
                  address is yours, which is what lets us attach a certificate
                  to your name.
                </p>
                <div className="mt-5">
                  <ButtonLink href="/academy/verify">
                    Confirm your email
                  </ButtonLink>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-ink font-semibold">
                  You&rsquo;re ready to enrol
                </h2>
                <p className="text-slate mt-2 leading-relaxed">
                  {isFree(cohort.price_kobo)
                    ? "This cohort is free."
                    : `This cohort costs ${formatPrice(cohort.price_kobo, cohort.currency as "NGN" | "USD")}.`}{" "}
                  Enrolment for {cohort.label} opens for booking shortly —
                  we&rsquo;re finishing the payment and roster step. Your
                  account is confirmed, so there is nothing else for you to do
                  in the meantime.
                </p>
                <p className="text-slate mt-4 leading-relaxed">
                  If you want to be told the moment it opens,{" "}
                  <Link href="/contact" className="text-ink underline underline-offset-2">
                    send us a message
                  </Link>{" "}
                  and we will email you directly.
                </p>
              </>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
