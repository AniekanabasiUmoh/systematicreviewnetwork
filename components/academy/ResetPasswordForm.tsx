"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { TextField, FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { setNewPassword } from "@/lib/actions/admin-auth";
import { idle } from "@/lib/actions/types";

/* Sprint 6.1 — set a new password from the emailed reset link.
 *
 * Reuses setNewPassword from admin-auth: it operates on whoever holds the
 * current recovery session via Supabase's updateUser, which is identical for a
 * learner and a staffer. Duplicating it would mean two copies of a
 * password-setting path to keep correct, which is worse than sharing one. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(setNewPassword, idle);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Link
          href="/academy/sign-in"
          className="text-ink text-small underline underline-offset-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <TextField
        id="reset-password"
        name="password"
        type="password"
        label="New password"
        required
        autoComplete="new-password"
        minLength={10}
        hint="At least 10 characters."
        error={fieldErrors.password}
      />
      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
