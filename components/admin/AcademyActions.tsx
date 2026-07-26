"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle, type ActionState } from "@/lib/actions/types";
import {
  setCourseStatus,
  setCohortStatus,
  setCohortEnrolmentClosed,
  archiveCourse,
  archiveCohort,
  deleteCourse,
  deleteCohort,
  duplicateCohort,
} from "@/lib/actions/admin-academy";

/* Sprint 6.2 — the controls beside a course or cohort.
 *
 * Every destructive control states the consequence in the confirm text before
 * the click, not only in the error after it (§5.12's rule). "Archive" is always
 * offered next to "Delete" so the safe option is as easy to reach as the
 * unsafe one. */

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

function ActionForm({
  action,
  fields,
  label,
  pendingLabel,
  confirm,
  variant = "secondary",
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  pendingLabel: string;
  confirm?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button variant={variant} disabled={pending}>
          {pending ? pendingLabel : label}
        </Button>
      </form>
      {state.status !== "idle" ? (
        <div className="mt-2">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "That did not work.")}
          </FormMessage>
        </div>
      ) : null}
    </div>
  );
}

export function CourseStatusControl({
  id,
  status,
}: {
  id: string;
  status: "draft" | "published";
}) {
  const next = status === "published" ? "draft" : "published";
  return (
    <ActionForm
      action={setCourseStatus}
      fields={{ id, status: next }}
      variant="primary"
      label={next === "published" ? "Publish" : "Move to draft"}
      pendingLabel="Updating…"
    />
  );
}

export function CourseDangerZone({
  id,
  title,
  cohortCount,
}: {
  id: string;
  title: string;
  cohortCount: number;
}) {
  return (
    <div className="border-hairline mt-8 border-t pt-6">
      <h2 className="text-ink text-small font-semibold">Archive or delete</h2>
      <p className="text-slate text-small mt-2 max-w-xl">
        {cohortCount > 0
          ? `This course has ${cohortCount} cohort${cohortCount === 1 ? "" : "s"} against it, so it cannot be deleted. Archive it instead — it leaves the public site and every cohort and learner is kept.`
          : "This course has no cohorts, so it can be deleted outright. Archiving is still the safer option if you may run it again."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <ActionForm
          action={archiveCourse}
          fields={{ id }}
          label="Archive course"
          pendingLabel="Archiving…"
          confirm={`Archive ${title}? It will come off the public site. Cohorts and learners are kept, and you can publish it again later.`}
        />
        <ActionForm
          action={deleteCourse}
          fields={{ id }}
          label="Delete course"
          pendingLabel="Deleting…"
          confirm={
            cohortCount > 0
              ? `${title} has ${cohortCount} cohort${cohortCount === 1 ? "" : "s"} and cannot be deleted. Archive it instead.`
              : `Delete ${title}? This cannot be undone.`
          }
        />
      </div>
    </div>
  );
}

export function CohortRowActions({
  id,
  label,
  status,
  enrolmentClosed,
}: {
  id: string;
  label: string;
  status: "draft" | "published";
  enrolmentClosed: boolean;
}) {
  const next = status === "published" ? "draft" : "published";
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ActionForm
        action={setCohortStatus}
        fields={{ id, status: next }}
        label={next === "published" ? "Publish" : "Move to draft"}
        pendingLabel="Updating…"
      />
      <ActionForm
        action={setCohortEnrolmentClosed}
        fields={{ id, closed: enrolmentClosed ? "0" : "1" }}
        label={enrolmentClosed ? "Reopen enrolment" : "Close enrolment"}
        pendingLabel="Updating…"
        confirm={
          enrolmentClosed
            ? undefined
            : `Close enrolment for ${label}? It stays on the public site, marked closed, and nobody new can enrol.`
        }
      />
      <ActionForm
        action={duplicateCohort}
        fields={{ id }}
        label="Duplicate"
        pendingLabel="Duplicating…"
      />
      <ActionForm
        action={archiveCohort}
        fields={{ id }}
        label="Archive"
        pendingLabel="Archiving…"
        confirm={`Archive ${label}? It comes off the public site. Anyone already enrolled keeps their access.`}
      />
      <ActionForm
        action={deleteCohort}
        fields={{ id }}
        label="Delete"
        pendingLabel="Deleting…"
        confirm={`Delete ${label}? This cannot be undone. If anyone is enrolled, archive it instead.`}
      />
    </div>
  );
}
