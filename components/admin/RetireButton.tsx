"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { retireProgramme } from "@/lib/actions/admin-content";
import { idle } from "@/lib/actions/types";

/* §5.7 — retiring is the safe counterpart to deleting. A programme with
 * applications cannot be deleted at all (the FK is ON DELETE RESTRICT and the
 * delete action refuses with a count); retiring takes it off the public site
 * while keeping every application and the title each was submitted under. */

export function RetireButton({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState(retireProgramme, idle);

  if (archived)
    return (
      <p className="text-slate text-small mt-5">
        This programme is retired. It does not appear on the public site, and
        applications made against it are kept.
      </p>
    );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Retire ${name}? It will be removed from the public site. Applications already made against it are kept.`,
          )
        )
          event.preventDefault();
      }}
      className="mt-5"
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="secondary" disabled={pending}>
        {pending ? "Retiring…" : `Retire ${name}`}
      </Button>
      {state.status !== "idle" ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.status === "success"
              ? state.message
              : (state.formError ?? "Could not retire this programme.")}
          </FormMessage>
        </div>
      ) : null}
    </form>
  );
}
