import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.5 — progress, and what it unlocks.
 *
 * Progress is stored against the ENROLMENT, not the learner, which is what
 * makes "survives sign-out and a device change" true without any client state:
 * there is no localStorage anywhere in this feature, so signing in on a phone
 * shows exactly what the laptop showed.
 *
 * It also closes the loop on 6.3's `after_previous` drip rule. That function
 * takes a set of completed lesson ids and was, until now, always given an empty
 * one — so an `after_previous` module could never open. This module is where
 * that set comes from. */

export type ProgressSummary = {
  completed: ReadonlySet<string>;
  completedCount: number;
  totalCount: number;
  /** 0–100, rounded. 0 when there is nothing to complete, never NaN. */
  percent: number;
};

/** Every lesson this enrolment has finished. */
export async function getCompletedLessonIds(
  enrolmentId: string,
): Promise<ReadonlySet<string>> {
  const { data } = await supabaseAdmin
    .from("lesson_progress")
    .select("lesson_id")
    .eq("enrolment_id", enrolmentId);
  return new Set((data ?? []).map((row) => row.lesson_id));
}

/**
 * Progress as a fraction of what the learner can actually see.
 *
 * `totalCount` counts lessons in RELEASED modules only. Counting locked ones
 * would show a learner 20% on day one of a six-week course and never move for a
 * fortnight — technically true, useless as feedback. The denominator grows as
 * the course opens up, which is the honest reading of "how far through am I".
 */
export function summarise(
  completed: ReadonlySet<string>,
  visibleLessonIds: ReadonlyArray<string>,
): ProgressSummary {
  const total = visibleLessonIds.length;
  const done = visibleLessonIds.filter((id) => completed.has(id)).length;
  return {
    completed,
    completedCount: done,
    totalCount: total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/**
 * The lesson to resume on — the first visible one not yet finished.
 *
 * Returns null when everything visible is done, which the UI reads as "you are
 * up to date" rather than sending someone back to lesson one.
 */
export function nextLessonId(
  completed: ReadonlySet<string>,
  visibleLessonIds: ReadonlyArray<string>,
): string | null {
  return visibleLessonIds.find((id) => !completed.has(id)) ?? null;
}

/**
 * Mark a lesson complete. Idempotent: the unique index means marking twice is
 * a no-op rather than an error, so a double-tap on a phone cannot fail.
 */
export async function markComplete(
  enrolmentId: string,
  lessonId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("lesson_progress").upsert(
    { enrolment_id: enrolmentId, lesson_id: lessonId } as never,
    { onConflict: "enrolment_id,lesson_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[progress] mark failed:", error.message);
    return false;
  }
  return true;
}

/** Undo. Someone who marked the wrong lesson must be able to put it back. */
export async function markIncomplete(
  enrolmentId: string,
  lessonId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("lesson_progress")
    .delete()
    .eq("enrolment_id", enrolmentId)
    .eq("lesson_id", lessonId);
  if (error) {
    console.error("[progress] unmark failed:", error.message);
    return false;
  }
  return true;
}
