"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  saveSession,
  deleteSession,
  saveAnnouncement,
  publishAnnouncement,
} from "@/lib/actions/admin-sessions";
import { ActionForm } from "./AcademyActions";

/* Sprint 6.5 — scheduling sessions and posting announcements. */

export type SessionRow = {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  join_url: string | null;
  attendees: number;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  published_at: string | null;
  author_email: string | null;
};

const lagos = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

export function SessionForm({ cohortId }: { cohortId: string }) {
  const [state, formAction, pending] = useActionState(saveSession, idle);
  return (
    <form action={formAction} className="border-hairline bg-paper border p-5">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <h3 className="text-ink text-small mb-2 font-semibold">
        Schedule a session
      </h3>
      <p className="text-slate text-small mb-4">
        The joining link is private. Learners on this cohort see it fifteen
        minutes before the start and not before — and it never appears on any
        public page.
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="session_title"
            name="title"
            type="text"
            required
            maxLength={180}
            label="What is it called"
            error={state.status === "error" ? state.fieldErrors?.title : undefined}
          />
        </div>
        <TextField
          id="session_starts"
          name="starts_at"
          type="datetime-local"
          required
          label="Starts"
          hint="Lagos time."
          error={
            state.status === "error" ? state.fieldErrors?.starts_at : undefined
          }
        />
        <TextField
          id="session_duration"
          name="duration_minutes"
          type="number"
          min={1}
          step={1}
          defaultValue={60}
          required
          label="How long (minutes)"
          error={
            state.status === "error"
              ? state.fieldErrors?.duration_minutes
              : undefined
          }
        />
        <div className="sm:col-span-2">
          <TextField
            id="session_join"
            name="join_url"
            type="url"
            label="Joining link"
            hint="The Zoom or Meet link. Must start with https://."
            error={
              state.status === "error" ? state.fieldErrors?.join_url : undefined
            }
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Add session"}
        </Button>
      </div>
    </form>
  );
}

export function SessionList({ rows }: { rows: SessionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-slate text-small">
        No sessions scheduled for this cohort yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="border-hairline bg-paper flex flex-wrap items-start justify-between gap-3 border p-4"
        >
          <div className="min-w-0">
            <p className="text-ink text-small font-semibold">{row.title}</p>
            <p className="text-slate text-small mt-1">
              {lagos(row.starts_at)} · {row.duration_minutes} minutes
            </p>
            <p className="text-slate text-small mt-1">
              {row.join_url
                ? "Joining link set"
                : "No joining link yet — learners will see a note instead"}
              {row.attendees > 0
                ? ` · ${row.attendees} ${row.attendees === 1 ? "person" : "people"} joined`
                : ""}
            </p>
          </div>
          <ActionForm
            action={deleteSession}
            fields={{ id: row.id }}
            label="Delete"
            pendingLabel="Deleting…"
            confirm={`Delete "${row.title}"? This cannot be undone.`}
          />
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementForm({ cohortId }: { cohortId: string }) {
  const [state, formAction, pending] = useActionState(saveAnnouncement, idle);
  return (
    <form action={formAction} className="border-hairline bg-paper border p-5">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <h3 className="text-ink text-small mb-2 font-semibold">
        Post an announcement
      </h3>
      <p className="text-slate text-small mb-4">
        Appears on the course page for everyone enrolled on this cohort. Save it
        as a draft first if you are not ready for them to see it.
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

      <TextField
        id="announcement_title"
        name="title"
        type="text"
        required
        maxLength={180}
        label="Heading"
        error={state.status === "error" ? state.fieldErrors?.title : undefined}
      />

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" name="publish" value="false" disabled={pending}>
          {pending ? "Saving…" : "Save as draft"}
        </Button>
        <Button name="publish" value="true" disabled={pending}>
          {pending ? "Posting…" : "Post it now"}
        </Button>
      </div>
    </form>
  );
}

export function AnnouncementList({ rows }: { rows: AnnouncementRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-slate text-small">
        Nothing has been announced to this cohort yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="border-hairline bg-paper flex flex-wrap items-start justify-between gap-3 border p-4"
        >
          <div className="min-w-0">
            <p className="text-ink text-small font-semibold">{row.title}</p>
            <p className="text-slate text-small mt-1">
              {row.published_at
                ? `Posted ${lagos(row.published_at)}`
                : "Draft — nobody can see this yet"}
              {row.author_email ? ` · ${row.author_email}` : ""}
            </p>
          </div>
          <ActionForm
            action={publishAnnouncement}
            fields={{ id: row.id }}
            label={row.published_at ? "Take it down" : "Post it"}
            pendingLabel="Saving…"
          />
        </li>
      ))}
    </ul>
  );
}
