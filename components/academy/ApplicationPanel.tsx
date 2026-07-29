"use client";

import { useActionState } from "react";
import { FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FormMessage, TextField, SelectField } from "@/components/ui/FormField";
import { Icon } from "@/components/ui/Icon";
import { idle } from "@/lib/actions/types";
import {
  uploadApplicationDocument,
  deleteApplicationDocument,
} from "@/lib/actions/application-documents";

/* Sprint 7.1 — the applicant's own controls.
 *
 * The stepper mirrors the staff view from 5.6 so the two tell the same story,
 * but the wording is the applicant's: a reviewer sees "under_review", the
 * person waiting sees "Being reviewed" and one sentence on what happens next. */

const KINDS = [
  { value: "cv", label: "CV" },
  { value: "protocol", label: "Protocol draft" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Something else" },
];

export function ApplicationStepper({
  current,
  outcome,
}: {
  /** 0 received · 1 under review · 2 decided */
  current: number;
  /** The final status, once decided — colours the last step honestly. */
  outcome?: "accepted" | "waitlisted" | "rejected" | null;
}) {
  const steps = ["Received", "Being reviewed", "Decision"];

  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <div
                className={`h-[3px] w-full ${
                  done || now ? "bg-evidence" : "bg-mist"
                }`}
                aria-hidden="true"
              />
              <p
                className={`mt-2 text-[0.8125rem] ${
                  now ? "text-ink font-semibold" : "text-slate"
                }`}
              >
                {i === 2 && outcome
                  ? outcome === "accepted"
                    ? "Offered a place"
                    : outcome === "waitlisted"
                      ? "Waiting list"
                      : "Not this time"
                  : label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DocumentUpload({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(
    uploadApplicationDocument,
    idle,
  );

  return (
    <form action={formAction} className="border-hairline mt-5 border-t pt-5">
      <input type="hidden" name="application_id" value={applicationId} />

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

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <SelectField
          id={`kind_${applicationId}`}
          name="kind"
          label="What is it"
          defaultValue="cv"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </SelectField>
        <TextField
          id={`file_${applicationId}`}
          name="file"
          type="file"
          required
          label="File"
          hint="PDF, Word, ODT, RTF or plain text. Up to 10 MB. Only your reviewer can open it."
          error={state.status === "error" ? state.fieldErrors?.file : undefined}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Attach it"}
        </Button>
      </div>
    </form>
  );
}

export function DocumentRow({
  id,
  fileName,
  kind,
  href,
}: {
  id: string;
  fileName: string;
  kind: string;
  href: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteApplicationDocument,
    idle,
  );

  if (state.status === "success") {
    return (
      <li>
        <FormMessage tone="success">{state.message}</FormMessage>
      </li>
    );
  }

  const kindLabel = KINDS.find((k) => k.value === kind)?.label ?? "Document";

  return (
    <li className="border-hairline flex flex-wrap items-center justify-between gap-3 border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon icon={FileText} size="sm" className="text-slate mt-0.5 shrink-0" />
        <div className="min-w-0">
          <a
            href={href}
            className="text-ink text-sm/6 font-semibold hover:underline"
          >
            {fileName}
          </a>
          <p className="text-slate/80 text-[0.8125rem]/6">{kindLabel}</p>
        </div>
      </div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="text-slate hover:text-ink flex items-center gap-1.5 text-[0.8125rem]"
        >
          <Icon icon={Trash2} size="sm" className="h-3.5 w-3.5" />
          {pending ? "Removing…" : "Remove"}
        </button>
      </form>
      {state.status === "error" ? (
        <p className="text-tag-orange w-full text-[0.8125rem]">
          {state.formError}
        </p>
      ) : null}
    </li>
  );
}
