"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { sendRegistrantMessage } from "@/lib/actions/admin-operations";
import { idle } from "@/lib/actions/types";
import { CopyEmailsButton } from "./CopyEmailsButton";

type Recipient = { full_name: string; email: string };

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || count === 0}>
      {pending ? "Sending…" : `Send to ${count} registrant${count === 1 ? "" : "s"}`}
    </Button>
  );
}

/* Sprint 5.11 — "copy all emails" ships as the primary control; compose is a
 * secondary option beneath it. One sendEmail per recipient happens server-side
 * (lib/actions/admin-operations.ts) — this component only ever sees the list
 * it's sending to, never constructs a shared recipient string for the wire. */
export function RegistrantMessageForm({
  recipients,
}: {
  recipients: Recipient[];
}) {
  const [state, formAction] = useActionState(sendRegistrantMessage, idle);
  const [open, setOpen] = useState(false);
  const emails = recipients.map((r) => r.email);

  return (
    <div className="border-hairline bg-paper mb-6 border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <CopyEmailsButton emails={emails} />
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Compose a message"}
        </Button>
      </div>

      {open ? (
        <form
          action={formAction}
          className="mt-4"
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Send this message to ${recipients.length} registrant${recipients.length === 1 ? "" : "s"}?`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="recipients" value={JSON.stringify(recipients)} />
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
          <label htmlFor="registrant-subject" className="text-ink text-small block font-medium">
            Subject
          </label>
          <input
            id="registrant-subject"
            name="subject"
            required
            className="border-hairline text-ink text-small mt-1.5 w-full border px-3 py-2"
          />
          <label htmlFor="registrant-body" className="text-ink text-small mt-3 block font-medium">
            Message
          </label>
          <textarea
            id="registrant-body"
            name="body"
            required
            rows={5}
            className="border-hairline text-ink text-small mt-1.5 w-full border px-3 py-2"
          />
          <div className="mt-3">
            <SubmitButton count={recipients.length} />
          </div>
        </form>
      ) : null}
    </div>
  );
}
