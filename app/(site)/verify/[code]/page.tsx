import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { verifyCode } from "@/lib/academy/certificates";

/* Sprint 6.7 — the verification result.
 *
 * The audience is an employer or a funder who has never used this site and may
 * never use it again. So the answer is the first thing on the page, in a full
 * sentence, and the detail sits underneath it.
 *
 * Three outcomes, all stated plainly. A REVOKED certificate is never reported
 * as unknown: the holder did earn it and SRN did withdraw it, and collapsing
 * those into "no such certificate" would both hide a fact the checker needs and
 * make a genuine award look like a forgery. */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const result = await verifyCode(code);
  return {
    title:
      result.status === "valid"
        ? `Certificate verified — ${result.certificate.course_title}`
        : "Certificate check",
    /* Not indexed: these pages carry a named individual's credential, and they
       should be reachable by someone holding the code, not by a search. */
    robots: { index: false, follow: false },
  };
}

export default async function VerifyResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await verifyCode(code);

  if (result.status === "unknown") {
    return (
      <>
        <PageHeader
          eyebrow="SRN Academy"
          title="We did not issue this certificate."
          lede="No certificate in our records carries that code."
        />
        <Section surface="paper">
          <Container>
            <div className="border-hairline max-w-2xl border p-6">
              <p className="text-slate leading-relaxed">
                Check the code against the certificate — the letters O and I are
                never used, so a character that looks like one is a zero or a
                one being misread. If it still does not check out, the document
                did not come from us.
              </p>
              <div className="mt-6">
                <ButtonLink href="/verify">Try another code</ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      </>
    );
  }

  const certificate = result.certificate;
  const revoked = result.status === "revoked";
  /* Sprint 7.3 — one page verifies both kinds. An event certificate says
     "Event" and "Attended" rather than "Course" and "Completed", because a
     verification page that misdescribes what was earned is a poor witness. */
  const isAttendance = certificate.cohort_label === "Attendance";

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={
          revoked
            ? "This certificate has been withdrawn."
            : "This certificate is genuine."
        }
        lede={
          revoked
            ? "We issued it, and we have since withdrawn it. It should not be treated as current."
            : `Issued by the Systematic Reviews Network to ${certificate.learner_name}.`
        }
      />

      <Section surface="paper">
        <Container>
          <div className="max-w-2xl">
            <div className="border-hairline border p-6">
              <p className="flex items-start gap-2.5">
                <Icon
                  icon={revoked ? AlertCircle : CheckCircle2}
                  size="sm"
                  color={revoked ? "current" : "evidence"}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-ink font-semibold">
                  {revoked ? "Withdrawn certificate" : "Verified"}
                </span>
              </p>

              <dl className="mt-5 space-y-4">
                <Row label="Awarded to" value={certificate.learner_name} />
                <Row
                  label={isAttendance ? "Event" : "Course"}
                  value={certificate.course_title}
                />
                {isAttendance ? (
                  certificate.cohort_dates ? (
                    <Row label="Held" value={certificate.cohort_dates} />
                  ) : null
                ) : (
                  <Row
                    label="Cohort"
                    value={
                      certificate.cohort_dates
                        ? `${certificate.cohort_label} · ${certificate.cohort_dates}`
                        : certificate.cohort_label
                    }
                  />
                )}
                <Row
                  label={isAttendance ? "Attended" : "Completed"}
                  value={formatDate(certificate.completed_on)}
                />
                <Row label="Code" value={certificate.code} />
                {revoked && certificate.revoked_at ? (
                  <Row
                    label="Withdrawn on"
                    value={formatDateTime(certificate.revoked_at)}
                  />
                ) : null}
                {revoked && certificate.revoked_reason ? (
                  <Row label="Reason" value={certificate.revoked_reason} />
                ) : null}
              </dl>
            </div>

            {!revoked ? (
              <div className="mt-6">
                <ButtonLink href={`/api/academy/certificate/${certificate.code}`}>
                  View the certificate
                </ButtonLink>
              </div>
            ) : null}

            <p className="text-slate mt-8 leading-relaxed">
              Checking a different one?{" "}
              <Link href="/verify" className="text-ink underline underline-offset-2">
                Enter another code
              </Link>
              . If something here looks wrong,{" "}
              <Link href="/contact" className="text-ink underline underline-offset-2">
                tell us
              </Link>
              .
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-hairline grid gap-1 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-slate text-small">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function formatDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
