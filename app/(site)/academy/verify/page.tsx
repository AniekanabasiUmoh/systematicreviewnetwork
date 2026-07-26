import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { ResendVerification } from "@/components/academy/ResendVerification";
import { getLearner } from "@/lib/academy/auth";
import { syncLearnerVerification } from "@/lib/actions/academy-auth";

/* Sprint 6.1 — where the confirmation link lands, and where an unverified
 * learner is sent when they try to reach something that needs verification.
 *
 * This page runs the verification sync, which is the ONLY path that sets
 * verified_at and the only path that links prior registrations (Phase 6
 * decision 5). It reads Supabase's own email_confirmed_at — nothing in the
 * URL or the request is trusted to decide whether the address was proven. */

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const result = await syncLearnerVerification();
  const learner = await getLearner();

  if (!learner) {
    return (
      <>
        <PageHeader
          eyebrow="SRN Academy"
          title="Confirm your email."
          lede="Follow the link we emailed you, then sign in."
        />
        <Section surface="paper">
          <Container>
            <div className="max-w-xl">
              <p className="text-slate leading-relaxed">
                If you have already confirmed your address, sign in to carry on.
              </p>
              <div className="mt-6">
                <ButtonLink href="/academy/sign-in">Sign in</ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      </>
    );
  }

  if (result.verified || learner.verified_at) {
    return (
      <>
        <PageHeader
          eyebrow="SRN Academy"
          title="Your email is confirmed."
          lede="Your account is ready. You can enrol in a course whenever you like."
        />
        <Section surface="paper">
          <Container>
            <div className="max-w-xl">
              {result.linkedRegistrations > 0 ? (
                <p className="text-slate leading-relaxed">
                  We also found{" "}
                  {result.linkedRegistrations === 1
                    ? "an event registration"
                    : `${result.linkedRegistrations} event registrations`}{" "}
                  made with this address and added{" "}
                  {result.linkedRegistrations === 1 ? "it" : "them"} to your
                  account.
                </p>
              ) : (
                <p className="text-slate leading-relaxed">
                  Everything you enrol in from now on will show up in your
                  account.
                </p>
              )}
              <div className="mt-6">
                <ButtonLink href="/account">Go to your account</ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Confirm your email."
        lede={`We sent a link to ${learner.email}. Follow it to finish setting up your account.`}
      />
      <Section surface="paper">
        <Container>
          <div className="max-w-xl">
            <p className="text-slate leading-relaxed">
              You need to confirm your address before you can enrol in a course.
              If the email has not arrived, check your spam folder — or send it
              again below.
            </p>
            <div className="mt-6">
              <ResendVerification />
            </div>
            <p className="text-slate text-small mt-8">
              Wrong address?{" "}
              <Link
                href="/contact"
                className="text-ink underline underline-offset-2"
              >
                Let us know
              </Link>{" "}
              and we&apos;ll fix it.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
