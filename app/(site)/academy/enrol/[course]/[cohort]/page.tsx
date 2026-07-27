import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getCohort, getCohortSeatCounts } from "@/lib/academy/courses";
import { cohortState, cohortLabel, canEnrol, formatCohortDates } from "@/lib/academy/cohorts";
import { getLearner } from "@/lib/academy/auth";
import { formatPrice, isFree } from "@/lib/events";
import { EnrolButton, WaitlistButton } from "@/components/academy/EnrolButton";

/* The enrol route (6.2, completed in 6.4).
 *
 * Resolves the cohort, re-checks server-side that enrolment is actually open —
 * a link that was open when the page rendered may be closed by the time it is
 * clicked — and confirms the learner is signed in and verified before offering
 * the button.
 *
 * The check here decides what to SHOW. lib/actions/enrolment.ts re-runs all of
 * it at the moment of the click, because that is the one that has to be right. */

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
                  {state === "full"
                    ? "Every seat on this cohort is taken. Join the waiting list and we will offer you a place if one frees up — you will not be charged unless you take it."
                    : "This cohort is not taking enrolments. Other cohorts of this course may be open."}
                </p>
                {state === "full" && learner?.verified_at ? (
                  <div className="mt-5">
                    <WaitlistButton
                      courseSlug={course.slug}
                      cohortSlug={cohort.slug}
                    />
                  </div>
                ) : null}
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
                <p className="text-slate mt-2 mb-6 leading-relaxed">
                  {isFree(cohort.price_kobo)
                    ? "This cohort is free. You will still get your own course page, and your access does not expire when the cohort finishes."
                    : `This cohort costs ${formatPrice(cohort.price_kobo, cohort.currency as "NGN" | "USD")}. Payment is taken by Paystack — we never see your card details — and your place is confirmed the moment it clears.`}
                </p>
                <EnrolButton
                  courseSlug={course.slug}
                  cohortSlug={cohort.slug}
                  free={isFree(cohort.price_kobo)}
                  priceLabel={formatPrice(
                    cohort.price_kobo,
                    cohort.currency as "NGN" | "USD",
                  )}
                />
              </>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
