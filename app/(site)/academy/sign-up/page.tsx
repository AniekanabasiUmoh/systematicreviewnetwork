import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignUpForm } from "@/components/academy/SignUpForm";
import { getLearner } from "@/lib/academy/auth";

/* Sprint 6.1 — learner sign-up. The first public auth surface on the site;
 * staff sign-in at /admin stays entirely separate and is not linked from here. */

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create an SRN Academy account to enrol in courses, track your progress, and earn a verifiable certificate.",
};

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  // Already signed in — no reason to show a sign-up form.
  if (await getLearner()) redirect("/account");

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title="Create your account."
        lede="An account lets you enrol in courses, pick up where you left off, and collect a certificate you can prove is genuine."
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
            <div className="max-w-xl">
              <SignUpForm />
              <p className="text-slate text-small mt-6">
                Already have an account?{" "}
                <Link
                  href="/academy/sign-in"
                  className="text-ink font-semibold underline underline-offset-2"
                >
                  Sign in
                </Link>
                .
              </p>
            </div>

            <aside className="border-hairline border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <h2 className="text-ink text-small font-semibold">
                What an account gives you
              </h2>
              <ul className="text-slate mt-4 space-y-3 text-small leading-relaxed">
                <li>
                  Enrol in courses and keep access to the material after the
                  course finishes.
                </li>
                <li>
                  Resume a lesson on any device — your progress follows your
                  account, not your browser.
                </li>
                <li>
                  A certificate on completion, with a public link an employer
                  can check.
                </li>
              </ul>
              <p className="text-slate text-small mt-6 leading-relaxed">
                Registering for a free webinar does not need an account. This is
                for the Academy.
              </p>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
