"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { idle } from "@/lib/actions/types";
import {
  setApplicationStatus,
  addApplicationNote,
} from "@/lib/actions/admin-operations";
import {
  APPLICATION_TRANSITIONS,
  type ApplicationStatus,
} from "@/lib/admin/applications";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: "Received",
  under_review: "Under review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

function TransitionButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border-ink text-ink text-small border px-3 py-1.5 font-semibold disabled:opacity-60"
    >
      {pending ? "…" : "Move here"}
    </button>
  );
}

export function ApplicationStatusControl({
  id,
  status,
}: {
  id: string;
  status: ApplicationStatus;
}) {
  const [state, formAction] = useActionState(setApplicationStatus, idle);
  const options = APPLICATION_TRANSITIONS[status] ?? [];

  return (
    <div className="border-hairline bg-paper border p-4">
      <p className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
        Current status
      </p>
      <p className="text-ink mt-1 text-[1.05rem] font-semibold">
        {STATUS_LABELS[status]}
      </p>
      {options.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((next) => (
            <form key={next} action={formAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={next} />
              <input type="hidden" name="label" value={STATUS_LABELS[next]} />
              <TransitionButton />
              <span className="text-slate ml-2 text-[0.8125rem]">
                {STATUS_LABELS[next]}
              </span>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-slate mt-3 text-small">
          This is a final status. No further transitions are available.
        </p>
      )}
      {state.status === "error" ? (
        <p className="text-tag-orange mt-3 text-small">{state.formError}</p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-slate mt-3 text-small">{state.message}</p>
      ) : null}
    </div>
  );
}

type Note = { body: string; author_email: string; at: string };

function AddNoteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-evidence text-paper text-small px-4 py-2 font-semibold disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add note"}
    </button>
  );
}

export function ApplicationNotes({
  id,
  notes,
}: {
  id: string;
  notes: Note[];
}) {
  const [state, formAction] = useActionState(addApplicationNote, idle);

  return (
    <div className="border-hairline bg-paper mt-6 border p-4">
      <h2 className="text-ink text-small font-semibold">Internal notes</h2>
      <p className="text-slate mt-1 text-[0.8125rem]">
        Visible to staff only. Notes cannot be edited or deleted once saved.
      </p>

      {notes.length > 0 ? (
        <ul className="border-hairline mt-4 divide-y">
          {notes.map((note, i) => (
            <li key={i} className="py-3">
              <p className="text-ink text-small whitespace-pre-wrap">{note.body}</p>
              <p className="text-slate mt-1 text-[0.75rem]">
                {note.author_email} ·{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Lagos",
                }).format(new Date(note.at))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate mt-4 text-small">No notes yet.</p>
      )}

      <form action={formAction} className="mt-4">
        <input type="hidden" name="id" value={id} />
        <label htmlFor="note" className="sr-only">
          Add a note
        </label>
        <textarea
          id="note"
          name="note"
          required
          rows={3}
          placeholder="Add a note for other staff…"
          className="border-hairline text-ink text-small w-full border px-3 py-2"
        />
        <div className="mt-2 flex items-center gap-3">
          <AddNoteButton />
          {state.status === "error" ? (
            <p className="text-tag-orange text-small">{state.formError}</p>
          ) : null}
          {state.status === "success" ? (
            <p className="text-slate text-small">{state.message}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
