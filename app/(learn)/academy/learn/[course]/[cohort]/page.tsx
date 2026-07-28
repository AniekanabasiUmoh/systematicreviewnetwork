import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { getEnrolledCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import {
  getCurriculumForLearner,
  getEnrolment,
} from "@/lib/academy/curriculum";
import {
  getCompletedLessonIds,
  summarise,
  nextLessonId,
} from "@/lib/academy/progress";
import {
  getSessionsForLearner,
  getAnnouncementsForLearner,
} from "@/lib/academy/sessions";
import {
  listAssessmentsForLearner,
  showsDeadline,
} from "@/lib/academy/assessment";
import {
  getCertificate,
  checkEligibility,
} from "@/lib/academy/certificates";
import {
  CertificateClaim,
  CertificateIssuedPanel,
} from "@/components/academy/CertificatePanel";
import { formatCohortDates } from "@/lib/academy/cohorts";
import { CourseShell, MonoLabel } from "@/components/academy/CourseShell";
import { CourseOverview } from "@/components/academy/CourseOverview";

/* Sprint 6.5 — the course home.
 *
 * Layout is responsive in both directions from one tree: a single column on a
 * phone with the contents list collapsible, and a sticky sidebar beside the
 * content from `lg` up. Same grid idiom as /news/events/[slug] and the course
 * page, so the Academy does not invent a second layout language. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your course",
  robots: { index: false },
};

export default async function LearnPage({
  params,
}: {
  params: Promise<{ course: string; cohort: string }>;
}) {
  const renderedAt = new Date();
  const { course: courseSlug, cohort: cohortSlug } = await params;
  const learner = await requireVerifiedLearner();

  const found = await getEnrolledCohort(courseSlug, cohortSlug);
  if (!found) notFound();
  const { course, cohort } = found;

  const enrolment = await getEnrolment(learner.id, cohort.id);
  if (!enrolment) notFound();

  /* Progress feeds back into the drip rule: an `after_previous` module opens
     because of what is in this set, so it must be read BEFORE the curriculum. */
  const completed = await getCompletedLessonIds(enrolment.id);
  const modules = await getCurriculumForLearner(
    learner.id,
    { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
    completed,
  );
  if (!modules) notFound();

  const [sessions, announcements, assessmentList] = await Promise.all([
    getSessionsForLearner(
      learner.id,
      { id: cohort.id, pacing: cohort.pacing },
      renderedAt,
    ),
    getAnnouncementsForLearner(learner.id, cohort.id),
    listAssessmentsForLearner(learner.id, { id: cohort.id, course_id: course.id, pacing: cohort.pacing }, completed),
  ]);
  const assessments = assessmentList ?? [];

  const certificate = await getCertificate(enrolment.id);
  /* Only computed when there is nothing to show yet — an issued certificate
     needs no eligibility check, and this walks the whole curriculum. */
  const eligibility = certificate
    ? ({ eligible: false, reason: "" } as const)
    : await checkEligibility(enrolment.id, {
        id: cohort.id,
        course_id: course.id,
        pacing: cohort.pacing,
      });

  const visible = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progress = summarise(completed, visible);
  const resumeId = nextLessonId(completed, visible);

  /* Name the next lesson rather than offering a bare "Continue". A learner
     returning after a week should be able to see what they are about to do
     before committing a click to it. */
  const resumeModule = resumeId
    ? modules.find((m) => m.lessons.some((l) => l.id === resumeId))
    : undefined;
  const resumeLesson = resumeModule?.lessons.find((l) => l.id === resumeId);
  const resumeLessonTitle = resumeLesson?.title ?? "";
  const resumeModuleTitle = resumeModule?.title ?? "";
  const resumeMinutes = resumeLesson?.estimated_minutes ?? null;
  const basePath = `/academy/learn/${course.slug}/${cohort.slug}`;

  /* Read the clock once, before rendering, and pass it down. Calling Date.now()
     inside the render would make the output depend on when React happened to
     evaluate it. */
  const now = renderedAt.getTime();
  const upcoming = (sessions ?? []).filter(
    (session) =>
      new Date(session.starts_at).getTime() +
        session.duration_minutes * 60_000 >
      now,
  );


  const shellModules = modules.map((module) => ({
    id: module.id,
    title: module.title,
    released: module.released,
    lockedReason: module.lockedReason,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      minutes: lesson.estimated_minutes,
      done: completed.has(lesson.id),
    })),
  }));

  const totalMinutes = modules.reduce(
    (n, m) => n + m.lessons.reduce((x, l) => x + (l.estimated_minutes ?? 0), 0),
    0,
  );

  return (
    <CourseShell
      courseTitle={course.title}
      crumb="Overview"
      basePath={basePath}
      modules={shellModules}
      percent={progress.percent}
      completedCount={progress.completedCount}
      totalCount={progress.totalCount}
    >
      {modules.length === 0 ? (
        <div className="mx-auto max-w-3xl">
          <h1 className="text-display-tight text-ink text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.05]">
            {course.title}
          </h1>
          <p className="text-slate mt-5 max-w-2xl text-sm/7">
            The teaching for this cohort is being prepared. Everything will
            appear here as soon as it is ready, and you do not need to do
            anything in the meantime.
          </p>
        </div>
      ) : (
        <CourseOverview
          courseTitle={course.title}
          summary={course.summary}
          bodyRich={course.body_rich}
          cohortLine={`${cohort.label} — ${formatCohortDates(cohort.starts_on, cohort.ends_on, cohort.pacing)}.`}
          modules={shellModules}
          basePath={basePath}
          resume={
            resumeId
              ? {
                  id: resumeId,
                  title: resumeLessonTitle,
                  started: progress.completedCount > 0,
                }
              : null
          }
          totalLessons={progress.totalCount}
          totalMinutes={totalMinutes}
        />
      )}

      <div className="mx-auto mt-16 max-w-3xl space-y-14">
        {assessments.length > 0 ? (
          <section className="border-hairline border-t pt-12">
            <MonoLabel className="text-slate/70">
              Quizzes and assignments
            </MonoLabel>
            <ul className="mt-6 space-y-5">
              {assessments.map((item) => (
                <li key={item.id}>
                  <p className="text-sm/6">
                    <Link
                      href={`${basePath}/assessments/${item.id}`}
                      className="text-ink font-semibold hover:underline"
                    >
                      {item.title}
                    </Link>
                  </p>
                  <p className="text-slate mt-1 text-sm/6">
                    {item.kind === "quiz"
                      ? "Quiz — marked as soon as you submit"
                      : "Assignment — marked by a person"}
                    {" · pass mark "}
                    {item.pass_mark}%
                    {showsDeadline(item, cohort.pacing) && item.due_at
                      ? ` · due ${new Date(item.due_at).toLocaleDateString("en-GB", {
                          timeZone: "Africa/Lagos",
                          day: "numeric",
                          month: "long",
                        })}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <section className="border-hairline border-t pt-12">
            <MonoLabel className="text-slate/70">Live sessions</MonoLabel>
            <ul className="mt-6 space-y-6">
              {upcoming.map((session) => (
                <li key={session.id}>
                  <p className="text-ink text-sm/6 font-semibold">
                    {session.title}
                  </p>
                  <p className="text-slate mt-1 text-sm/6">
                    {new Date(session.starts_at).toLocaleString("en-GB", {
                      timeZone: "Africa/Lagos",
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {session.duration_minutes} minutes · Lagos time
                  </p>
                  {session.join_url ? (
                    <p className="mt-3">
                      <Link
                        href={`${basePath}/sessions/${session.id}/join`}
                        className="bg-ink hover:bg-ink/90 text-paper inline-flex px-4 py-2 text-sm font-semibold transition-colors"
                      >
                        Join the session
                      </Link>
                    </p>
                  ) : (
                    <p className="text-slate/80 mt-2 text-[0.8125rem]/6">
                      The joining link appears here fifteen minutes before the
                      session starts.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(announcements ?? []).length > 0 ? (
          <section className="border-hairline border-t pt-12">
            <MonoLabel className="text-slate/70">Announcements</MonoLabel>
            <ul className="mt-6 space-y-8">
              {(announcements ?? []).map((note) => (
                <li key={note.id}>
                  <p className="text-ink text-sm/6 font-semibold">
                    {note.title}
                  </p>
                  <p className="text-slate/80 mt-1 text-[0.8125rem]/6">
                    {note.published_at
                      ? new Date(note.published_at).toLocaleDateString("en-GB", {
                          timeZone: "Africa/Lagos",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                  {!richTextIsEmpty(note.body_rich) ? (
                    <div className="mt-3 max-w-2xl">
                      <RichText body={note.body_rich} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="border-hairline border-t pt-12">
          <MonoLabel className="text-slate/70">Certificate</MonoLabel>
          <div className="mt-6">
            {certificate ? (
              <CertificateIssuedPanel
                code={certificate.code}
                revoked={Boolean(certificate.revoked_at)}
              />
            ) : (
              <CertificateClaim
                courseSlug={course.slug}
                cohortSlug={cohort.slug}
                eligible={eligibility.eligible}
                reason={eligibility.eligible ? null : eligibility.reason}
              />
            )}
          </div>
        </section>
      </div>
    </CourseShell>
  );
}
