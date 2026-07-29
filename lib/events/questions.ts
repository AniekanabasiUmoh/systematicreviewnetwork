import type { EventQuestionsRow } from "@/lib/database.types";

/* Sprint 7.2 — per-event custom questions.
 *
 * §7.2 names the scope trap in its own words: "a general form builder is a
 * product in itself. Cap it at the four field types above unless there is a
 * concrete demand for more." Four types, enforced by a database constraint
 * rather than by good intentions.
 *
 * No `server-only`: this is pure validation and formatting, imported by a
 * client form component and unit-tested directly.
 */

export type EventQuestion = EventQuestionsRow;

export const FIELD_TYPES = [
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Long answer" },
  { value: "select", label: "Choose one" },
  { value: "checkbox", label: "Yes / no" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["value"];

/** Options are stored as a jsonb array; anything else is treated as none. */
export function questionOptions(question: Pick<EventQuestion, "options">): string[] {
  if (!Array.isArray(question.options)) return [];
  return question.options.filter((o): o is string => typeof o === "string");
}

/** The form field name for a question. One place, so parse and render agree. */
export function fieldName(questionId: string): string {
  return `q_${questionId}`;
}

export type AnswerMap = Record<string, string>;

/**
 * Reads answers out of submitted form data.
 *
 * Only answers to questions that ACTUALLY belong to this event are kept, and a
 * `select` answer must be one of its own options. A crafted form post could
 * otherwise write arbitrary keys into the jsonb, which would then flow into
 * the CSV export as columns nobody defined.
 *
 * Returns `{ answers, missing }` rather than throwing, so the caller can show
 * every missing required question at once instead of one at a time.
 */
export function collectAnswers(
  questions: ReadonlyArray<EventQuestion>,
  read: (name: string) => string | null,
): { answers: AnswerMap; missing: EventQuestion[] } {
  const answers: AnswerMap = {};
  const missing: EventQuestion[] = [];

  for (const question of questions) {
    const raw = read(fieldName(question.id));

    if (question.field_type === "checkbox") {
      /* An unchecked box submits nothing at all, which is a real answer — "no"
         — not a missing one. Recorded explicitly so the export has a value in
         every row rather than a blank that could mean either. */
      answers[question.id] = raw ? "Yes" : "No";
      if (question.required && !raw) missing.push(question);
      continue;
    }

    const value = (raw ?? "").trim();
    if (!value) {
      if (question.required) missing.push(question);
      continue;
    }

    if (question.field_type === "select") {
      const allowed = questionOptions(question);
      if (!allowed.includes(value)) {
        // Not a value we offered. Treat as unanswered rather than storing it.
        if (question.required) missing.push(question);
        continue;
      }
    }

    // A long answer is capped so one submission cannot bloat the row.
    answers[question.id] =
      question.field_type === "long_text" ? value.slice(0, 2000) : value.slice(0, 500);
  }

  return { answers, missing };
}

/**
 * Answers keyed by question LABEL, for display and for CSV export.
 *
 * The stored jsonb is keyed by id, which is right — a renamed question must not
 * orphan existing answers — but an id is meaningless to a staffer reading a
 * spreadsheet. Archived questions are included: someone answered them, and an
 * export that silently dropped those columns would misrepresent the data.
 */
export function labelledAnswers(
  questions: ReadonlyArray<EventQuestion>,
  answers: unknown,
): Array<{ label: string; value: string }> {
  if (!answers || typeof answers !== "object") return [];
  const map = answers as Record<string, unknown>;

  return questions
    .map((question) => ({
      label: question.label,
      value: typeof map[question.id] === "string" ? (map[question.id] as string) : "",
    }))
    .filter((row) => row.value !== "");
}

/** A plain sentence naming what still needs answering. */
export function missingMessage(missing: ReadonlyArray<EventQuestion>): string {
  if (missing.length === 0) return "";
  if (missing.length === 1) return `Please answer: ${missing[0].label}`;
  return `Please answer: ${missing.map((q) => q.label).join(", ")}`;
}
