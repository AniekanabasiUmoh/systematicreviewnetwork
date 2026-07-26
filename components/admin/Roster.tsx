"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  manualEnrol,
  withdrawEnrolment,
  recordRefund,
  offerWaitlistSeat,
} from "@/lib/actions/admin-roster";
import { ActionForm } from "./AcademyActions";
import type { RosterRow, WaitlistRow } from "@/lib/admin/academy";
import { formatPrice } from "@/lib/events";
import { rosterStatusLabel, holdsSeat } from "@/lib/admin/roster-labels";

/* Sprint 6.4 — the cohort roster.
 *
 * Every state is shown, including withdrawn and refunded rows: they stay
 * visible and labelled rather than disappearing, because finance
 * reconciliation needs them (§5.12) and a staffer asking "what happened to
 * that person" deserves an answer on the screen. */

export function ManualEnrolForm({ cohortId }: { cohortId: string }) {
  const [state, formAction, pending] = useActionState(manualEnrol, idle);
  return (
    <form action={formAction} className="border-hairline bg-paper border p-5">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <h3 className="text-ink text-small mb-2 font-semibold">
        Add someone yourself
      </h3>
      <p className="text-slate text-small mb-4">
        For people who paid you by invoice, or who you are giving a place to.
        They appear on the roster as &ldquo;paid by invoice&rdquo; rather than
        &ldquo;paid by card&rdquo;, so your Paystack figures still add up.
      </p>
      <p className="text-slate text-small mb-4">
        They need an SRN account first. If they do not have one, ask them to
        sign up — we cannot make it for them, because they would have no
        password to sign in with.
      </p>
      {state.status === "error" && state.formError ? (
        <div className="mb-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-4">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <TextField
            id="roster_email"
            name="email"
            type="email"
            required
            label="Email address"
            error={state.status === "error" ? state.fieldErrors?.email : undefined}
          />
        </div>
        <Button variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add to cohort"}
        </Button>
      </div>
    </form>
  );
}


export function RosterTable({
  rows,
  exportHref,
}: {
  rows: RosterRow[];
  exportHref: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-slate text-small">
        Nobody has enrolled in this cohort yet. Everyone who does appears here,
        with what they paid and when.
      </p>
    );
  }

  const active = rows.filter(holdsSeat).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate text-small">
          {active} {active === 1 ? "person holds a seat" : "people hold seats"} ·{" "}
          {rows.length} {rows.length === 1 ? "row" : "rows"} in total
        </p>
        <a
          href={exportHref}
          className="text-ink text-small underline underline-offset-2"
        >
          Download CSV
        </a>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="border-hairline bg-paper border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink text-small font-semibold">
                  {row.full_name}
                </p>
                <p className="text-slate text-small">{row.email}</p>
                <p className="text-slate text-small mt-1">
                  {rosterStatusLabel(row)}
                  {row.amount_kobo > 0
                    ? ` · ${formatPrice(row.amount_kobo, row.currency as "NGN" | "USD")}`
                    : ""}
                  {" · joined "}
                  {new Date(row.enrolled_at).toLocaleDateString("en-GB", {
                    timeZone: "Africa/Lagos",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.state !== "withdrawn" ? (
                  <ActionForm
                    action={withdrawEnrolment}
                    fields={{ id: row.id }}
                    label="Remove"
                    pendingLabel="Removing…"
                    confirm={`Remove ${row.email} from this cohort?\n\nTheir seat is freed and they lose access to the course. No money is refunded — if you owe them one, make it in Paystack afterwards.`}
                  />
                ) : null}
                {row.payment_status === "paid" ? (
                  <ActionForm
                    action={recordRefund}
                    fields={{ id: row.id }}
                    label="Log a refund I already made"
                    pendingLabel="Saving…"
                    confirm={`Have you already refunded ${row.email} in Paystack?\n\nThis button does not move any money. It records that you refunded them and frees their seat. If you have not done it in Paystack yet, do that first.`}
                  />
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-slate text-small">
        Nobody is waiting for a place on this cohort.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="border-hairline bg-paper flex flex-wrap items-center justify-between gap-3 border p-4"
        >
          <div className="min-w-0">
            <p className="text-ink text-small font-semibold">
              {index + 1}. {row.full_name}
            </p>
            <p className="text-slate text-small">{row.email}</p>
            {row.offered_at ? (
              <p className="text-slate text-small mt-1">
                Offered a seat on{" "}
                {new Date(row.offered_at).toLocaleDateString("en-GB", {
                  timeZone: "Africa/Lagos",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            ) : null}
          </div>
          {!row.offered_at ? (
            <ActionForm
              action={offerWaitlistSeat}
              fields={{ id: row.id }}
              label="Mark as offered"
              pendingLabel="Saving…"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
