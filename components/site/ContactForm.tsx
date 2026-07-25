"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import {
  TextField,
  TextareaField,
  FormMessage,
  Honeypot,
} from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitContact } from "@/lib/actions/contact";
import { idle } from "@/lib/actions/types";

/* §4.3 contact form. Wired to submitContact (type=general). Server-validated
 * with zod, rate-limited, honeypot-guarded; the message is stored and — once
 * Sprint 4.3's forwarding is on — emailed to SRN with reply-to set to the
 * sender. Works without JS via the form action. */

const MAILTO = "mailto:info@systematicreviewsnetwork.org";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Sending…" : "Send message"}
      {!pending ? <Icon icon={ArrowRight} size="sm" /> : null}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, idle);
  const [message, setMessage] = useState("");

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />
      <input type="hidden" name="type" value="general" />

      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="contact-name"
          name="name"
          label="Your name"
          required
          autoComplete="name"
          error={fieldErrors.name}
        />
        <TextField
          id="contact-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
      </div>

      <TextField
        id="contact-subject"
        name="subject"
        label="Subject"
        error={fieldErrors.subject}
      />

      <TextareaField
        id="contact-message"
        name="message"
        label="Message"
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
