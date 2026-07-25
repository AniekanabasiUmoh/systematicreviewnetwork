"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { deleteMedia } from "@/lib/actions/admin-media";
import { idle } from "@/lib/actions/types";

export function DeleteMediaButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteMedia, idle);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`))
          event.preventDefault();
      }}
      className="mt-3"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? "Deleting…" : "Delete image"}
      </Button>
      {state.status !== "idle" ? (
        <div className="mt-2">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "Could not delete this image.")}
          </FormMessage>
        </div>
      ) : null}
    </form>
  );
}
