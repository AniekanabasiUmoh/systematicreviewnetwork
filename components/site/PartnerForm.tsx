"use client";

import { useState } from "react";
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

/* §2.7 partnership form. Typed exactly to the `contact_messages` shape with
   type=partnership (§6). The server action that stores the message and forwards
   it via Resend lands in Sprint 4.3; until then this validates in the browser
   and, on submit, is honest — it never claims to have sent anything it hasn't.
   It offers the email fallback so an interested partner is never stuck.

   Kept a client component (not a dead server form) so the fields, the required
   states, and the character counter are all real and demonstrably correct now,
   which is what §2.7 "partnership form typed correctly" asks for. */

const INTERESTS = [
  "Host a training at our institution",
  "Sponsor researchers for a course",
  "Fund a full cohort",
  "Co-create an evidence-synthesis project",
  "Something else",
];

const MAILTO =
  "mailto:info@systematicreviewsnetwork.org?subject=Partnership%20enquiry";

export function PartnerForm() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        /* No write yet (Phase 4.3). Prevent a real navigation and show the
           honest holding state rather than pretending to have sent it. */
        e.preventDefault();
        setSubmitted(true);
      }}
      aria-describedby={submitted ? "partner-form-status" : undefined}
    >
      <Honeypot />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="partner-name"
          name="name"
          label="Your name"
          required
          autoComplete="name"
        />
        <TextField
          id="partner-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
        />
      </div>

      <TextField
        id="partner-institution"
        name="institution"
        label="Institution or organisation"
        autoComplete="organization"
      />

      <SelectField
        id="partner-interest"
        name="interest"
        label="What are you interested in?"
        required
        defaultValue=""
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
      />

      {submitted ? (
        <div id="partner-form-status">
          <FormMessage tone="success">
            Thanks — online submission is opening here shortly. For now, please
            send your enquiry to{" "}
            <a href={MAILTO} className="underline">
              info@systematicreviewsnetwork.org
            </a>{" "}
            and we&apos;ll get straight back to you.
          </FormMessage>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Button type="submit" size="lg">
            Send enquiry
            <Icon icon={ArrowRight} size="sm" />
          </Button>
          <a
            href={MAILTO}
            className="text-ink hover:text-evidence text-small font-semibold"
          >
            or email us directly
          </a>
        </div>
      )}
    </form>
  );
}
