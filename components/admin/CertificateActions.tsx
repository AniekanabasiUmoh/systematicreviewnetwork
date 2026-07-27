"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  revokeCertificate,
  restoreCertificate,
} from "@/lib/actions/admin-certificates";
import { ActionForm } from "./AcademyActions";
import type { CertificatesRow } from "@/lib/database.types";

/* Sprint 6.7 — withdrawing a certificate.
 *
 * The reason is required and is shown publicly on the verification page, so the
 * form says so before it is typed. An organisation should not be able to
 * withdraw a credential silently. */

const lagos = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function CertificateRow({ row }: { row: CertificatesRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(revokeCertificate, idle);
  const revoked = Boolean(row.revoked_at);

  return (
    <li className="border-hairline bg-paper border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-small font-semibold">{row.learner_name}</p>
          <p className="text-slate text-small mt-1">{row.course_title}</p>
          <p className="text-slate text-small mt-1">
            {row.code} · issued {lagos(row.issued_at)}
            {revoked && row.revoked_at
              ? ` · withdrawn ${lagos(row.revoked_at)}`
              : ""}
          </p>
          {revoked && row.revoked_reason ? (
            <p className="text-slate text-small mt-1">
              Reason given: {row.revoked_reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/verify/${row.code}`}
            className="text-ink text-small underline underline-offset-2"
          >
            Check it
          </a>
          {revoked ? (
            <ActionForm
              action={restoreCertificate}
              fields={{ id: row.id }}
              label="Restore"
              pendingLabel="Restoring…"
              confirm={`Restore ${row.code}? It will verify as genuine again.`}
            />
          ) : (
            <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "Withdraw"}
            </Button>
          )}
        </div>
      </div>

      {open && !revoked ? (
        <form action={formAction} className="border-hairline mt-4 border-t pt-4">
          <input type="hidden" name="id" value={row.id} />
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
          <TextField
            id={`reason_${row.id}`}
            name="reason"
            type="text"
            required
            maxLength={300}
            label="Why is this being withdrawn?"
            hint="Anyone who checks this code will see what you write here."
            error={
              state.status === "error" ? state.fieldErrors?.reason : undefined
            }
          />
          <div className="mt-4 flex justify-end">
            <Button disabled={pending}>
              {pending ? "Withdrawing…" : "Withdraw this certificate"}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
