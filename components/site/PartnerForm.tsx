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
import { submitPartnership } from "@/lib/actions/partnership";
import { idle } from "@/lib/actions/types";

/* §2.7 / §3.1 partnership form. Wired to the real server action: it validates
 * on the server with zod, rate-limits per IP, honours the honeypot, and stores
 * the enquiry in contact_messages (type=partnership). Resend forwarding lands
 * in Sprint 4.3; the write itself is live now.
 *
 * Progressive enhancement: the <form action> works without client JS, and
 * useActionState layers the inline field errors and success state on top. */

const INTERESTS = [
  "Host a training at our institution",
  "Sponsor researchers for a course",
  "Fund a full cohort",
  "Co-create an evidence-synthesis project",
  "Something else",
];

const MAILTO =
  "mailto:info@systematicreviewsnetwork.org?subject=Partnership%20enquiry";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Sending…" : "Send enquiry"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function PartnerForm() {
  const [state, formAction] = useActionState(submitPartnership, idle);
  const [message, setMessage] = useState("");

  const fieldErrors =
    state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return (
      <FormMessage tone="success">
        {state.message} If you&apos;d rather email us directly, we&apos;re at{" "}
        <a href={MAILTO} className="underline">
          info@systematicreviewsnetwork.org
        </a>
        .
      </FormMessage>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="partner-name"
          name="name"
          label="Your name"
          required
          autoComplete="name"
          error={fieldErrors.name}
        />
        <TextField
          id="partner-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
      </div>

      <TextField
        id="partner-institution"
        name="institution"
        label="Institution or organisation"
        autoComplete="organization"
        error={fieldErrors.institution}
      />

      <SelectField
        id="partner-interest"
        name="interest"
        label="What are you interested in?"
        required
        defaultValue=""
        error={fieldErrors.interest}
      >
        <option value="" disabled>
          Choose one…
        </option>
        {INTERESTS.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </SelectField>

      <TextareaField
        id="partner-message"
        name="message"
        label="Tell us a little more"
        hint="What you have in mind, roughly how many researchers, and any timing."
        required
        maxLength={2000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={fieldErrors.message}
      />

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <SubmitButton />
        <a
          href={MAILTO}
          className="text-ink hover:text-evidence text-small font-semibold"
        >
          or email us directly
        </a>
      </div>
    </form>
  );
}
