"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { archiveResource } from "@/lib/actions/admin-content";
import { idle } from "@/lib/actions/types";
import type { AdminResourceKey } from "@/lib/admin/resources";

/* §5.12 — archiving is the safe counterpart to deleting an event. An event
 * with registrations cannot be deleted at all (the FK is ON DELETE RESTRICT
 * and the delete action refuses with a count); archiving takes it off the
 * public site while keeping every registration intact. */

export function ArchiveButton({
  resource,
  id,
  name,
  archived,
}: {
  resource: AdminResourceKey;
  id: string;
  name: string;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState(archiveResource, idle);

  if (archived)
    return (
      <p className="text-slate text-small mt-5">
        This event is archived. It does not appear on the public site, and its
        registrations are kept.
      </p>
    );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Archive ${name}? It will be removed from the public site. Registrations already made against it are kept.`,
          )
        )
          event.preventDefault();
      }}
      className="mt-5"
    >
      <input type="hidden" name="resource" value={resource} />
      <input type="hidden" name="id" value={id} />
      <Button variant="secondary" disabled={pending}>
        {pending ? "Archiving…" : `Archive ${name}`}
      </Button>
      {state.status !== "idle" ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "Could not archive this event.")}
          </FormMessage>
        </div>
      ) : null}
    </form>
  );
}
