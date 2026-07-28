"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  assignInstructor,
  unassignInstructor,
} from "@/lib/actions/admin-instructors";
import { ActionForm } from "./AcademyActions";

/* Sprint 6.8 — who teaches this cohort.
 *
 * The copy states the consequence plainly, because assignment is the only
 * thing that gives an instructor access to learner data at all. */

export type AssignedInstructor = {
  id: string;
  email: string;
  full_name: string | null;
};

export function InstructorPanel({
  cohortId,
  assigned,
}: {
  cohortId: string;
  assigned: AssignedInstructor[];
}) {
  const [state, formAction, pending] = useActionState(assignInstructor, idle);

  return (
    <div>
      {assigned.length === 0 ? (
        <p className="text-slate text-small mb-5">
          Nobody is teaching this cohort yet. An instructor sees only the
          cohorts they are assigned to.
        </p>
      ) : (
        <ul className="mb-5 space-y-2">
          {assigned.map((person) => (
            <li
              key={person.id}
              className="border-hairline bg-paper flex flex-wrap items-center justify-between gap-3 border p-4"
            >
              <div className="min-w-0">
                <p className="text-ink text-small font-semibold">
                  {person.full_name ?? person.email}
                </p>
                {person.full_name ? (
                  <p className="text-slate text-small">{person.email}</p>
                ) : null}
              </div>
              <ActionForm
                action={unassignInstructor}
                fields={{ id: person.id }}
                label="Remove"
                pendingLabel="Removing…"
                confirm={`Remove ${person.email} from this cohort?\n\nThey lose access to its learners and their work straight away. Marks they have already given stay exactly as they are.`}
              />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="border-hairline bg-paper border p-5">
        <input type="hidden" name="cohort_id" value={cohortId} />
        <h3 className="text-ink text-small mb-2 font-semibold">
          Assign an instructor
        </h3>
        <p className="text-slate text-small mb-4">
          They will be able to see this cohort&rsquo;s learners, their progress,
          and mark their assignments. They cannot edit the course, see other
          cohorts, or reach anything else in the admin.
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
              id="instructor_email"
              name="email"
              type="email"
              required
              label="Their email address"
              hint="They need a staff account with the instructor role already."
              error={
                state.status === "error" ? state.fieldErrors?.email : undefined
              }
            />
          </div>
          <Button variant="secondary" disabled={pending}>
            {pending ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </div>
  );
}
