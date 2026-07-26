"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { resendLearnerVerification } from "@/lib/actions/academy-auth";
import { idle, type ActionState } from "@/lib/actions/types";

/* Sprint 6.1 — resend the confirmation email.
 *
 * useActionState needs a (prev, formData) signature; the action takes no form
 * input, so the wrapper simply discards both. */

async function resend(_prev: ActionState): Promise<ActionState> {
  return resendLearnerVerification();
}

export function ResendVerification() {
  const [state, action, pending] = useActionState(resend, idle);

  return (
    <form action={action} className="space-y-3">
      <Button variant="secondary" disabled={pending}>
        {pending ? "Sending…" : "Send the link again"}
      </Button>
      {state.status !== "idle" ? (
        <FormMessage tone={state.status === "success" ? "success" : "error"}>
          {state.status === "success"
            ? state.message
            : (state.formError ?? "We couldn't resend that just now.")}
        </FormMessage>
      ) : null}
    </form>
  );
}
