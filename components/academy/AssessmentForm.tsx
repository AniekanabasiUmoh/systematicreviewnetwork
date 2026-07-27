"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { submitAssessment } from "@/lib/actions/assessment";

/* Sprint 6.6 — the learner's submission form.
 *
 * The quiz renders radio groups in a fieldset per question, so a screen reader
 * announces the prompt with the options rather than reading five loose labels.
 * Nothing here knows which answer is right — the options arrive without that
 * information, because the server never selected it. */

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};

export function QuizForm({
  courseSlug,
  cohortSlug,
  assessmentId,
  questions,
  passMark,
}: {
  courseSlug: string;
  cohortSlug: string;
  assessmentId: string;
  questions: QuizQuestion[];
  passMark: number;
}) {
  const [state, formAction, pending] = useActionState(submitAssessment, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="course" value={courseSlug} />
      <input type="hidden" name="cohort" value={cohortSlug} />
      <input type="hidden" name="assessment" value={assessmentId} />

      {state.status === "error" && state.formError ? (
        <div className="mb-6">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}

      <ol className="space-y-8">
        {questions.map((question, index) => (
          <li key={question.id}>
            <fieldset>
              <legend className="text-ink font-semibold">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className="border-hairline hover:border-slate/50 flex cursor-pointer items-start gap-3 border p-3"
                  >
                    <input
                      type="radio"
                      name={`q_${question.id}`}
                      value={option.id}
                      className="mt-1 shrink-0"
                    />
                    <span className="text-ink text-[0.9375rem] leading-snug">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="border-hairline mt-8 border-t pt-6">
        <p className="text-slate text-small mb-4">
          You need {passMark}% to pass. Your score appears as soon as you submit.
        </p>
        <Button disabled={pending}>
          {pending ? "Marking…" : "Submit answers"}
        </Button>
      </div>
    </form>
  );
}

export function AssignmentForm({
  courseSlug,
  cohortSlug,
  assessmentId,
  submissionType,
}: {
  courseSlug: string;
  cohortSlug: string;
  assessmentId: string;
  submissionType: string;
}) {
  const [state, formAction, pending] = useActionState(submitAssessment, idle);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  const wantsText = submissionType === "text" || submissionType === "either";
  const wantsFile = submissionType === "file" || submissionType === "either";

  return (
    <form action={formAction}>
      <input type="hidden" name="course" value={courseSlug} />
      <input type="hidden" name="cohort" value={cohortSlug} />
      <input type="hidden" name="assessment" value={assessmentId} />

      {state.status === "error" && state.formError ? (
        <div className="mb-6">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}

      {wantsText ? (
        <div className="mb-5">
          <label htmlFor="body_text" className="text-ink block font-medium">
            Your answer
            {submissionType === "either" ? (
              <span className="text-slate font-normal"> (or attach a file)</span>
            ) : null}
          </label>
          <textarea
            id="body_text"
            name="body_text"
            rows={10}
            className="border-hairline bg-paper text-ink mt-2 w-full rounded-lg border px-3.5 py-2.5"
          />
        </div>
      ) : null}

      {wantsFile ? (
        <div className="mb-5">
          <label htmlFor="file" className="text-ink block font-medium">
            Attach your work
            {submissionType === "either" ? (
              <span className="text-slate font-normal"> (optional)</span>
            ) : null}
          </label>
          <p className="text-slate mt-1 text-[0.8125rem]">
            PDF, Word, Excel, CSV or text. Up to 20 MB. Only your markers can
            open it.
          </p>
          <input
            id="file"
            name="file"
            type="file"
            className="border-hairline bg-paper text-ink mt-2 w-full rounded-lg border px-3.5 py-2.5"
          />
        </div>
      ) : null}

      <div className="border-hairline mt-6 border-t pt-6">
        <Button disabled={pending}>
          {pending ? "Sending…" : "Submit for marking"}
        </Button>
      </div>
    </form>
  );
}
