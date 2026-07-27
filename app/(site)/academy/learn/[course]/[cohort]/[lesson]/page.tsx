import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { Embed } from "@/components/ui/Embed";
import { getCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import {
  getLessonForLearner,
  getCurriculumForLearner,
  getEnrolment,
  lockedLessonReason,
} from "@/lib/academy/curriculum";
import { getCompletedLessonIds, summarise } from "@/lib/academy/progress";
import { validateStoredEmbed } from "@/lib/admin/embeds";
import {
  ProgressBar,
  CourseContents,
  MarkCompleteButton,
  type PlayerModule,
} from "@/components/academy/CoursePlayer";

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

  const playerModules: PlayerModule[] = (modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    released: module.released,
    lockedReason: module.lockedReason,
    lessons: module.lessons.map((row) => ({
      id: row.id,
      title: row.title,
      estimated_minutes: row.estimated_minutes,
      done: completed.has(row.id),
    })),
  }));

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

  return (
    <>
      <PageHeader
        eyebrow={course.title}
        title={lesson.title}
        lede={lesson.summary ?? undefined}
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="mb-6">
                <ProgressBar
                  completed={progress.completedCount}
                  total={progress.totalCount}
                  percent={progress.percent}
                />
              </div>
              <CourseContents
                modules={playerModules}
                basePath={basePath}
                currentLessonId={lesson.id}
              />
            </aside>

            <article className="min-w-0">
              {lesson.estimated_minutes ? (
                <p className="text-slate text-small mb-6">
                  About {lesson.estimated_minutes} minutes
                </p>
              ) : null}

              {embed?.ok ? (
                <div className="mb-8 max-w-3xl">
                  <Embed
                    provider={embed.provider}
                    id={embed.id}
                    title={embed.title}
                    url={embed.url}
                  />
                </div>
              ) : null}

              {!richTextIsEmpty(lesson.body_rich) ? (
                <div className="max-w-2xl">
                  <RichText body={lesson.body_rich} />
                </div>
              ) : null}

              {materials.length > 0 ? (
                <section className="mt-10 max-w-2xl">
                  <h2 className="text-ink font-semibold">
                    Files for this lesson
                  </h2>
                  <p className="text-slate mt-2 leading-relaxed">
                    These are yours to keep. Each link is prepared for you when
                    you click it, so bookmarking the download itself will not
                    work — come back here instead.
                  </p>
                  <ul className="border-hairline mt-4 space-y-2 border-t pt-4">
                    {materials.map((material) => (
                      <li key={material.id}>
                        <a
                          href={`${basePath}/${lesson.id}/files/${material.id}`}
                          className="text-ink underline underline-offset-2"
                        >
                          {material.title}
                        </a>
                        <span className="text-slate text-small">
                          {" "}
                          · {material.file_name}
                          {material.size_bytes
                            ? ` · ${formatSize(material.size_bytes)}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <MarkCompleteButton
                courseSlug={course.slug}
                cohortSlug={cohort.slug}
                lessonId={lesson.id}
                done={completed.has(lesson.id)}
                nextHref={nextId ? `${basePath}/${nextId}` : null}
              />
            </article>
          </div>
        </Container>
      </Section>
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
