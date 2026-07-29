import {
  fieldName,
  questionOptions,
  type EventQuestion,
} from "@/lib/events/questions";

/* Sprint 7.2 — the staff-defined questions, on the public registration form.
 *
 * A server component: these are read once and never change while the form is
 * open, so there is nothing here for the client to do.
 *
 * The four types render as the four obvious controls. `required` is set on the
 * input for the browser's own benefit, but the real check is server-side in
 * collectAnswers — a required attribute is a courtesy, not a rule. */

const control =
  "w-full rounded-lg border border-hairline bg-paper px-3.5 py-2.5 text-ink " +
  "placeholder:text-slate/60 transition-colors hover:border-slate/50 " +
  "focus:border-evidence";

export function EventQuestions({
  questions,
}: {
  questions: ReadonlyArray<EventQuestion>;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-5">
      {questions.map((question) => {
        const name = fieldName(question.id);
        const id = `question-${question.id}`;

        if (question.field_type === "checkbox") {
          return (
            <div key={question.id}>
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
                <input
                  id={id}
                  name={name}
                  type="checkbox"
                  required={question.required}
                  className="mt-1 shrink-0"
                />
                <span>
                  <span className="text-ink text-small block font-medium">
                    {question.label}
                    <span className="text-slate font-normal">
                      {question.required ? " (required)" : " (optional)"}
                    </span>
                  </span>
                  {question.help_text ? (
                    <span className="text-slate mt-1 block text-[0.8125rem]">
                      {question.help_text}
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
          );
        }

        return (
          <div key={question.id}>
            <label htmlFor={id} className="text-ink text-small block font-medium">
              {question.label}
              <span className="text-slate font-normal">
                {question.required ? " (required)" : " (optional)"}
              </span>
            </label>
            {question.help_text ? (
              <p className="text-slate mt-1 text-[0.8125rem]">
                {question.help_text}
              </p>
            ) : null}
            <div className="mt-2">
              {question.field_type === "long_text" ? (
                <textarea
                  id={id}
                  name={name}
                  rows={4}
                  maxLength={2000}
                  required={question.required}
                  className={control}
                />
              ) : question.field_type === "select" ? (
                <select
                  id={id}
                  name={name}
                  required={question.required}
                  defaultValue=""
                  className={control}
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {questionOptions(question).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  name={name}
                  type="text"
                  maxLength={500}
                  required={question.required}
                  className={control}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
