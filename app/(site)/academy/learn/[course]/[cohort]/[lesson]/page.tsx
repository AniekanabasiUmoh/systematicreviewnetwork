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
  lockedLessonReason,
} from "@/lib/academy/curriculum";
import { validateStoredEmbed } from "@/lib/admin/embeds";

/* Sprint 6.3 — one lesson.
 *
 * getLessonForLearner() re-runs the whole gate: enrolment AND drip. It does not
 * trust that the reader arrived from the overview page, because a lesson URL is
 * guessable and gets pasted into group chats. A lesson inside a locked module
 * is simply not in the released curriculum, so this 404s on it.
 *
 * The stored video is re-validated on render by validateStoredEmbed(). The
 * paste-time check already ran, but the sanitizer is the only thing between
 * stored jsonb and rendered HTML, and a row edited directly in the database
 * must not be able to inject a frame. */

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

  const result = await getLessonForLearner(
    learner.id,
    { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
    lessonId,
  );

  /* An enrolled learner who clicked a lesson inside a module drip has not
     opened yet deserves the reason, not a blank 404 — they can already see the
     module and its lock on the overview page, so this leaks nothing. Anyone
     without an enrolment still gets a plain 404 from lockedLessonReason(). */
  if (!result) {
    const reason = await lockedLessonReason(
      learner.id,
      { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
      lessonId,
    );
    if (!reason) notFound();
    return (
      <>
        <PageHeader
          eyebrow={course.title}
          title="Not open yet"
          lede={reason}
        />
        <Section surface="paper">
          <Container>
            <p className="text-slate max-w-2xl leading-relaxed">
              Nothing is wrong and there is nothing for you to do. This part of
              the course opens on its own, and you will find it in the module
              list when it does.
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
          <p className="mb-8">
            <Link
              href={`/academy/learn/${course.slug}/${cohort.slug}`}
              className="text-slate text-small underline underline-offset-2"
            >
              Back to {course.title}
            </Link>
          </p>

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
              <h2 className="text-ink font-semibold">Files for this lesson</h2>
              <p className="text-slate mt-2 leading-relaxed">
                These are yours to keep. Each link is prepared for you when you
                click it, so bookmarking the download itself will not work —
                come back here instead.
              </p>
              <ul className="border-hairline mt-4 space-y-2 border-t pt-4">
                {materials.map((material) => (
                  <li key={material.id}>
                    <a
                      href={`/academy/learn/${course.slug}/${cohort.slug}/${lesson.id}/files/${material.id}`}
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
