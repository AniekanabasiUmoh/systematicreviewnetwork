"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  saveResource,
  setPublishStatus,
} from "@/lib/actions/admin-content";
import type { AdminField, AdminResourceKey } from "@/lib/admin/resources";
import { AdminFormField } from "./FormFields";

type FormResource = {
  key: AdminResourceKey;
  labelSingular: string;
  fields: ReadonlyArray<AdminField>;
};
type Values = Record<string, unknown> & { id?: string };
type PublishConfig = {
  id: string;
  status: "draft" | "published";
};

export function ResourceForm({
  resource,
  initial,
  publish,
}: {
  resource: FormResource;
  initial?: Values | null;
  publish?: PublishConfig;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveResource, idle);
  const [publishState, publishAction, publishPending] = useActionState(
    setPublishStatus,
    idle,
  );
  const nextStatus = publish?.status === "published" ? "draft" : "published";

  useEffect(() => {
    if (initial?.id || state.status !== "success") return;
    const id = state.data?.id;
    if (typeof id === "string" && id) router.replace(`/admin/${resource.key}/${id}`);
  }, [initial?.id, resource.key, router, state]);

  useEffect(() => {
    if (publishState.status === "success") router.refresh();
  }, [publishState.status, router]);

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
      {publish && publishState.status !== "idle" ? (
        <div className="mt-5 flex justify-end">
          <FormMessage
            tone={publishState.status === "success" ? "success" : "error"}
          >
            {publishState.status === "success"
              ? publishState.message
              : (publishState.formError ?? "Could not change the status.")}
          </FormMessage>
        </div>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        {publish ? (
          <span className="text-slate text-small self-center">
            Status: {publishState.status === "success" ? nextStatus : publish.status}
          </span>
        ) : null}
        <Button disabled={pending || publishPending}>
          {pending ? "Saving…" : `Save ${resource.labelSingular}`}
        </Button>
        {publish ? (
          <>
            <input type="hidden" name="status" value={nextStatus} />
            <Button
              formAction={publishAction}
              disabled={pending || publishPending}
            >
              {publishPending
                ? "Updating…"
                : nextStatus === "published"
                  ? "Publish"
                  : "Move to draft"}
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}
