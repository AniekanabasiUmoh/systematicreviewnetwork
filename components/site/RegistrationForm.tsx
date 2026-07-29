"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { TextField, FormMessage, Honeypot } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitRegistration } from "@/lib/actions/registration";
import { COUNTRIES } from "@/lib/countries";
import { idle } from "@/lib/actions/types";

/* §4.1 registration form. Free events register in place; paid events return a
 * { status: "redirect" } with the Paystack checkout URL, which we follow. The
 * country field is a datalist-backed input: type-to-filter, no JS library, and
 * it degrades to a normal text field. */

function SubmitButton({ paid }: { paid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
      {pending
        ? paid
          ? "Taking you to payment…"
          : "Registering…"
        : paid
          ? "Register & pay"
          : "Register"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function RegistrationForm({
  eventId,
  paid,
  questions,
}: {
  eventId: string;
  paid: boolean;
  /* Sprint 7.2 — rendered on the server and passed through, because the
     questions never change while the form is open and this component is
     already a client boundary. */
  questions?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(submitRegistration, idle);

  // Paid path: the action returns a checkout URL to redirect to.
  useEffect(() => {
    if (state.status === "redirect") {
      window.location.href = state.url;
    }
  }, [state]);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <Honeypot />
      <input type="hidden" name="event_id" value={eventId} />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <TextField
        id="reg-name"
        name="full_name"
        label="Full name"
        required
        autoComplete="name"
        error={fieldErrors.full_name}
      />
      <TextField
        id="reg-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        error={fieldErrors.email}
      />
      <TextField
        id="reg-institution"
        name="institution"
        label="Institution or organisation"
        autoComplete="organization"
        error={fieldErrors.institution}
      />
      <div>
        <TextField
          id="reg-country"
          name="country"
          label="Country"
          required
          list="country-list"
          autoComplete="country-name"
          placeholder="Start typing…"
          error={fieldErrors.country}
        />
        <datalist id="country-list">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {questions}

      <div className="pt-1">
        <SubmitButton paid={paid} />
      </div>
      {state.status === "redirect" ? (
        <p className="text-slate text-small text-center">
          Redirecting to secure payment…
        </p>
      ) : null}
    </form>
  );
}
