"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { setPublishStatus } from "@/lib/actions/admin-content";
import { idle } from "@/lib/actions/types";
import type { AdminResourceKey } from "@/lib/admin/resources";

export function PublishControl({
  resource,
  id,
  status,
}: {
  resource: AdminResourceKey;
  id: string;
  status: "draft" | "published";
}) {
  const [state, action, pending] = useActionState(setPublishStatus, idle);
  const next = status === "published" ? "draft" : "published";
  return (
    <form
      action={action}
      className="border-hairline bg-paper mb-5 flex flex-wrap items-center justify-between gap-4 border p-4"
    >
      <div>
        <p className="text-ink text-small font-semibold">
          Current status: {status}
        </p>
        {state.status !== "idle" ? (
          <div className="mt-2">
            <FormMessage
              tone={state.status === "success" ? "success" : "error"}
            >
              {state.status === "success"
                ? state.message
                : (state.formError ?? "Could not change the status.")}
            </FormMessage>
          </div>
        ) : null}
      </div>
      <input type="hidden" name="resource" value={resource} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button disabled={pending}>
        {pending
          ? "Updating…"
          : next === "published"
            ? "Publish"
            : "Move to draft"}
      </Button>
    </form>
  );
}
