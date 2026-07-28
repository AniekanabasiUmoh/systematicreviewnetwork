"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import {
  requireStaffAction,
  requireInstructorAction,
  teachesCohort,
} from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { AssessmentMarked } from "@/lib/email/templates";

/* Sprint 6.6 — marking.
 *
 * A marker awards a score and writes feedback. `passed` is DERIVED from the
 * assessment's pass mark rather than being a separate checkbox: a marker who
 * types 70 on a 60% assessment should not also have to remember to tick
 * "passed", and two fields that can disagree eventually will. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const markSchema = z.object({
  id: z.string().trim().min(1),
  score: z.coerce
    .number()
    .int("Give a whole number.")
    .min(0, "A score cannot be below 0.")
    .max(100, "A score cannot be above 100."),
  feedback: z
    .string()
    .trim()
    .min(1, "Write something for the learner — a mark with no comment is not much use.")
    .max(5000),
});

export async function markSubmission(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  /* Sprint 6.8 — staff OR an instructor assigned to this submission's cohort.
     The instructor branch is checked AFTER the submission is loaded, below,
     because the permission depends on which cohort the work belongs to. */
  const staff = await requireStaffAction();
  const instructor = staff.ok ? null : await requireInstructorAction();
  if (!staff.ok && (!instructor || !instructor.ok)) {
    return staff.state;
  }

  const parsed = markSchema.safeParse({
    id: formValue(form, "id"),
    score: formValue(form, "score"),
    feedback: formValue(form, "feedback"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data: submission } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, assessment_id, enrolment_id, attempt, assessments (title, pass_mark, kind), enrolments (cohort_id)",
    )
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!submission)
    return { status: "error", formError: "That submission no longer exists." };

  /* An instructor may mark only their own cohorts' work. The submission id in
     the form is a claim about which work this is; this is what checks it, and
     it runs before anything is written. */
  if (!staff.ok) {
    const cohortId = (
      submission as unknown as { enrolments: { cohort_id: string } | null }
    ).enrolments?.cohort_id;
    const teaches =
      instructor?.ok &&
      cohortId &&
      teachesCohort(instructor.instructor, cohortId);
    if (!teaches) {
      return {
        status: "error",
        formError: "You can only mark work from the cohorts you teach.",
      };
    }
  }

  /* One identity for both branches. `marked_by` is a denormalised email so a
     mark stays attributable after an account is removed — the same reasoning as
     the application notes in §5.6.
   *
   * recordAudit only reads id and email, so the `role` below is filler to
   * satisfy StaffUser and is never stored. What IS stored is the summary, which
   * says "by instructor" explicitly — an audit line that quietly recorded an
   * instructor's mark as an editor's would be worse than none. */
  let marker: { id: string; email: string; role: "admin" | "editor"; full_name: string | null; isInstructor: boolean };
  if (staff.ok) {
    marker = { ...staff.user, isInstructor: false };
  } else if (instructor?.ok) {
    marker = {
      id: instructor.instructor.id,
      email: instructor.instructor.email,
      role: "editor", // filler; never stored, see above
      full_name: instructor.instructor.full_name,
      isInstructor: true,
    };
  } else {
    // Unreachable: the guard at the top of this function already returned.
    return { status: "error", formError: "You are not signed in." };
  }

  const assessment = (
    submission as unknown as {
      assessments: { title: string; pass_mark: number; kind: string } | null;
    }
  ).assessments;
  if (!assessment)
    return { status: "error", formError: "That assessment no longer exists." };

  // Derived, never a second field a marker could contradict.
  const passed = parsed.data.score >= assessment.pass_mark;

  const { error } = await supabaseAdmin
    .from("submissions")
    .update({
      score: parsed.data.score,
      passed,
      feedback: parsed.data.feedback,
      state: "returned",
      marked_by: marker.email,
      marked_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[grading] mark failed:", error.message);
    return { status: "error", formError: "We could not save that mark." };
  }

  /* Tell the learner. Fire-and-forget: a failed email must never undo a
     recorded mark, exactly as with enrolment confirmations. */
  void notifyLearner(
    (submission as { enrolment_id: string }).enrolment_id,
    assessment.title,
    parsed.data.score,
    passed,
  );

  revalidatePath("/admin/grading");
  revalidatePath("/academy/learn", "layout");
  void recordAudit(
    marker,
    "update",
    "submissions",
    parsed.data.id,
    `Marked ${assessment.title} — ${parsed.data.score}%${passed ? " (pass)" : " (not yet a pass)"}${marker.isInstructor ? " by instructor" : ""}`,
  );

  return {
    status: "success",
    message: passed
      ? `Marked at ${parsed.data.score}% — a pass. The learner has been emailed.`
      : `Marked at ${parsed.data.score}%, below the ${assessment.pass_mark}% pass mark. The learner has been emailed.`,
  };
}

async function notifyLearner(
  enrolmentId: string,
  assessmentTitle: string,
  score: number,
  passed: boolean,
) {
  const { data } = await supabaseAdmin
    .from("enrolments")
    .select(
      "learner_email_at_enrolment, learner_name_at_enrolment, cohorts (slug, courses (title, slug))",
    )
    .eq("id", enrolmentId)
    .maybeSingle();

  const row = data as unknown as {
    learner_email_at_enrolment: string | null;
    learner_name_at_enrolment: string | null;
    cohorts: { slug: string; courses: { title: string; slug: string } | null } | null;
  } | null;

  const email = row?.learner_email_at_enrolment;
  const course = row?.cohorts?.courses;
  if (!email || !course || !row?.cohorts) return;

  await sendEmail({
    to: email,
    subject: `Your work has been marked — ${assessmentTitle}`,
    react: AssessmentMarked({
      fullName: row.learner_name_at_enrolment ?? "there",
      assessmentTitle,
      courseTitle: course.title,
      score,
      passed,
      courseUrl: `${siteUrl()}/academy/learn/${course.slug}/${row.cohorts.slug}`,
    }),
  });
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}
