import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { requireLearner } from "@/lib/academy/auth";
import {
  listMyApplications,
  applicantStatusLabel,
  applicantNextStep,
  stepIndex,
} from "@/lib/academy/applications";
import {
  ApplicationStepper,
  DocumentUpload,
  DocumentRow,
} from "@/components/academy/ApplicationPanel";

/* Sprint 7.1 — the applicant's self-service view.
 *
 * §7.1 asks for the staff stepper from 5.6 mirrored back to the person who
 * applied, plus somewhere to attach a CV or protocol. What it deliberately does
 * NOT include is anything a reviewer wrote: internal notes are internal, and a
 * half-formed reservation about a candidate is not something to show them. */

export const metadata: Metadata = {
  title: "Your applications",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const DECIDED = ["accepted", "waitlisted", "rejected"];

export default async function MyApplicationsPage() {
  const learner = await requireLearner();
  const applications = await listMyApplications(learner);

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Your applications"
        lede="Where each application has got to, and anything you still want to send us."
        compact
      />

      <Section surface="paper">
        <Container>
          {!learner.verified_at ? (
            <div className="border-hairline max-w-2xl border p-6">
              <h2 className="text-ink font-semibold">Confirm your email first</h2>
              <p className="text-slate mt-2 text-sm/7">
                We can only show you an application once we know the address is
                yours. We sent a link to {learner.email}.
              </p>
              <div className="mt-5">
                <ButtonLink href="/academy/verify">
                  Confirm your email
                </ButtonLink>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="max-w-2xl">
              <p className="text-slate text-sm/7">
                You have not applied to a programme yet. Our{" "}
                <Link
                  href="/programmes"
                  className="text-ink underline underline-offset-2"
                >
                  programmes
                </Link>{" "}
                page lists what is open, and anything you apply for with{" "}
                {learner.email} will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-w-3xl space-y-10">
              {applications.map((application) => {
                const decided = DECIDED.includes(application.status);
                return (
                  <li
                    key={application.id}
                    className="border-hairline border p-6 sm:p-7"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className="text-display text-ink text-[1.25rem] leading-snug">
                        {application.programme}
                      </h2>
                      <p className="text-slate/80 text-[0.8125rem]">
                        Applied{" "}
                        {new Date(application.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            timeZone: "Africa/Lagos",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>

                    <p className="text-ink mt-4 text-sm/6 font-semibold">
                      {applicantStatusLabel(application.status)}
                    </p>
                    {applicantNextStep(application.status) ? (
                      <p className="text-slate mt-1 text-sm/7">
                        {applicantNextStep(application.status)}
                      </p>
                    ) : null}

                    <div className="mt-6">
                      <ApplicationStepper
                        current={stepIndex(application.status)}
                        outcome={
                          decided
                            ? (application.status as
                                | "accepted"
                                | "waitlisted"
                                | "rejected")
                            : null
                        }
                      />
                    </div>

                    {application.documents.length > 0 ? (
                      <ul className="mt-7 space-y-2">
                        {application.documents.map((doc) => (
                          <DocumentRow
                            key={doc.id}
                            id={doc.id}
                            fileName={doc.file_name}
                            kind={doc.kind}
                            href={`/account/applications/documents/${doc.id}`}
                          />
                        ))}
                      </ul>
                    ) : null}

                    {/* Once a decision is made there is nothing useful left to
                        send, and offering the form would imply otherwise. */}
                    {!decided ? (
                      <DocumentUpload applicationId={application.id} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-slate/80 mt-10 text-[0.8125rem]/6">
            <Link href="/account" className="underline underline-offset-2">
              Back to your account
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
