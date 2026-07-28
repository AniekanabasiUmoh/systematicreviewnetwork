import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseShell, MonoLabel } from "@/components/academy/CourseShell";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { getEnrolledCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import {
  getEnrolment,
  getCurriculumForLearner,
} from "@/lib/academy/curriculum";
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

  const found = await getEnrolledCohort(courseSlug, cohortSlug);
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

  const curriculum = await getCurriculumForLearner(
    learner.id,
    cohortRef,
    completed,
  );

  const questions =
    assessment.kind === "quiz" && right.allowed
      ? await getQuizForLearner(assessment.id)
      : [];

  const shellModules = (curriculum ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    released: module.released,
    lockedReason: module.lockedReason,
    lessons: module.lessons.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      minutes: row.estimated_minutes,
      done: completed.has(row.id),
    })),
  }));

  const visible = (curriculum ?? []).flatMap((m) => m.lessons.map((l) => l.id));
  const doneCount = visible.filter((id) => completed.has(id)).length;
  const percent =
    visible.length === 0 ? 0 : Math.round((doneCount / visible.length) * 100);

  return (
    <CourseShell
      courseTitle={course.title}
      crumb={assessment.title}
      basePath={basePath}
      modules={shellModules}
      percent={percent}
      completedCount={doneCount}
      totalCount={visible.length}
    >
      <div className="mx-auto max-w-3xl">
        <header className="border-hairline border-b pb-8">
          <MonoLabel className="text-slate/70">
            {assessment.kind === "quiz" ? "Quiz" : "Assignment"}
          </MonoLabel>
          <h1 className="text-display-tight text-ink mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] text-pretty">
            {assessment.title}
          </h1>
          <p className="text-slate mt-4 max-w-2xl text-sm/7">
            {assessment.kind === "quiz"
              ? "Answer the questions below. Your score appears as soon as you submit."
              : "Submit your work below. A marker will read it and write back."}
          </p>
          <p className="text-slate/80 mt-5 text-[0.8125rem]/6">
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
        </header>

        {!richTextIsEmpty(assessment.instructions_rich) ? (
          <div className="mt-10 max-w-2xl">
            <RichText body={assessment.instructions_rich} />
          </div>
        ) : null}

        {/* Previous attempts, newest first. Feedback on an earlier attempt
            survives a resubmission and stays readable. */}
        {attempts.length > 0 ? (
          <section className="border-hairline mt-12 border-t pt-10">
            <MonoLabel className="text-slate/70">Your attempts</MonoLabel>
            <ul className="mt-6 space-y-5">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="border-hairline border p-5">
                  <p className="text-ink text-sm/6 font-semibold">
                    Attempt {attempt.attempt}
                    {attempt.score !== null ? ` — ${attempt.score}%` : ""}
                    {attempt.passed === true ? " · passed" : ""}
                    {attempt.passed === false ? " · not yet a pass" : ""}
                  </p>
                  <p className="text-slate/80 mt-1 text-[0.8125rem]/6">
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
                    <div className="border-hairline bg-mist/60 mt-4 border p-4">
                      <p className="text-ink text-sm/7 whitespace-pre-wrap">
                        {attempt.feedback}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          className={`${
            attempts.length > 0 || !richTextIsEmpty(assessment.instructions_rich)
              ? "border-hairline mt-12 border-t pt-10"
              : "mt-10"
          }`}
        >
          {right.allowed ? (
            assessment.kind === "quiz" ? (
              questions.length === 0 ? (
                <p className="text-slate text-sm/7">
                  This quiz has no questions yet. It will appear here once your
                  tutor has added them.
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
              <p className="text-ink text-sm/6 font-semibold">{right.reason}</p>
              {latest?.passed === true ? (
                <p className="text-slate mt-2 text-sm/7">
                  Nothing else to do here — your result is recorded against your
                  enrolment.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </CourseShell>
  );
}
