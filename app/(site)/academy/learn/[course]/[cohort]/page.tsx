import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
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
import {
  ProgressBar,
  CourseContents,
  type PlayerModule,
} from "@/components/academy/CoursePlayer";

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

  const playerModules: PlayerModule[] = modules.map((module) => ({
    id: module.id,
    title: module.title,
    released: module.released,
    lockedReason: module.lockedReason,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      estimated_minutes: lesson.estimated_minutes,
      done: completed.has(lesson.id),
    })),
  }));

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

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={course.title}
        lede={`${cohort.label} — ${formatCohortDates(cohort.starts_on, cohort.ends_on, cohort.pacing)}.`}
        compact
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
            {/* Contents: collapsible on a phone, sticky column on desktop. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-6">
                <ProgressBar
                  completed={progress.completedCount}
                  total={progress.totalCount}
                  percent={progress.percent}
                />
              </div>
              <CourseContents modules={playerModules} basePath={basePath} />
            </aside>

            <div className="min-w-0">
              {modules.length === 0 ? (
                <p className="text-slate max-w-2xl leading-relaxed">
                  The teaching for this cohort is being prepared. Everything
                  will appear here as soon as it is ready, and you do not need
                  to do anything in the meantime.
                </p>
              ) : (
                <>
                  <h2 className="text-display text-ink text-h3">
                    {progress.completedCount === 0
                      ? "Start here"
                      : resumeId
                        ? "Pick up where you left off"
                        : "You're up to date"}
                  </h2>
                  <p className="text-slate mt-2 mb-6 max-w-2xl leading-relaxed">
                    {resumeId
                      ? "Your progress is saved to your account, so you can carry on from any device."
                      : "You have finished everything that is open so far. Anything new will appear here."}
                  </p>
                  {resumeId ? (
                    <div className="border-hairline border p-5">
                      <p className="text-slate text-small">
                        {resumeModuleTitle
                          ? `Next in ${resumeModuleTitle}`
                          : "Next up"}
                      </p>
                      <p className="text-ink mt-1 text-h4 font-semibold">
                        {resumeLessonTitle}
                      </p>
                      {resumeMinutes ? (
                        <p className="text-slate text-small mt-1">
                          About {resumeMinutes} minutes
                        </p>
                      ) : null}
                      <div className="mt-5">
                        <ButtonLink href={`${basePath}/${resumeId}`}>
                          {progress.completedCount === 0
                            ? "Start the first lesson"
                            : "Continue"}
                        </ButtonLink>
                      </div>
                    </div>
                  ) : null}

                  {/* What the course is. Without this the page is a to-do list
                      with no sense of what it is a to-do list FOR. */}
                  {!richTextIsEmpty(course.body_rich) ? (
                    <section className="border-hairline mt-12 border-t pt-8">
                      <h2 className="text-display text-ink text-h3 mb-4">
                        About this course
                      </h2>
                      <div className="max-w-2xl">
                        <RichText body={course.body_rich} />
                      </div>
                    </section>
                  ) : null}
                </>
              )}

              <section className="border-hairline mt-12 border p-6">
                <h2 className="text-display text-ink text-h3 mb-4">
                  Certificate
                </h2>
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
              </section>

              {assessments.length > 0 ? (
                <section className="mt-12">
                  <h2 className="text-display text-ink text-h3">
                    Quizzes and assignments
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {assessments.map((item) => (
                      <li key={item.id} className="border-hairline border p-5">
                        <Link
                          href={`${basePath}/assessments/${item.id}`}
                          className="text-ink font-semibold underline underline-offset-2"
                        >
                          {item.title}
                        </Link>
                        <p className="text-slate text-small mt-1">
                          {item.kind === "quiz"
                            ? "Quiz — marked straight away"
                            : "Assignment — marked by a person"}
                          {" · pass mark "}
                          {item.pass_mark}%
                          {showsDeadline(item, cohort.pacing) && item.due_at
                            ? ` · due ${new Date(item.due_at).toLocaleDateString(
                                "en-GB",
                                {
                                  timeZone: "Africa/Lagos",
                                  day: "numeric",
                                  month: "long",
                                },
                              )}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {upcoming.length > 0 ? (
                <section className="mt-12">
                  <h2 className="text-display text-ink text-h3">
                    Live sessions
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {upcoming.map((session) => (
                      <li
                        key={session.id}
                        className="border-hairline border p-5"
                      >
                        <p className="text-ink font-semibold">{session.title}</p>
                        <p className="text-slate text-small mt-1">
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
                          <div className="mt-4">
                            <ButtonLink
                              href={`${basePath}/sessions/${session.id}/join`}
                            >
                              Join the session
                            </ButtonLink>
                          </div>
                        ) : (
                          <p className="text-slate text-small mt-3">
                            The joining link appears here fifteen minutes before
                            the session starts.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {(announcements ?? []).length > 0 ? (
                <section className="mt-12">
                  <h2 className="text-display text-ink text-h3">
                    Announcements
                  </h2>
                  <ul className="mt-5 space-y-6">
                    {(announcements ?? []).map((note) => (
                      <li
                        key={note.id}
                        className="border-hairline border-t pt-5 first:border-t-0 first:pt-0"
                      >
                        <p className="text-ink font-semibold">{note.title}</p>
                        <p className="text-slate text-small mt-1">
                          {note.published_at
                            ? new Date(note.published_at).toLocaleDateString(
                                "en-GB",
                                {
                                  timeZone: "Africa/Lagos",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )
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

              <p className="mt-12">
                <Link
                  href="/account"
                  className="text-slate text-small underline underline-offset-2"
                >
                  All your courses
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
