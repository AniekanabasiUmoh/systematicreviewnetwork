import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.6 — the grading queue.
 *
 * Only assignments reach it: a quiz is marked the moment it is submitted, so a
 * queue containing quizzes would be a queue of work nobody has to do. */

export type QueueRow = {
  id: string;
  attempt: number;
  submitted_at: string;
  is_late: boolean;
  body_text: string | null;
  file_name: string | null;
  storage_path: string | null;
  learner_name: string;
  learner_email: string;
  assessment_title: string;
  pass_mark: number;
  course_title: string;
  cohort_label: string;
};

type QueueQueryRow = {
  id: string;
  attempt: number;
  submitted_at: string;
  is_late: boolean;
  body_text: string | null;
  file_name: string | null;
  storage_path: string | null;
  score: number | null;
  passed: boolean | null;
  feedback: string | null;
  marked_by: string | null;
  marked_at: string | null;
  assessments: { title: string; pass_mark: number } | null;
  enrolments: {
    learner_name_at_enrolment: string | null;
    learner_email_at_enrolment: string | null;
    cohorts: { label: string; courses: { title: string } | null } | null;
  } | null;
};

const QUEUE_SELECT =
  "id, attempt, submitted_at, is_late, body_text, file_name, storage_path, score, passed, feedback, marked_by, marked_at, " +
  "assessments (title, pass_mark), " +
  "enrolments (learner_name_at_enrolment, learner_email_at_enrolment, cohorts (label, courses (title)))";

function shape(row: QueueQueryRow): QueueRow {
  return {
    id: row.id,
    attempt: row.attempt,
    submitted_at: row.submitted_at,
    is_late: row.is_late,
    body_text: row.body_text,
    file_name: row.file_name,
    storage_path: row.storage_path,
    learner_name: row.enrolments?.learner_name_at_enrolment ?? "Not given",
    learner_email: row.enrolments?.learner_email_at_enrolment ?? "",
    assessment_title: row.assessments?.title ?? "Untitled",
    pass_mark: row.assessments?.pass_mark ?? 50,
    course_title: row.enrolments?.cohorts?.courses?.title ?? "",
    cohort_label: row.enrolments?.cohorts?.label ?? "",
  };
}

/** Waiting to be marked, oldest first — the person who waited longest is next. */
export async function listGradingQueue(): Promise<QueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select(QUEUE_SELECT)
    .eq("state", "submitted")
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("[grading] queue failed:", error.message);
    return [];
  }
  return (data as unknown as QueueQueryRow[]).map(shape);
}

export type MarkedRow = QueueRow & {
  score: number | null;
  passed: boolean | null;
  feedback: string | null;
  marked_by: string | null;
  marked_at: string | null;
};

/** Recently returned work, so a marker can check or revisit what they wrote. */
export async function listRecentlyMarked(limit = 20): Promise<MarkedRow[]> {
  const { data } = await supabaseAdmin
    .from("submissions")
    .select(QUEUE_SELECT)
    .eq("state", "returned")
    .not("marked_by", "is", null)
    .order("marked_at", { ascending: false })
    .limit(limit);

  return (data as unknown as QueueQueryRow[] ?? []).map((row) => ({
    ...shape(row),
    score: row.score,
    passed: row.passed,
    feedback: row.feedback,
    marked_by: row.marked_by,
    marked_at: row.marked_at,
  }));
}

/**
 * A signed URL for a submitted file.
 *
 * Staff-only: the caller has already passed requireStaff(). Short-lived for the
 * same reason course materials are — a link pasted into a chat should stop
 * working.
 */
export async function submissionFileUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from("course-materials")
    .createSignedUrl(storagePath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
