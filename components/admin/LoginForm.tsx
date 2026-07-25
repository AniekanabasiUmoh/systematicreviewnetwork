"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { signIn } from "@/lib/actions/admin-auth";
import { idle } from "@/lib/actions/types";

/* §5.1 login form. Same shape as every public form: useActionState +
 * useFormStatus, honeypot first, works without JS via the form action. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, idle);

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <TextField
        id="login-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="username"
        autoFocus
      />
      <TextField
        id="login-password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
      />

      <SubmitButton />
    </form>
  );
}
