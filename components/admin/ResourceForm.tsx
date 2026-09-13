"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { publishResource, saveResource } from "@/lib/actions/admin-content";
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
  autosave,
}: {
  resource: FormResource;
  initial?: Values | null;
  publish?: PublishConfig;
  autosave?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveResource, idle);
  const [autosaveState, autosaveAction, autosavePending] = useActionState(
    saveResource,
    idle,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishResource,
    idle,
  );
  const nextStatus = publish?.status === "published" ? "draft" : "published";
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveInFlight = useRef(false);
  const autosaveQueued = useRef(false);
  const auto = Boolean(autosave);

  useEffect(() => {
    if (auto || initial?.id || state.status !== "success") return;
    const id = state.data?.id;
    if (typeof id === "string" && id)
      router.replace(`/admin/${resource.key}/${id}`);
  }, [auto, initial?.id, resource.key, router, state]);

  useEffect(() => {
    if (publishState.status === "success") router.refresh();
  }, [publishState.status, router]);

  useEffect(() => {
    if (!auto || autosavePending || !autosaveInFlight.current) return;
    autosaveInFlight.current = false;
    if (autosaveQueued.current) {
      autosaveQueued.current = false;
      scheduleAutosave();
      return;
    }
    if (initial?.id || autosaveState.status !== "success") return;
    const id = autosaveState.data?.id;
    if (typeof id === "string" && id) {
      router.replace(`/admin/${resource.key}/${id}`);
    }
  }, [auto, autosavePending, autosaveState, initial?.id, resource.key, router]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  function scheduleAutosave() {
    if (!auto) return;
    if (autosaveInFlight.current) {
      autosaveQueued.current = true;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosaveTimer.current = null;
      const form = formRef.current;
      if (!form || !form.checkValidity() || autosaveInFlight.current) return;
      autosaveQueued.current = false;
      autosaveInFlight.current = true;
      startTransition(() => autosaveAction(new FormData(form)));
    }, 900);
  }

  const fieldState =
    publishState.status === "error"
      ? publishState
      : auto
        ? autosaveState
        : state;

  return (
    <form
      ref={formRef}
      action={auto ? undefined : action}
      noValidate
      onInput={scheduleAutosave}
      onChange={scheduleAutosave}
      onBlur={scheduleAutosave}
      className="border-hairline bg-paper border p-6"
    >
      <input type="hidden" name="resource" value={resource.key} />
      {auto ? <input type="hidden" name="autosave" value="1" /> : null}
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      {fieldState.status === "error" && fieldState.formError ? (
        <div className="mb-5">
          <FormMessage tone="error">{fieldState.formError}</FormMessage>
        </div>
      ) : null}
      {!auto && state.status === "success" ? (
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
              fieldState.status === "error"
                ? fieldState.fieldErrors?.[field.name]
                : undefined
            }
          />
        ))}
      </div>
      {auto && autosaveState.status === "success" ? (
        <div className="mt-5 flex justify-end">
          <span className="text-slate text-small">
            Draft saved automatically.
          </span>
        </div>
      ) : null}
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
            Status:{" "}
            {publishState.status === "success" ? nextStatus : publish.status}
          </span>
        ) : null}
        {!auto ? (
          <Button disabled={pending || publishPending}>
            {pending ? "Saving…" : `Save ${resource.labelSingular}`}
          </Button>
        ) : null}
        {publish ? (
          <>
            <input type="hidden" name="status" value={nextStatus} />
            <Button
              formAction={publishAction}
              disabled={pending || autosavePending || publishPending}
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
