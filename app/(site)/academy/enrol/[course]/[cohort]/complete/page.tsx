import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import { getEnrolment } from "@/lib/academy/curriculum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/paystack";

/* Sprint 6.4 — where Paystack sends the learner back.
 *
 * This page NEVER grants access. The webhook (§13.3) is the only thing that
 * turns a pending enrolment active, because anyone can visit this URL directly
 * with a made-up reference. What this page does is:
 *
 *   1. read the enrolment we already hold for this learner and cohort;
 *   2. if it is still pending, verify with Paystack server-side — the webhook
 *      may not have landed yet, and a learner staring at "pending" after a
 *      successful payment is the worst version of this screen;
 *   3. say plainly what is true right now.
 *
 * Step 2 writes the same row the webhook would, scoped to still-pending, so
 * whichever arrives first wins and the other is a no-op. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrolment",
  robots: { index: false },
};

export default async function EnrolCompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ course: string; cohort: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { course: courseSlug, cohort: cohortSlug } = await params;
  const query = await searchParams;
  const learner = await requireVerifiedLearner();

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found) notFound();
  const { course, cohort } = found;

  const { data: row } = await supabaseAdmin
    .from("enrolments")
    .select("id, state, payment_status, paystack_reference")
    .eq("learner_id", learner.id)
    .eq("cohort_id", cohort.id)
    .maybeSingle();

  if (!row) notFound();

  let paymentStatus = row.payment_status;

  /* Belt and braces (§13.3): verify server-side rather than trusting the query
     string. Paystack sends the reference back as `reference` or `trxref`; we
     only ever act on the one stored against THIS learner's row, so a forged
     query string cannot fulfil someone else's enrolment. */
  if (paymentStatus === "pending" && row.paystack_reference) {
    const claimed = query.reference ?? query.trxref;
    if (claimed === row.paystack_reference) {
      const verified = await verifyTransaction(row.paystack_reference);
      if (verified.ok && verified.status === "success") {
        const { data: updated } = await supabaseAdmin
          .from("enrolments")
          .update({
            state: "active",
            payment_status: "paid",
            paid_at: verified.paidAt ?? new Date().toISOString(),
          } as never)
          .eq("id", row.id)
          .eq("payment_status", "pending")
          .select("payment_status")
          .maybeSingle();
        if (updated) paymentStatus = updated.payment_status;
      }
    }
  }

  const access = await getEnrolment(learner.id, cohort.id);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={access ? "You're enrolled." : "Payment in progress"}
        lede={`${course.title} — ${cohort.label}.`}
      />

      <Section surface="paper">
        <Container>
          <div className="border-hairline max-w-2xl border p-6">
            {access ? (
              <>
                <p className="text-slate leading-relaxed">
                  Your payment went through and your place is confirmed. The
                  course is open to you now, and your access does not expire
                  when the cohort finishes.
                </p>
                <div className="mt-6">
                  <ButtonLink href={`/academy/learn/${course.slug}/${cohort.slug}`}>
                    Open your course
                  </ButtonLink>
                </div>
              </>
            ) : paymentStatus === "pending" ? (
              <>
                <p className="text-slate leading-relaxed">
                  Your bank has not confirmed the payment to us yet. This
                  usually takes a few seconds. Wait a moment and refresh this
                  page.
                </p>
                <p className="text-slate mt-4 leading-relaxed">
                  If money has left your account and this message is still here
                  in ten minutes,{" "}
                  <Link
                    href="/contact"
                    className="text-ink underline underline-offset-2"
                  >
                    tell us
                  </Link>
                  . We can see the payment on our side and will put it right —
                  you will not be charged twice.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate leading-relaxed">
                  This payment did not complete, so you have not been charged
                  and no place is held. You can try again whenever you are
                  ready.
                </p>
                <div className="mt-6">
                  <ButtonLink href={`/academy/enrol/${course.slug}/${cohort.slug}`}>
                    Try again
                  </ButtonLink>
                </div>
              </>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
