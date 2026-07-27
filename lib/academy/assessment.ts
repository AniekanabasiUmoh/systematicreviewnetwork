import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getEnrolment, getCurriculumForLearner } from "@/lib/academy/curriculum";
import type {
  AssessmentsRow,
  QuizQuestionsRow,
  SubmissionsRow,
} from "@/lib/database.types";

/* Sprint 6.6 — assessment.
 *
 * Two rules carry this module.
 *
 * 1. THE ANSWER KEY NEVER LEAVES THE SERVER. `quiz_options.is_correct` is in a
 *    table the learner-facing path does not read. getQuizForLearner() selects
 *    id, label and sort_order explicitly — never `*` — so adding a column to
 *    that table later cannot start leaking it. Marking is the only code that
 *    reads is_correct, and it runs here, after the submission has been stored.
 *
 * 2. DEADLINES APPLY ONLY TO COHORT-PACED COHORTS (decision 1). In a self-paced
 *    cohort there is no shared timetable, so a due date belonging to some other
 *    run must never make a learner late. isLate() checks pacing first and
 *    returns false, and the UI is told not to show a deadline at all. */

export type Assessment = AssessmentsRow;
export type Submission = SubmissionsRow;

/** A question as a LEARNER may see it: no is_correct anywhere. */
export type LearnerQuestion = {
  id: string;
  prompt: string;
  sort_order: number;
  options: Array<{ id: string; label: string }>;
};

/** Explicit column lists. Never `select("*")` on the option table. */
const QUESTION_FIELDS = "id, prompt, sort_order";
const OPTION_SAFE_FIELDS = "id, question_id, label, sort_order";

/**
 * Whether a submission counts as late.
 *
 * Decision 1 first, before any date arithmetic — the same ordering as
 * cohortState() and moduleReleased(), and for the same reason.
 */
export function isLate(
  assessment: Pick<Assessment, "due_at">,
  pacing: string,
  now: Date = new Date(),
): boolean {
  if (pacing === "self_paced") return false;
  if (!assessment.due_at) return false;
  return now.getTime() > new Date(assessment.due_at).getTime();
}

/** Whether a deadline should be shown at all. */
export function showsDeadline(
  assessment: Pick<Assessment, "due_at">,
  pacing: string,
): boolean {
  return pacing !== "self_paced" && Boolean(assessment.due_at);
}

/**
 * Assessments in a module a learner may currently see.
 *
 * Goes through the 6.3 curriculum gate rather than querying assessments
 * directly: an assessment inside a locked module is not returned, and that
 * falls out of drip rather than needing a second rule.
 */
export async function listAssessmentsForLearner(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<Assessment[] | null> {
  const modules = await getCurriculumForLearner(
    learnerId,
    cohort,
    completedLessonIds,
    now,
  );
  if (!modules) return null;

  const releasedIds = modules.filter((m) => m.released).map((m) => m.id);
  if (releasedIds.length === 0) return [];

  const { data } = await supabaseAdmin
    .from("assessments")
    .select("*")
    .in("module_id", releasedIds)
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  return (data ?? []) as Assessment[];
}

/** One assessment, only if the learner may see it. */
export async function getAssessmentForLearner(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  assessmentId: string,
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<Assessment | null> {
  const all = await listAssessmentsForLearner(
    learnerId,
    cohort,
    completedLessonIds,
    now,
  );
  return all?.find((row) => row.id === assessmentId) ?? null;
}

/**
 * The quiz, WITHOUT its answers.
 *
 * The two selects below are the security boundary of this sprint. Both name
 * their columns; neither can return is_correct.
 */
export async function getQuizForLearner(
  assessmentId: string,
): Promise<LearnerQuestion[]> {
  const { data: questions } = await supabaseAdmin
    .from("quiz_questions")
    .select(QUESTION_FIELDS)
    .eq("assessment_id", assessmentId)
    .order("sort_order", { ascending: true });

  const rows = (questions ?? []) as Array<
    Pick<QuizQuestionsRow, "id" | "prompt" | "sort_order">
  >;
  if (rows.length === 0) return [];

  const { data: options } = await supabaseAdmin
    .from("quiz_options")
    .select(OPTION_SAFE_FIELDS)
    .in("question_id", rows.map((q) => q.id))
    .order("sort_order", { ascending: true });

  const byQuestion = new Map<string, Array<{ id: string; label: string }>>();
  for (const option of (options ?? []) as Array<{
    id: string;
    question_id: string;
    label: string;
  }>) {
    const list = byQuestion.get(option.question_id) ?? [];
    list.push({ id: option.id, label: option.label });
    byQuestion.set(option.question_id, list);
  }

  return rows.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    sort_order: question.sort_order,
    options: byQuestion.get(question.id) ?? [],
  }));
}

