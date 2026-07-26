import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCohort } from "@/lib/academy/courses";
import { requireVerifiedLearner } from "@/lib/academy/auth";
import { getCurriculumForLearner } from "@/lib/academy/curriculum";
import { formatCohortDates } from "@/lib/academy/cohorts";

/* Sprint 6.3 — the learner's curriculum overview.
 *
 * The gate is getCurriculumForLearner(), which returns null without a
 * qualifying enrolment. That null becomes a 404, deliberately: telling an
 * unenrolled visitor "you are not enrolled in this" confirms the cohort exists
 * and has content. A 404 tells them nothing at all.
 *
 * Drip is applied inside that function, so a locked module arrives here with an
 * empty `lessons` array — its titles never reach the browser. */

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
  const { course: courseSlug, cohort: cohortSlug } = await params;
  const learner = await requireVerifiedLearner();

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found) notFound();
  const { course, cohort } = found;

  const modules = await getCurriculumForLearner(learner.id, {
    id: cohort.id,
    course_id: course.id,
    pacing: cohort.pacing,
  });
  if (!modules) notFound();

  const totalLessons = modules.reduce(
    (count, module) => count + module.lessons.length,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={course.title}
        lede={`${cohort.label} — ${formatCohortDates(cohort.starts_on, cohort.ends_on, cohort.pacing)}.`}
      />

      <Section surface="paper">
        <Container>
          {modules.length === 0 ? (
            <p className="text-slate max-w-2xl leading-relaxed">
              The teaching for this cohort is being prepared. Everything will
              appear here as soon as it is ready, and you do not need to do
              anything in the meantime.
            </p>
          ) : (
            <>
              <p className="text-slate mb-8 max-w-2xl leading-relaxed">
                {modules.length} {modules.length === 1 ? "module" : "modules"} ·{" "}
                {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
                {cohort.pacing === "self_paced"
                  ? " · everything is open from today, at your own pace"
                  : ""}
              </p>

              <ol className="space-y-6">
                {modules.map((module, index) => (
                  <li key={module.id} className="border-hairline border p-5">
                    <p className="text-slate text-small">
                      Module {index + 1}
                    </p>
                    <h2 className="text-ink mt-1 font-semibold">
                      {module.title}
                    </h2>
                    {module.summary ? (
                      <p className="text-slate mt-2 leading-relaxed">
                        {module.summary}
                      </p>
                    ) : null}

                    {!module.released ? (
                      <p className="text-slate border-hairline mt-4 border-t pt-4 leading-relaxed">
                        {module.lockedReason}
                      </p>
                    ) : module.lessons.length === 0 ? (
                      <p className="text-slate mt-4 leading-relaxed">
                        No lessons in this module yet.
                      </p>
                    ) : (
                      <ul className="border-hairline mt-4 space-y-2 border-t pt-4">
                        {module.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              href={`/academy/learn/${course.slug}/${cohort.slug}/${lesson.id}`}
                              className="text-ink underline underline-offset-2"
                            >
                              {lesson.title}
                            </Link>
                            {lesson.estimated_minutes ? (
                              <span className="text-slate text-small">
                                {" "}
                                · {lesson.estimated_minutes} min
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
