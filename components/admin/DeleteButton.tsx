"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { deleteResource } from "@/lib/actions/admin-content";
import { idle } from "@/lib/actions/types";
import type { AdminResourceKey } from "@/lib/admin/resources";

export function DeleteButton({
  resource,
  id,
  name,
}: {
  resource: AdminResourceKey;
  id: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(deleteResource, idle);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`))
          event.preventDefault();
      }}
      className="mt-5"
    >
      <input type="hidden" name="resource" value={resource} />
      <input type="hidden" name="id" value={id} />
      <Button variant="secondary" disabled={pending}>
        {pending ? "Deleting…" : `Delete ${name}`}
      </Button>
      {state.status !== "idle" ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "Could not delete this item.")}
          </FormMessage>
        </div>
      ) : null}
    </form>
  );
}
