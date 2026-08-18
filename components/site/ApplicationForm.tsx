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
import { APPLICANT_ROLES, ROLE_LABELS } from "@/lib/admin/applications";
import { idle } from "@/lib/actions/types";

/* §4.2 application form. Programme select (prefilled from the ?p= slug when the
 * user arrives from a programme page), §6 fields, motivation with a live counter
 * capped at 2,000. On a validation error the fields keep their values — the
 * form recovers without losing input.
 *
 * 2026-08: the Mentorship Programme matches three groups (mentees, mentors,
 * librarians), so it asks which one you are. Which programmes ask is decided by
 * the server and passed in as `roleProgrammes` — the client never matches on a
 * programme title itself, so renaming the programme in the admin cannot quietly
 * stop the question being asked. */

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
  roleProgrammes = [],
}: {
  programmes: string[];
  defaultProgramme?: string;
  /** Programme titles that ask which role the applicant is applying for. */
  roleProgrammes?: string[];
}) {
  const [state, formAction] = useActionState(submitApplication, idle);
  const [motivation, setMotivation] = useState("");

  const initialProgramme =
    defaultProgramme && programmes.includes(defaultProgramme)
      ? defaultProgramme
      : "";
  const [programme, setProgramme] = useState(initialProgramme);
  const asksRole = roleProgrammes.includes(programme);

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
        value={programme}
        onChange={(e) => setProgramme(e.target.value)}
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

      {/* Mentorship only. Unmounting the field means no `applicant_role` is
          submitted for the other programmes, which is what the nullable column
          expects — rather than sending an empty string the server has to
          special-case. */}
      {asksRole ? (
        <SelectField
          id="app-role"
          name="applicant_role"
          label="Applying as"
          required
          defaultValue=""
          error={fieldErrors.applicant_role}
          hint="We match mentees with mentors after each intake closes. Librarians support search strategy across several reviews."
        >
          <option value="" disabled>
            Choose one…
          </option>
          {APPLICANT_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </SelectField>
      ) : null}

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
