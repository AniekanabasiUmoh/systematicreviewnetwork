"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TextField, FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { setNewPassword } from "@/lib/actions/admin-auth";
import { idle } from "@/lib/actions/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState(setNewPassword, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      const timer = setTimeout(() => router.push("/admin/login"), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.status, router]);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}
      <TextField
        id="new-password"
        name="password"
        type="password"
        label="New password"
        hint="At least 10 characters."
        required
        autoComplete="new-password"
        autoFocus
        error={state.status === "error" ? state.fieldErrors?.password : undefined}
      />
      <SubmitButton />
    </form>
  );
}
