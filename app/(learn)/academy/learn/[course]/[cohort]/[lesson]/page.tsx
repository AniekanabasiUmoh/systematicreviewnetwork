import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { Embed } from "@/components/ui/Embed";
import { getEnrolledCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import {
  getLessonForLearner,
  getCurriculumForLearner,
  getEnrolment,
  lockedLessonReason,
} from "@/lib/academy/curriculum";
import { getCompletedLessonIds, summarise } from "@/lib/academy/progress";
import { validateStoredEmbed } from "@/lib/admin/embeds";
import { MarkCompleteButton } from "@/components/academy/CoursePlayer";
import { CourseShell, MonoLabel } from "@/components/academy/CourseShell";

/* Sprint 6.5 — one lesson, inside the player.
 *
 * Same two-column grid as the course home, so moving between them does not
 * move the navigation. The contents list is collapsed behind a summary on a
 * phone — a lesson should start at the top of the screen, not below a long
 * index — and becomes a sticky column from `lg` up. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lesson",
  robots: { index: false },
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; cohort: string; lesson: string }>;
}) {
  const {
    course: courseSlug,
    cohort: cohortSlug,
    lesson: lessonId,
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

  const result = await getLessonForLearner(
    learner.id,
    cohortRef,
    lessonId,
    completed,
  );

  /* An enrolled learner who clicked a lesson drip has not opened yet deserves
     the reason, not a blank 404 — they can already see the lock in the contents
     list. Anyone without an enrolment never reaches here. */
  if (!result) {
    const reason = await lockedLessonReason(
      learner.id,
      cohortRef,
      lessonId,
      completed,
    );
    if (!reason) notFound();
    return (
      <>
        <PageHeader eyebrow={course.title} title="Not open yet" lede={reason} />
        <Section surface="paper">
          <Container>
            <p className="text-slate max-w-2xl leading-relaxed">
              Nothing is wrong and there is nothing for you to do. This part of
              the course opens on its own, and you will find it in the contents
              when it does.
            </p>
            <p className="mt-6">
              <Link
                href={`/academy/learn/${course.slug}/${cohort.slug}`}
                className="text-ink underline underline-offset-2"
              >
                Back to {course.title}
              </Link>
            </p>
          </Container>
        </Section>
      </>
    );
  }

  const { lesson, materials } = result;

  const modules = await getCurriculumForLearner(
    learner.id,
    cohortRef,
    completed,
  );
  const visible = (modules ?? []).flatMap((m) => m.lessons.map((l) => l.id));
  const progress = summarise(completed, visible);
  const basePath = `/academy/learn/${course.slug}/${cohort.slug}`;

  /* "Next" is the following lesson in course order, not the next unfinished
     one: someone re-reading lesson 3 expects 4, not to be sent to the end. */
  const position = visible.indexOf(lesson.id);
  const nextId =
    position >= 0 && position < visible.length - 1
      ? visible[position + 1]
      : null;

  const embed = lesson.video_embed
    ? validateStoredEmbed(lesson.video_embed as Record<string, unknown>)
    : null;

  const shellModules = (modules ?? []).map((module) => ({
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

  const moduleTitle =
    (modules ?? []).find((m) => m.lessons.some((l) => l.id === lesson.id))
      ?.title ?? "";

  return (
    <CourseShell
      courseTitle={course.title}
      crumb={lesson.title}
      basePath={basePath}
      modules={shellModules}
      currentLessonId={lesson.id}
      percent={progress.percent}
      completedCount={progress.completedCount}
      totalCount={progress.totalCount}
    >
      <article className="mx-auto max-w-3xl">
        <header className="border-hairline border-b pb-8">
          {moduleTitle ? (
            <MonoLabel className="text-slate/70">{moduleTitle}</MonoLabel>
          ) : null}
          <h1 className="text-display-tight text-ink mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] text-pretty">
            {lesson.title}
          </h1>
          {lesson.summary ? (
            <p className="text-slate mt-4 max-w-2xl text-sm/7 text-pretty">
              {lesson.summary}
            </p>
          ) : null}
          {lesson.estimated_minutes ? (
            <p className="text-slate/80 mt-5 text-[0.8125rem]/6">
              About {lesson.estimated_minutes} minutes
            </p>
          ) : null}
        </header>

        {embed?.ok ? (
          <div className="mt-10">
            <Embed
              provider={embed.provider}
              id={embed.id}
              title={embed.title}
              url={embed.url}
            />
          </div>
        ) : null}

        {!richTextIsEmpty(lesson.body_rich) ? (
          <div className="mt-10 max-w-2xl">
            <RichText body={lesson.body_rich} />
          </div>
        ) : null}

        {materials.length > 0 ? (
          <section className="border-hairline mt-14 border-t pt-10">
            <MonoLabel className="text-slate/70">
              Files for this lesson
            </MonoLabel>
            <p className="text-slate mt-4 max-w-2xl text-sm/7">
              These are yours to keep. Each link is prepared when you click it,
              so bookmarking a download will not work — come back here instead.
            </p>
            <ul className="mt-6 space-y-3">
              {materials.map((material) => (
                <li key={material.id} className="text-sm/6">
                  <a
                    href={`${basePath}/${lesson.id}/files/${material.id}`}
                    className="text-ink font-semibold hover:underline"
                  >
                    {material.title}
                  </a>
                  <span className="text-slate/70">
                    {" · "}
                    {material.file_name}
                    {material.size_bytes
                      ? ` · ${formatSize(material.size_bytes)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="border-hairline mt-14 border-t pt-8">
          <MarkCompleteButton
            courseSlug={course.slug}
            cohortSlug={cohort.slug}
            lessonId={lesson.id}
            done={completed.has(lesson.id)}
            nextHref={nextId ? `${basePath}/${nextId}` : null}
          />
        </div>
      </article>
    </CourseShell>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
