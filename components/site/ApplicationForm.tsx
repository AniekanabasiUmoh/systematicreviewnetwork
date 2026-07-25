"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import {
  TextField,
  SelectField,
  TextareaField,
  FormMessage,
  Honeypot,
} from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitApplication } from "@/lib/actions/application";
import { COUNTRIES } from "@/lib/countries";
import { idle } from "@/lib/actions/types";

/* §4.2 application form. Programme select (prefilled from the ?p= slug when the
 * user arrives from a programme page), §6 fields, motivation with a live counter
 * capped at 2,000. On a validation error the fields keep their values — the
 * form recovers without losing input. */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Submitting…" : "Submit application"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function ApplicationForm({
  programmes,
  defaultProgramme,
}: {
  programmes: string[];
  defaultProgramme?: string;
}) {
  const [state, formAction] = useActionState(submitApplication, idle);
  const [motivation, setMotivation] = useState("");

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <SelectField
        id="app-programme"
        name="programme"
        label="Programme"
        required
        defaultValue={
          defaultProgramme && programmes.includes(defaultProgramme)
            ? defaultProgramme
            : ""
        }
        error={fieldErrors.programme}
      >
        <option value="" disabled>
          Choose a programme…
        </option>
        {programmes.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="app-name"
          name="full_name"
          label="Full name"
          required
          autoComplete="name"
          error={fieldErrors.full_name}
        />
        <TextField
          id="app-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="app-institution"
          name="institution"
          label="Institution or organisation"
          autoComplete="organization"
          error={fieldErrors.institution}
        />
        <div>
          <TextField
            id="app-country"
            name="country"
            label="Country"
            required
            list="app-country-list"
            autoComplete="country-name"
            placeholder="Start typing…"
            error={fieldErrors.country}
          />
          <datalist id="app-country-list">
            {COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <TextareaField
        id="app-motivation"
        name="motivation"
        label="Why do you want to join?"
        hint="A few sentences on your background, the review you have in mind, and what you hope to get from the programme."
        required
        maxLength={2000}
        value={motivation}
        onChange={(e) => setMotivation(e.target.value)}
        error={fieldErrors.motivation}
      />

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
