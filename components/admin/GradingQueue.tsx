"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { markSubmission } from "@/lib/actions/admin-grading";
import type { QueueRow, MarkedRow } from "@/lib/admin/grading";

/* Sprint 6.6 — marking one submission.
 *
 * `passed` is not a field here. It is derived from the score against the
 * assessment's pass mark, so a marker cannot award 70% and accidentally leave a
 * "failed" flag behind. The form states the threshold beside the box. */

const lagos = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function MarkForm({ row }: { row: QueueRow }) {
  const [state, formAction, pending] = useActionState(markSubmission, idle);

  if (state.status === "success") {
    return (
      <div className="mt-4">
        <FormMessage tone="success">{state.message}</FormMessage>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-hairline mt-4 border-t pt-4">
      <input type="hidden" name="id" value={row.id} />

      {state.status === "error" && state.formError ? (
        <div className="mb-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <TextField
          id={`score_${row.id}`}
          name="score"
          type="number"
          min={0}
          max={100}
          required
          label="Score (%)"
          hint={`Pass is ${row.pass_mark}%.`}
          error={state.status === "error" ? state.fieldErrors?.score : undefined}
        />
        <div>
          <label
            htmlFor={`feedback_${row.id}`}
            className="text-ink text-small block font-medium"
          >
            Feedback <span className="text-slate font-normal">(required)</span>
          </label>
          <p className="text-slate mt-1 text-[0.8125rem]">
            The learner reads this. Say what was good and what to change.
          </p>
          <textarea
            id={`feedback_${row.id}`}
            name="feedback"
            rows={4}
            required
            maxLength={5000}
            className="border-hairline bg-paper text-ink mt-2 w-full rounded-lg border px-3.5 py-2.5"
          />
          {state.status === "error" && state.fieldErrors?.feedback ? (
            <p role="alert" className="text-tag-orange mt-2 text-[0.8125rem] font-medium">
              {state.fieldErrors.feedback}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button disabled={pending}>
          {pending ? "Saving…" : "Return this to the learner"}
        </Button>
      </div>
    </form>
  );
}

export function QueueItem({ row }: { row: QueueRow }) {
  return (
    <li className="border-hairline bg-paper border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-small font-semibold">
            {row.assessment_title}
          </p>
          <p className="text-slate text-small mt-1">
            {row.learner_name} · {row.learner_email}
          </p>
          <p className="text-slate text-small mt-1">
            {row.course_title} · {row.cohort_label} · attempt {row.attempt} ·
            submitted {lagos(row.submitted_at)}
            {row.is_late ? " · late" : ""}
          </p>
        </div>
        {row.storage_path ? (
          <a
            href={`/api/admin/submission/${row.id}`}
            className="text-ink text-small underline underline-offset-2"
          >
            Download {row.file_name ?? "file"}
          </a>
        ) : null}
      </div>

      {row.body_text ? (
        <div className="border-hairline bg-mist mt-4 border p-4">
          <p className="text-ink whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
            {row.body_text}
          </p>
        </div>
      ) : null}

      <MarkForm row={row} />
    </li>
  );
}

export function MarkedItem({ row }: { row: MarkedRow }) {
  return (
    <li className="border-hairline bg-paper border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-small font-semibold">
            {row.assessment_title}
          </p>
          <p className="text-slate text-small mt-1">
            {row.learner_name} · {row.course_title}
          </p>
        </div>
        <p className="text-slate text-small">
          {row.score}% ·{" "}
          {row.passed ? "passed" : `below the ${row.pass_mark}% pass mark`}
          {row.marked_at ? ` · ${lagos(row.marked_at)}` : ""}
        </p>
      </div>
    </li>
  );
}
