"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { signInLearner } from "@/lib/actions/academy-auth";
import { idle } from "@/lib/actions/types";

/* Sprint 6.1 — learner sign-in. On success the action redirects, so there is
 * no success state to render here. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full justify-center"
    >
      {pending ? "Signing in…" : "Sign in"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInLearner, idle);

  return (
    <form action={formAction} className="space-y-4">
      <Honeypot />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <TextField
        id="signin-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
      />
      <TextField
        id="signin-password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
      />

      <div className="pt-1">
        <SubmitButton />
      </div>

      <p className="text-slate text-small">
        <Link href="/academy/forgot" className="underline underline-offset-2">
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}
