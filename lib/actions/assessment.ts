"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireVerifiedLearnerAction } from "@/lib/academy/auth";
import { getEnrolledCohort } from "@/lib/academy/courses";
import { getEnrolment } from "@/lib/academy/curriculum";
import { getCompletedLessonIds } from "@/lib/academy/progress";
import {
  getAssessmentForLearner,
  getQuizForLearner,
  markQuiz,
  listAttempts,
  canAttempt,
  isLate,
} from "@/lib/academy/assessment";
import { slugify } from "@/lib/actions/admin-schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.6 — submitting.
 *
 * The whole 6.3 gate runs again here, then the attempt policy, then the write.
 * Nothing is taken from the form except the answers themselves: the attempt
 * number is computed server-side, lateness is computed server-side, and the
 * score is computed server-side from a table the client has never seen. */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  ris: "application/x-research-info-systems",
  bib: "application/x-bibtex",
};

export async function submitAssessment(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;
  const learner = auth.learner;

  const courseSlug = String(form.get("course") ?? "");
  const cohortSlug = String(form.get("cohort") ?? "");
  const assessmentId = String(form.get("assessment") ?? "");

  const found = await getEnrolledCohort(courseSlug, cohortSlug);
  if (!found)
    return { status: "error", formError: "That course is no longer available." };
  const { course, cohort } = found;

  const enrolment = await getEnrolment(learner.id, cohort.id);
  if (!enrolment)
    return { status: "error", formError: "You are not enrolled in this cohort." };

  const cohortRef = {
    id: cohort.id,
    course_id: course.id,
    pacing: cohort.pacing,
  };
  const completed = await getCompletedLessonIds(enrolment.id);
  const assessment = await getAssessmentForLearner(
    learner.id,
    cohortRef,
    assessmentId,
    completed,
  );
  if (!assessment)
    return { status: "error", formError: "That is not open to you yet." };

  /* The attempt policy, server-side. The UI hides the button when someone is
     out of attempts, but hiding a button is not a rule. */
  const attempts = await listAttempts(enrolment.id, assessment.id);
  const right = canAttempt(assessment, attempts);
  if (!right.allowed)
    return { status: "error", formError: right.reason };

  /* Lateness is stamped now, from the server's clock, and only for a
     cohort-paced cohort (decision 1). */
  const late = isLate(assessment, cohort.pacing);

  if (assessment.kind === "quiz") {
    /* Only answers to questions that actually belong to this quiz are kept.
       A crafted form could otherwise post keys for another assessment's
       questions and pollute the stored record. */
    const questions = await getQuizForLearner(assessment.id);
    const answers: Record<string, string> = {};
    for (const question of questions) {
      const chosen = form.get(`q_${question.id}`);
      if (typeof chosen !== "string" || !chosen) continue;
      if (question.options.some((option) => option.id === chosen)) {
        answers[question.id] = chosen;
      }
    }

    if (Object.keys(answers).length === 0) {
      return {
        status: "error",
        formError: "Choose an answer to at least one question before submitting.",
      };
    }

    const result = await markQuiz(assessment.id, answers);
    const passed = result.total > 0 && result.score >= assessment.pass_mark;

    const { error } = await supabaseAdmin.from("submissions").insert({
      assessment_id: assessment.id,
      enrolment_id: enrolment.id,
      attempt: right.attempt,
      // Auto-marked, so it is finished the moment it is stored.
      state: "returned",
      answers,
      score: result.score,
      passed,
      is_late: late,
      marked_at: new Date().toISOString(),
      marked_by: "Marked automatically",
    } as never);
    if (error) {
      console.error("[assessment] quiz submit failed:", error.message);
      return {
        status: "error",
        formError: "We could not record your answers. Please try again.",
      };
    }

    revalidatePath(`/academy/learn/${course.slug}/${cohort.slug}`, "layout");
    return {
      status: "success",
      message: passed
        ? `You scored ${result.score}% and passed.`
        : `You scored ${result.score}%. The pass mark is ${assessment.pass_mark}%.`,
    };
  }

  /* Assignment. */
  const bodyText = String(form.get("body_text") ?? "").trim();
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!bodyText && !hasFile) {
    return {
      status: "error",
      formError:
        assessment.submission_type === "file"
          ? "Attach your file before submitting."
          : "Write your answer or attach a file before submitting.",
    };
  }
  if (assessment.submission_type === "file" && !hasFile) {
    return { status: "error", formError: "This assignment needs a file." };
  }
  if (assessment.submission_type === "text" && hasFile) {
    return {
      status: "error",
      formError: "This assignment is answered in the box, not with a file.",
    };
  }

  let storagePath: string | null = null;
  let fileName: string | null = null;

  if (hasFile) {
    const upload = file as File;
    if (upload.size > MAX_UPLOAD_BYTES)
      return { status: "error", formError: "Choose a file smaller than 20 MB." };

    const ext = (upload.name.split(".").pop() ?? "").toLowerCase();
    const mime = ALLOWED_UPLOAD_TYPES[ext];
    if (!mime)
      return {
        status: "error",
        formError: `We cannot accept .${ext || "that"} files. Use a PDF, Word, Excel, CSV or text file.`,
      };

    /* Same private bucket as course materials — a learner's submitted work is
       at least as sensitive as the reading list, and it must never be a
       guessable public URL. */
    const base = slugify(upload.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "submission";
    storagePath = `submissions/${assessment.id}/${enrolment.id}/${base}-${randomUUID().slice(0, 8)}.${ext}`;
    fileName = upload.name.slice(0, 255);

    const bytes = new Uint8Array(await upload.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("course-materials")
      .upload(storagePath, bytes, { contentType: mime, upsert: false });
    if (uploadError) {
      console.error("[assessment] upload failed:", uploadError.message);
      return {
        status: "error",
        formError: "We could not upload that file. Please try again.",
      };
    }
  }

  const { error } = await supabaseAdmin.from("submissions").insert({
    assessment_id: assessment.id,
    enrolment_id: enrolment.id,
    attempt: right.attempt,
    // Waits for a person.
    state: "submitted",
    body_text: bodyText || null,
    storage_path: storagePath,
    file_name: fileName,
    is_late: late,
  } as never);

  if (error) {
    if (storagePath)
      await supabaseAdmin.storage.from("course-materials").remove([storagePath]);
    console.error("[assessment] submit failed:", error.message);
    return {
      status: "error",
      formError: "We could not record your submission. Please try again.",
    };
  }

  revalidatePath(`/academy/learn/${course.slug}/${cohort.slug}`, "layout");
  return {
    status: "success",
    message: late
      ? "Submitted, and marked as late. Your marker will see it."
      : "Submitted. Your marker will look at this and you will see their feedback here.",
  };
}
