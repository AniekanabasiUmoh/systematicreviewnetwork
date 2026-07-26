"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { enrol, joinWaitlist } from "@/lib/actions/enrolment";

/* Sprint 6.4 — the enrol control.
 *
 * The redirect is decided by the SERVER and returned in the action result,
 * never chosen here: for a free cohort it goes to the course, for a paid one to
 * Paystack. A client that picked its own destination would be a client that
 * could skip the payment step. */

export function EnrolButton({
  courseSlug,
  cohortSlug,
  free,
  priceLabel,
}: {
  courseSlug: string;
  cohortSlug: string;
  free: boolean;
  priceLabel: string;
}) {
  const [state, formAction, pending] = useActionState(enrol, idle);
  const router = useRouter();

  useEffect(() => {
    const target = (state as { redirectTo?: string }).redirectTo;
    if (state.status === "success" && target) {
      /* An external checkout URL needs a full navigation; an internal one can
         stay within the router so the session is preserved. */
      if (target.startsWith("http")) window.location.assign(target);
      else router.push(target);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="course" value={courseSlug} />
      <input type="hidden" name="cohort" value={cohortSlug} />

      {state.status === "error" && state.formError ? (
        <div className="mb-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-4">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}

      <Button disabled={pending}>
        {pending
          ? free
            ? "Enrolling…"
            : "Taking you to payment…"
          : free
            ? "Enrol — free"
            : `Enrol — pay ${priceLabel}`}
      </Button>
    </form>
  );
}

export function WaitlistButton({
  courseSlug,
  cohortSlug,
}: {
  courseSlug: string;
  cohortSlug: string;
}) {
  const [state, formAction, pending] = useActionState(joinWaitlist, idle);
  return (
    <form action={formAction}>
      <input type="hidden" name="course" value={courseSlug} />
      <input type="hidden" name="cohort" value={cohortSlug} />
      {state.status !== "idle" ? (
        <div className="mb-4">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "That did not work.")}
          </FormMessage>
        </div>
      ) : null}
      {state.status !== "success" ? (
        <Button variant="secondary" disabled={pending}>
          {pending ? "Adding you…" : "Join the waiting list"}
        </Button>
      ) : null}
    </form>
  );
}
