"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { TextField, FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { updateLearnerProfile } from "@/lib/actions/academy-auth";
import { COUNTRIES } from "@/lib/countries";
import { idle } from "@/lib/actions/types";
import type { Learner } from "@/lib/academy/auth";

/* Sprint 6.1 — edit your own profile.
 *
 * Email is shown but NOT editable: it identifies the account, and changing it
 * is a re-verification flow rather than a text field. It is also the address
 * that past registrations were matched on, and those are historical snapshots
 * (Phase 6 decision 5). */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function ProfileForm({ learner }: { learner: Learner }) {
  const [state, formAction] = useActionState(updateLearnerProfile, idle);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}
      {state.status === "success" ? (
        <FormMessage tone="success">{state.message}</FormMessage>
      ) : null}

      <TextField
        id="profile-email"
        label="Email"
        value={learner.email}
        readOnly
        disabled
        hint="Contact us if you need to change the address on your account."
      />
      <TextField
        id="profile-name"
        name="full_name"
        label="Full name"
        required
        autoComplete="name"
        defaultValue={learner.full_name ?? ""}
        error={fieldErrors.full_name}
      />
      <TextField
        id="profile-institution"
        name="institution"
        label="Institution or organisation"
        autoComplete="organization"
        defaultValue={learner.institution ?? ""}
        error={fieldErrors.institution}
      />
      <div>
        <TextField
          id="profile-country"
          name="country"
          label="Country"
          required
          list="profile-country-list"
          autoComplete="country-name"
          defaultValue={learner.country ?? ""}
          error={fieldErrors.country}
        />
        <datalist id="profile-country-list">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <TextField
        id="profile-orcid"
        name="orcid"
        label="ORCID"
        placeholder="0000-0002-1825-0097"
        defaultValue={learner.orcid ?? ""}
        hint="Optional. Your ORCID researcher identifier, if you have one."
        error={fieldErrors.orcid}
      />

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