/**
 * Marks a quiz. Server-only, and the only reader of is_correct.
 *
 * A question with no correct option is skipped rather than counted as wrong:
 * that is a staff mistake, and failing a learner for it would be unjust.
 */
export async function markQuiz(
  assessmentId: string,
  answers: Record<string, string>,
): Promise<{ score: number; correct: number; total: number }> {
  const { data: questions } = await supabaseAdmin
    .from("quiz_questions")
    .select("id")
    .eq("assessment_id", assessmentId);

  const questionIds = (questions ?? []).map((q) => q.id);
  if (questionIds.length === 0) return { score: 0, correct: 0, total: 0 };

  const { data: options } = await supabaseAdmin
    .from("quiz_options")
    .select("id, question_id, is_correct")
    .in("question_id", questionIds);

  const correctByQuestion = new Map<string, string>();
  for (const option of (options ?? []) as Array<{
    id: string;
    question_id: string;
    is_correct: boolean;
  }>) {
    if (option.is_correct) correctByQuestion.set(option.question_id, option.id);
  }

  const markable = questionIds.filter((id) => correctByQuestion.has(id));
  if (markable.length === 0) return { score: 0, correct: 0, total: 0 };

  let correct = 0;
  for (const questionId of markable) {
    if (answers[questionId] === correctByQuestion.get(questionId)) correct += 1;
  }

  return {
    score: Math.round((correct / markable.length) * 100),
    correct,
    total: markable.length,
  };
}

/** Every attempt this enrolment has made at this assessment, newest first. */
export async function listAttempts(
  enrolmentId: string,
  assessmentId: string,
): Promise<Submission[]> {
  const { data } = await supabaseAdmin
    .from("submissions")
    .select("*")
    .eq("enrolment_id", enrolmentId)
    .eq("assessment_id", assessmentId)
    .order("attempt", { ascending: false });
  return (data ?? []) as Submission[];
}

export type AttemptRight =
  | { allowed: true; attempt: number }
  | { allowed: false; reason: string };

/**
 * May this learner submit again?
 *
 * Passing ends it: someone who has met the threshold has no reason to resit,
 * and letting them would let a later worse attempt overwrite a pass.
 */
export function canAttempt(
  assessment: Pick<Assessment, "max_attempts">,
  attempts: ReadonlyArray<Pick<Submission, "attempt" | "passed" | "state">>,
): AttemptRight {
  const used = attempts.length;

  if (attempts.some((a) => a.passed === true)) {
    return { allowed: false, reason: "You have already passed this." };
  }

  const awaiting = attempts.find((a) => a.state === "submitted");
  if (awaiting) {
    return {
      allowed: false,
      reason: "Your last attempt is still being marked. We will email you when it is done.",
    };
  }

  const max = assessment.max_attempts;
  if (max !== null && used >= max) {
    return {
      allowed: false,
      reason:
        max === 1
          ? "This had one attempt, and you have used it."
          : `You have used all ${max} attempts.`,
    };
  }

  return { allowed: true, attempt: used + 1 };
}

/** How many attempts remain, as a sentence. Null when unlimited. */
export function attemptsRemaining(
  assessment: Pick<Assessment, "max_attempts">,
  used: number,
): string | null {
  const max = assessment.max_attempts;
  if (max === null) return null;
  const left = Math.max(0, max - used);
  if (left === 0) return "No attempts left";
  return left === 1 ? "1 attempt left" : `${left} attempts left`;
}

/** The enrolment for a learner on a cohort, or null. Re-exported for actions. */
export { getEnrolment };
