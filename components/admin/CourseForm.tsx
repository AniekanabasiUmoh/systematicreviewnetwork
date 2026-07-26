"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { saveCourse, saveCohort } from "@/lib/actions/admin-academy";
import type { AdminField } from "@/lib/admin/resources";
import { AdminFormField } from "./FormFields";

/* Sprint 6.2 — the course and cohort editors.
 *
 * Same markup, same field renderer and same states as ResourceForm; only the
 * action differs, because courses and cohorts live outside the flat registry
 * (see lib/admin/academy.ts for why). */

type Values = Record<string, unknown> & { id?: string };

function AcademyForm({
  action,
  fields,
  initial,
  label,
  hidden,
}: {
  action: typeof saveCourse;
  fields: ReadonlyArray<AdminField>;
  initial?: Values | null;
  label: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  return (
    <form action={formAction} className="border-hairline bg-paper border p-6">
      {initial?.id ? <input type="hidden" name="id" value={String(initial.id)} /> : null}
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === "error" && state.formError ? (
        <div className="mb-5">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-5">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        {fields
          .filter((field) => !(hidden && field.name in hidden))
          .map((field) => (
            <AdminFormField
              key={field.name}
              field={field}
              value={initial?.[field.name]}
              error={
                state.status === "error"
                  ? state.fieldErrors?.[field.name]
                  : undefined
              }
            />
          ))}
      </div>
      <div className="mt-7 flex justify-end">
        <Button disabled={pending}>
          {pending ? "Saving…" : `Save ${label}`}
        </Button>
      </div>
    </form>
  );
}

export function CourseForm({
  fields,
  initial,
}: {
  fields: ReadonlyArray<AdminField>;
  initial?: Values | null;
}) {
  return (
    <AcademyForm action={saveCourse} fields={fields} initial={initial} label="course" />
  );
}

export function CohortForm({
  fields,
  initial,
  courseId,
}: {
  fields: ReadonlyArray<AdminField>;
  initial?: Values | null;
  /* When the cohort is created from inside a course, the course is already
     decided — showing a picker invites choosing the wrong one. It is sent as a
     hidden input and the server re-validates it like any other field. */
  courseId?: string;
}) {
  return (
    <AcademyForm
      action={saveCohort}
      fields={fields}
      initial={
        initial ??
        (courseId
          ? {
              price_naira: 0,
              currency: "NGN",
              pacing: "cohort_paced",
            }
          : null)
      }
      label="cohort"
      hidden={courseId ? { course_id: courseId } : undefined}
    />
  );
}
