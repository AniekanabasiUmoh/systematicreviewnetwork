"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/actions/admin-auth";
import { idle } from "@/lib/actions/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}
      <TextField
        id="forgot-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="username"
        autoFocus
      />
      <SubmitButton />
    </form>
  );
}
