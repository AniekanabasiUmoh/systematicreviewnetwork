"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { saveResource } from "@/lib/actions/admin-content";
import type { AdminField, AdminResourceKey } from "@/lib/admin/resources";
import { AdminFormField } from "./FormFields";

type FormResource = {
  key: AdminResourceKey;
  labelSingular: string;
  fields: ReadonlyArray<AdminField>;
};
type Values = Record<string, unknown> & { id?: string };

export function ResourceForm({
  resource,
  initial,
}: {
  resource: FormResource;
  initial?: Values | null;
}) {
  const [state, action, pending] = useActionState(saveResource, idle);
  return (
    <form action={action} className="border-hairline bg-paper border p-6">
      <input type="hidden" name="resource" value={resource.key} />
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
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
        {resource.fields.map((field) => (
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
          {pending ? "Saving…" : `Save ${resource.labelSingular}`}
        </Button>
      </div>
    </form>
  );
}
