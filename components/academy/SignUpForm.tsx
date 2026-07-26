"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { signUpLearner } from "@/lib/actions/academy-auth";
import { COUNTRIES } from "@/lib/countries";
import { idle } from "@/lib/actions/types";

/* Sprint 6.1 — learner sign-up. Same visual language as RegistrationForm: the
 * Academy is part of the site, not a product with its own look. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full justify-center"
    >
      {pending ? "Creating your account…" : "Create account"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpLearner, idle);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="space-y-3">
        <FormMessage tone="success">{state.message}</FormMessage>
        <p className="text-slate text-small">
          The link confirms your email address. You need to follow it before you
          can enrol in a course.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Honeypot />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <TextField
        id="signup-name"
        name="full_name"
        label="Full name"
        required
        autoComplete="name"
        error={fieldErrors.full_name}
      />
      <TextField
        id="signup-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        hint="We'll send a confirmation link here."
        error={fieldErrors.email}
      />
      <TextField
        id="signup-password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="new-password"
        minLength={10}
        hint="At least 10 characters."
        error={fieldErrors.password}
      />
      <TextField
        id="signup-institution"
        name="institution"
        label="Institution or organisation"
        autoComplete="organization"
        error={fieldErrors.institution}
      />
      <div>
        <TextField
          id="signup-country"
          name="country"
          label="Country"
          required
          list="signup-country-list"
          autoComplete="country-name"
          placeholder="Start typing…"
          error={fieldErrors.country}
        />
        <datalist id="signup-country-list">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
