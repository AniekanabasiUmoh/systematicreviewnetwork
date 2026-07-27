"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireVerifiedLearnerAction } from "@/lib/academy/auth";
import { getCohort } from "@/lib/academy/courses";
import { getEnrolment } from "@/lib/academy/curriculum";
import { formatCohortDates } from "@/lib/academy/cohorts";
import {
  checkEligibility,
  issueCertificate,
  getCertificate,
} from "@/lib/academy/certificates";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { CertificateIssued } from "@/lib/email/templates";

/* Sprint 6.7 — claiming a certificate.
 *
 * Eligibility is recomputed here from the database, never trusted from the
 * page that offered the button: the check that renders a button and the check
 * that issues a credential have to be the same one, and only the second is
 * load-bearing.
 *
 * Issuing also marks the enrolment `completed`, which is what "completing a
 * course issues a certificate" means in §6.4's state machine. */

export async function claimCertificate(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;
  const learner = auth.learner;

  const courseSlug = String(form.get("course") ?? "");
  const cohortSlug = String(form.get("cohort") ?? "");

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found)
    return { status: "error", formError: "That course is no longer available." };
  const { course, cohort } = found;

  const enrolment = await getEnrolment(learner.id, cohort.id);
  if (!enrolment)
    return { status: "error", formError: "You are not enrolled in this cohort." };

  // Already have one? Hand it back rather than refusing.
  const existing = await getCertificate(enrolment.id);
  if (existing) {
    return {
      status: "success",
      message: `Your certificate code is ${existing.code}.`,
    };
  }

  const eligibility = await checkEligibility(enrolment.id, {
    id: cohort.id,
    course_id: course.id,
    pacing: cohort.pacing,
  });
  if (!eligibility.eligible)
    return { status: "error", formError: eligibility.reason };

  const certificate = await issueCertificate(enrolment.id, {
    learner_name: learner.full_name?.trim() || learner.email,
    course_title: course.title,
    cohort_label: cohort.label,
    cohort_dates: formatCohortDates(
      cohort.starts_on,
      cohort.ends_on,
      cohort.pacing,
    ),
  });
  if (!certificate)
    return {
      status: "error",
      formError: "We could not issue your certificate. Please try again.",
    };

  /* The enrolment is now complete. Scoped to `active` so a withdrawn or
     already-completed row is not disturbed. */
  await supabaseAdmin
    .from("enrolments")
    .update({
      state: "completed",
      completed_at: new Date().toISOString(),
    } as never)
    .eq("id", enrolment.id)
    .eq("state", "active");

  void sendEmail({
    to: learner.email,
    subject: `Your certificate — ${course.title}`,
    react: CertificateIssued({
      fullName: learner.full_name ?? "there",
      courseTitle: course.title,
      code: certificate.code,
      certificateUrl: `${siteUrl()}/api/academy/certificate/${certificate.code}`,
      verifyUrl: `${siteUrl()}/verify/${certificate.code}`,
    }),
  });

  revalidatePath(`/academy/learn/${course.slug}/${cohort.slug}`, "layout");
  revalidatePath("/account");
  return {
    status: "success",
    message: `Certificate issued. Your code is ${certificate.code}.`,
  };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}
