import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { getCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import { getEnrolment } from "@/lib/academy/curriculum";
import { getCompletedLessonIds } from "@/lib/academy/progress";
import {
  getAssessmentForLearner,
  getQuizForLearner,
  listAttempts,
  canAttempt,
  attemptsRemaining,
  showsDeadline,
} from "@/lib/academy/assessment";
import { QuizForm, AssignmentForm } from "@/components/academy/AssessmentForm";

/* Sprint 6.6 — one assessment, as the learner sees it.
 *
 * The quiz arrives from getQuizForLearner(), which selects question and option
 * columns by name and never touches is_correct. There is therefore nothing on
 * this page — or in the HTML it produces — that says which answer is right.
 *
 * Deadlines are shown only for a cohort-paced cohort (decision 1). A self-paced
 * learner sees no due date and is never told anything is late, because for them
 * it is not. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assessment",
  robots: { index: false },
};

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ course: string; cohort: string; assessment: string }>;
}) {
  const {
    course: courseSlug,
    cohort: cohortSlug,
    assessment: assessmentId,
  } = await params;
  const learner = await requireVerifiedLearner();

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found) notFound();
  const { course, cohort } = found;

  const enrolment = await getEnrolment(learner.id, cohort.id);
  if (!enrolment) notFound();

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
  if (!assessment) notFound();

  const attempts = await listAttempts(enrolment.id, assessment.id);
  const right = canAttempt(assessment, attempts);
  const remaining = attemptsRemaining(assessment, attempts.length);
  const latest = attempts[0] ?? null;
  const basePath = `/academy/learn/${course.slug}/${cohort.slug}`;

  const questions =
    assessment.kind === "quiz" && right.allowed
      ? await getQuizForLearner(assessment.id)
      : [];

  return (
    <>
      <PageHeader
        eyebrow={course.title}
        title={assessment.title}
        lede={
          assessment.kind === "quiz"
            ? "Answer the questions below. You will see your score straight away."
            : "Submit your work below. A marker will read it and write back."
        }
      />

      <Section surface="paper">
        <Container>
          <div className="max-w-2xl">
            <p className="mb-8">
              <Link
                href={basePath}
                className="text-slate text-small underline underline-offset-2"
              >
                Back to {course.title}
              </Link>
            </p>

            <p className="text-slate text-small mb-6">
              Pass mark {assessment.pass_mark}%
              {remaining ? ` · ${remaining}` : " · unlimited attempts"}
              {showsDeadline(assessment, cohort.pacing) && assessment.due_at
                ? ` · due ${new Date(assessment.due_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </p>

            {!richTextIsEmpty(assessment.instructions_rich) ? (
              <div className="mb-8">
                <RichText body={assessment.instructions_rich} />
              </div>
            ) : null}

            {/* Previous attempts, newest first. Feedback on an earlier attempt
                survives a resubmission and stays readable. */}
            {attempts.length > 0 ? (
              <section className="border-hairline mb-8 border-t pt-6">
                <h2 className="text-ink font-semibold">Your attempts</h2>
                <ul className="mt-4 space-y-4">
                  {attempts.map((attempt) => (
                    <li key={attempt.id} className="border-hairline border p-4">
                      <p className="text-ink text-small font-semibold">
                        Attempt {attempt.attempt}
                        {attempt.score !== null ? ` — ${attempt.score}%` : ""}
                        {attempt.passed === true ? " · passed" : ""}
                        {attempt.passed === false ? " · not yet a pass" : ""}
                      </p>
                      <p className="text-slate text-small mt-1">
                        {attempt.state === "submitted"
                          ? "Waiting to be marked"
                          : `Marked ${
                              attempt.marked_at
                                ? new Date(attempt.marked_at).toLocaleDateString(
                                    "en-GB",
                                    {
                                      timeZone: "Africa/Lagos",
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    },
                                  )
                                : ""
                            }`}
                        {attempt.is_late ? " · submitted late" : ""}
                      </p>
                      {attempt.feedback ? (
                        <div className="border-hairline bg-mist mt-3 border p-3">
                          <p className="text-ink whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
                            {attempt.feedback}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {right.allowed ? (
              assessment.kind === "quiz" ? (
                questions.length === 0 ? (
                  <p className="text-slate leading-relaxed">
                    This quiz has no questions yet. It will appear here once
                    your tutor has added them.
                  </p>
                ) : (
                  <QuizForm
                    courseSlug={course.slug}
                    cohortSlug={cohort.slug}
                    assessmentId={assessment.id}
                    questions={questions}
                    passMark={assessment.pass_mark}
                  />
                )
              ) : (
                <AssignmentForm
                  courseSlug={course.slug}
                  cohortSlug={cohort.slug}
                  assessmentId={assessment.id}
                  submissionType={assessment.submission_type}
                />
              )
            ) : (
              <div className="border-hairline border p-6">
                <p className="text-ink font-semibold">{right.reason}</p>
                {latest?.passed === true ? (
                  <p className="text-slate mt-2 leading-relaxed">
                    Nothing else to do here — your result is recorded against
                    your enrolment.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
