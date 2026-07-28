"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireVerifiedLearnerAction } from "@/lib/academy/auth";
import { getEnrolledCohort } from "@/lib/academy/courses";
import {
  getEnrolment,
  getLessonForLearner,
} from "@/lib/academy/curriculum";
import {
  markComplete,
  markIncomplete,
  getCompletedLessonIds,
} from "@/lib/academy/progress";

/* Sprint 6.5 — marking a lesson done.
 *
 * The whole 6.3 gate runs again here. Marking is a write, and a write keyed on
 * a lesson id from a form field is exactly the kind of thing that gets probed:
 * without this check, someone could mark lessons in a course they never bought
 * and — because completion feeds the `after_previous` drip rule — unlock
 * modules by doing so. */

export async function setLessonComplete(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;

  const courseSlug = String(form.get("course") ?? "");
  const cohortSlug = String(form.get("cohort") ?? "");
  const lessonId = String(form.get("lesson") ?? "");
  const done = String(form.get("done") ?? "") === "true";

  const found = await getEnrolledCohort(courseSlug, cohortSlug);
  if (!found)
    return { status: "error", formError: "That course is no longer available." };
  const { course, cohort } = found;

  const enrolment = await getEnrolment(auth.learner.id, cohort.id);
  if (!enrolment)
    return {
      status: "error",
      formError: "You are not enrolled in this cohort.",
    };

  /* Re-check that the lesson is actually released to them, using the same
     completion set the drip rule uses. A lesson inside a locked module is not
     in this result, so it cannot be marked. */
  const completed = await getCompletedLessonIds(enrolment.id);
  const allowed = await getLessonForLearner(
    auth.learner.id,
    { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
    lessonId,
    completed,
  );
  if (!allowed)
    return {
      status: "error",
      formError: "That lesson is not open to you yet.",
    };

  const ok = done
    ? await markComplete(enrolment.id, lessonId)
    : await markIncomplete(enrolment.id, lessonId);
  if (!ok)
    return {
      status: "error",
      formError: "We could not save that. Please try again.",
    };

  revalidatePath(`/academy/learn/${course.slug}/${cohort.slug}`, "layout");
  return {
    status: "success",
    message: done ? "Marked as done." : "Marked as not done.",
  };
}
