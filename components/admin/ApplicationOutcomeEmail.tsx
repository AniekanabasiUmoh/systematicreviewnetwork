"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { sendApplicationOutcomeEmail } from "@/lib/actions/admin-operations";
import { idle } from "@/lib/actions/types";
import type { ApplicationStatus } from "@/lib/admin/applications";

/* Sprint 5.11 — per-outcome default subject/body, editable before sending.
 * "Reviewable before it goes" means visible in the textarea, not applied
 * silently — nothing sends until the staffer presses Send, and they can
 * rewrite every word first. */
const DEFAULTS: Partial<
  Record<ApplicationStatus, { subject: string; body: string }>
> = {
  accepted: {
    subject: "Your application has been accepted",
    body: "Good news — your application has been accepted. We'll be in touch shortly with the next steps.\n\nCongratulations, and welcome.",
  },
  waitlisted: {
    subject: "Your application: waitlisted",
    body: "Thank you for applying. This intake is full, but we've placed your application on the waitlist — if a place opens up, you'll be the first we contact.",
  },
  rejected: {
    subject: "Your application",
    body: "Thank you for taking the time to apply. After review, we won't be able to offer you a place on this intake.\n\nWe'd encourage you to apply again for a future intake.",
  },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send email"}
    </Button>
  );
}

export function ApplicationOutcomeEmail({
  id,
  status,
}: {
  id: string;
  status: ApplicationStatus;
}) {
  const [state, formAction] = useActionState(sendApplicationOutcomeEmail, idle);
  const defaults = DEFAULTS[status];
  const [subject, setSubject] = useState(defaults?.subject ?? "");
  const [body, setBody] = useState(defaults?.body ?? "");

  if (!defaults) return null;

  return (
    <div className="border-hairline bg-paper mt-6 border p-4">
      <h2 className="text-ink text-small font-semibold">Send outcome email</h2>
      <p className="text-slate mt-1 text-[0.8125rem]">
        Pre-filled for this status. Edit it before sending — nothing sends
        automatically.
      </p>

      <form
        action={formAction}
        className="mt-4"
        onSubmit={(e) => {
          if (!window.confirm("Send this email to the applicant?")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        {state.status === "error" && state.formError ? (
          <div className="mb-3">
            <FormMessage tone="error">{state.formError}</FormMessage>
          </div>
        ) : null}
        {state.status === "success" ? (
          <div className="mb-3">
            <FormMessage tone="success">{state.message}</FormMessage>
          </div>
        ) : null}
        <label htmlFor="outcome-subject" className="text-ink text-small block font-medium">
          Subject
        </label>
        <input
          id="outcome-subject"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border-hairline text-ink text-small mt-1.5 w-full border px-3 py-2"
        />
        <label htmlFor="outcome-body" className="text-ink text-small mt-3 block font-medium">
          Message
        </label>
        <textarea
          id="outcome-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="border-hairline text-ink text-small mt-1.5 w-full border px-3 py-2"
        />
        <div className="mt-3">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
