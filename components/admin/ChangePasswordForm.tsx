"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TextField, FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { changeOwnPassword } from "@/lib/actions/admin-auth";
import { idle } from "@/lib/actions/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Update password"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPassword, idle);

  return (
    <form action={formAction} className="border-hairline bg-paper max-w-md border p-6">
      <h2 className="text-ink text-small font-semibold">Change password</h2>
      {state.status === "error" && state.formError ? (
        <div className="mt-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mt-4">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="mt-4 space-y-4">
        <TextField
          id="current-password"
          name="current_password"
          type="password"
          label="Current password"
          required
          autoComplete="current-password"
          error={state.status === "error" ? state.fieldErrors?.current_password : undefined}
        />
        <TextField
          id="account-new-password"
          name="password"
          type="password"
          label="New password"
          hint="At least 10 characters."
          required
          autoComplete="new-password"
          error={state.status === "error" ? state.fieldErrors?.password : undefined}
        />
      </div>
      <div className="mt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
