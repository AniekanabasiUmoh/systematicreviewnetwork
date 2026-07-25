"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  setAttendance,
  cancelRegistration,
} from "@/lib/actions/admin-operations";
import { idle } from "@/lib/actions/types";

function TinyButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-ink text-[0.75rem] font-semibold underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/* Sprint 5.11 — per-registration attendance and cancellation, rendered as a
 * compact actions cell. Kept as its own small component rather than
 * generalising SubmissionList with a row-actions slot for one screen. */
export function RegistrationRowActions({
  id,
  attended,
  cancelled,
}: {
  id: string;
  attended: boolean;
  cancelled: boolean;
}) {
  const [, attendanceAction] = useActionState(setAttendance, idle);
  const [, cancelAction] = useActionState(cancelRegistration, idle);

  if (cancelled) {
    return <span className="text-slate text-[0.75rem]">Cancelled</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={attendanceAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="attended" value={String(!attended)} />
        <TinyButton
          label={attended ? "Mark not attended" : "Mark attended"}
          pendingLabel="Saving…"
        />
      </form>
      <form
        action={cancelAction}
        onSubmit={(e) => {
          if (!window.confirm("Cancel this registration? This frees the seat."))
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="refunded" value="false" />
        <TinyButton label="Cancel" pendingLabel="Cancelling…" />
      </form>
    </div>
  );
}
