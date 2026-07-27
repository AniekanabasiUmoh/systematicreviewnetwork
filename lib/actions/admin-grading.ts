"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
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
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

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
      "id, assessment_id, enrolment_id, attempt, assessments (title, pass_mark, kind)",
    )
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!submission)
    return { status: "error", formError: "That submission no longer exists." };

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
      marked_by: auth.user.email,
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
    auth.user,
    "update",
    "submissions",
    parsed.data.id,
    `Marked ${assessment.title} — ${parsed.data.score}%${passed ? " (pass)" : " (not yet a pass)"}`,
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
