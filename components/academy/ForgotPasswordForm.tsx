"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { requestLearnerPasswordReset } from "@/lib/actions/academy-auth";
import { idle } from "@/lib/actions/types";

/* Sprint 6.1 — request a password reset. The response is identical whether or
 * not the address has an account (see the action), so this component has no
 * "no such account" branch to render by design. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestLearnerPasswordReset, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <Honeypot />
      <TextField
        id="forgot-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
      />
      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
