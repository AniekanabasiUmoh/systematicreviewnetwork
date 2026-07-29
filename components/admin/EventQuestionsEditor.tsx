"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  FormMessage,
  TextField,
  SelectField,
  TextareaField,
} from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  saveEventQuestion,
  deleteEventQuestion,
  reorderEventQuestions,
} from "@/lib/actions/admin-questions";
import { FIELD_TYPES, type EventQuestion } from "@/lib/events/questions";
import { ActionForm } from "./AcademyActions";

/* Sprint 7.2 — the question editor.
 *
 * Four field types, listed from a shared constant rather than typed out here,
 * so the select cannot drift from the database constraint.
 *
 * Options are one per line — the same convention programmes use for covers and
 * for_who in §5.7. A repeater widget is where a form builder starts becoming a
 * product, which §7.2 explicitly warns against. */

export function QuestionForm({
  eventId,
  question,
  onDone,
}: {
  eventId: string;
  question?: EventQuestion;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveEventQuestion, idle);
  const [type, setType] = useState(question?.field_type ?? "short_text");

  const options = Array.isArray(question?.options)
    ? (question.options as string[]).join("\n")
    : "";

  if (state.status === "success" && onDone) {
    // Saved from the "add" form: collapse it so the list is the focus again.
    setTimeout(onDone, 600);
  }

  return (
    <form action={formAction} className="border-hairline bg-paper border p-5">
      <input type="hidden" name="event_id" value={eventId} />
      {question ? <input type="hidden" name="id" value={question.id} /> : null}

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

      <div className="grid gap-4">
        <TextField
          id={`label_${question?.id ?? "new"}`}
          name="label"
          type="text"
          required
          maxLength={200}
          label="The question"
          hint="Exactly as the person registering will read it."
          defaultValue={question?.label ?? ""}
          error={state.status === "error" ? state.fieldErrors?.label : undefined}
        />

        <TextField
          id={`help_${question?.id ?? "new"}`}
          name="help_text"
          type="text"
          maxLength={300}
          label="Help text"
          hint="One line under the question, if it needs explaining."
          defaultValue={question?.help_text ?? ""}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id={`type_${question?.id ?? "new"}`}
            name="field_type"
            label="Answer type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>

          <div className="flex items-end pb-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                name="required"
                defaultChecked={question?.required ?? false}
              />
              <span className="text-ink text-small">
                They must answer this
              </span>
            </label>
          </div>
        </div>

        {type === "select" ? (
          <TextareaField
            id={`options_${question?.id ?? "new"}`}
            name="options"
            rows={4}
            label="Options"
            hint="One per line. At least two."
            defaultValue={options}
            error={
              state.status === "error" ? state.fieldErrors?.options : undefined
            }
          />
        ) : null}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="secondary" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
        <Button disabled={pending}>
          {pending ? "Saving…" : question ? "Save changes" : "Add question"}
        </Button>
      </div>
    </form>
  );
}

export function QuestionList({
  eventId,
  questions,
}: {
  eventId: string;
  questions: EventQuestion[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const ids = questions.map((q) => q.id);

  const move = (index: number, to: number) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    return next.join(",");
  };

  return (
    <div>
      {questions.length === 0 ? (
        <p className="text-slate text-small mb-5">
          No extra questions on this event. Everyone registering gives their
          name, email, institution and country — add a question here only if you
          need something beyond that.
        </p>
      ) : (
        <ul className="mb-5 space-y-3">
          {questions.map((question, index) => (
            <li key={question.id}>
              {editing === question.id ? (
                <QuestionForm
                  eventId={eventId}
                  question={question}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div className="border-hairline bg-paper flex flex-wrap items-start justify-between gap-3 border p-4">
                  <div className="min-w-0">
                    <p className="text-ink text-small font-semibold">
                      {question.label}
                      {question.required ? (
                        <span className="text-slate font-normal"> · required</span>
                      ) : null}
                    </p>
                    <p className="text-slate text-small mt-1">
                      {FIELD_TYPES.find((t) => t.value === question.field_type)
                        ?.label ?? question.field_type}
                      {question.field_type === "select" &&
                      Array.isArray(question.options)
                        ? ` · ${(question.options as string[]).length} options`
                        : ""}
                      {question.archived_at ? " · archived" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {index > 0 ? (
                      <ActionForm
                        action={reorderEventQuestions}
                        fields={{ order: move(index, index - 1) }}
                        label="Up"
                        pendingLabel="…"
                      />
                    ) : null}
                    {index < questions.length - 1 ? (
                      <ActionForm
                        action={reorderEventQuestions}
                        fields={{ order: move(index, index + 1) }}
                        label="Down"
                        pendingLabel="…"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditing(question.id)}
                      className="text-ink text-small underline underline-offset-2"
                    >
                      Edit
                    </button>
                    <ActionForm
                      action={deleteEventQuestion}
                      fields={{ id: question.id }}
                      label="Remove"
                      pendingLabel="Removing…"
                      confirm={`Remove "${question.label}"?\n\nIf anyone has already answered it, it will be archived instead — it disappears from the form and their answers stay in the export.`}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <QuestionForm eventId={eventId} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          Add a question
        </Button>
      )}
    </div>
  );
}
