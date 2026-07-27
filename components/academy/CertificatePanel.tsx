"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { claimCertificate } from "@/lib/actions/certificate";

/* Sprint 6.7 — the learner's certificate panel.
 *
 * Three states, and the middle one matters most: someone who has NOT finished
 * is told exactly what is outstanding, not simply refused. */

export function CertificateClaim({
  courseSlug,
  cohortSlug,
  eligible,
  reason,
}: {
  courseSlug: string;
  cohortSlug: string;
  eligible: boolean;
  reason: string | null;
}) {
  const [state, formAction, pending] = useActionState(claimCertificate, idle);

  if (state.status === "success") {
    return (
      <div>
        <FormMessage tone="success">{state.message}</FormMessage>
        <p className="text-slate mt-4 leading-relaxed">
          Refresh this page to download it, or check your email — we have sent
          you the link and the code.
        </p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div>
        <p className="text-ink font-semibold">Not finished yet</p>
        <p className="text-slate mt-2 leading-relaxed">
          {reason ?? "There is still work outstanding on this course."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="course" value={courseSlug} />
      <input type="hidden" name="cohort" value={cohortSlug} />

      {state.status === "error" && state.formError ? (
        <div className="mb-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}

      <p className="text-ink font-semibold">You have finished this course.</p>
      <p className="text-slate mt-2 mb-5 leading-relaxed">
        Claim your certificate and we will give you a code an employer can
        check. It does not expire.
      </p>
      <Button disabled={pending}>
        {pending ? "Issuing…" : "Claim your certificate"}
      </Button>
    </form>
  );
}

export function CertificateIssuedPanel({
  code,
  revoked,
}: {
  code: string;
  revoked: boolean;
}) {
  return (
    <div>
      <p className="text-ink font-semibold">
        {revoked ? "This certificate has been withdrawn." : "Your certificate"}
      </p>
      {revoked ? (
        <p className="text-slate mt-2 leading-relaxed">
          If you were not expecting this, get in touch and we will explain.
        </p>
      ) : (
        <>
          <p className="text-slate mt-2 leading-relaxed">
            Verification code{" "}
            <span className="text-ink font-semibold">{code}</span>. Anyone can
            check it — no account needed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`/api/academy/certificate/${code}`}>
              Download it
            </ButtonLink>
            <ButtonLink href={`/verify/${code}`} variant="secondary">
              See what an employer sees
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
