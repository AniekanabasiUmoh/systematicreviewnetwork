import Link from "next/link";

import { requireInstructor } from "@/lib/admin/auth";
import { listGradingQueue } from "@/lib/admin/grading";
import { instructorCohortReports } from "@/lib/admin/reporting";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QueueItem } from "@/components/admin/GradingQueue";

/* Sprint 6.8 — the instructor's workspace.
 *
 * Everything here is scoped by the cohorts they are assigned to. An instructor
 * with no assignments sees an empty page with a real sentence, not an error and
 * not somebody else's learners.
 *
 * The scoping happens in the QUERY (listGradingQueue takes cohort ids), not in
 * the template, so another cohort's learner names are never loaded into this
 * page's memory in the first place. */

export const dynamic = "force-dynamic";

export default async function TeachingPage() {
  // The layout already gated this; this is the read, not the check.
  const instructor = await requireInstructor();

  const [queue, reports] = await Promise.all([
    listGradingQueue(instructor.cohortIds),
    instructorCohortReports(instructor.cohortIds),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Your teaching"
        description="The cohorts you teach, the work waiting for you, and how your learners are getting on."
      />

      {instructor.cohortIds.length === 0 ? (
        <div className="border-hairline bg-paper border px-6 py-8">
          <p className="text-slate text-small">
            You are not assigned to any cohorts yet. When someone adds you to
            one, its learners and their work appear here.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-display text-ink text-h3 mb-4">
              Waiting to be marked
            </h2>
            {queue.length === 0 ? (
              <div className="border-hairline bg-paper border px-6 py-8">
                <p className="text-slate text-small">
                  Nothing is waiting. Work appears here as soon as one of your
                  learners submits an assignment.
                </p>
              </div>
            ) : (
              <>
                <p className="text-slate text-small mb-5">
                  {queue.length}{" "}
                  {queue.length === 1 ? "submission is" : "submissions are"}{" "}
                  waiting, oldest first.
                </p>
                <ul className="space-y-5">
                  {queue.map((row) => (
                    <QueueItem key={row.id} row={row} />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section>
            <h2 className="text-display text-ink text-h3 mb-4">Your cohorts</h2>
            <ul className="space-y-3">
              {reports.map((report) => (
                <li
                  key={report.cohortId}
                  className="border-hairline bg-paper border p-5"
                >
                  <p className="text-ink text-small font-semibold">
                    {report.courseTitle} — {report.cohortLabel}
                  </p>
                  <p className="text-slate text-small mt-2">
                    {report.enrolled}{" "}
                    {report.enrolled === 1 ? "learner" : "learners"} ·{" "}
                    {report.completed} finished ({report.completionRate}%)
                    {report.averageScore > 0
                      ? ` · average score ${report.averageScore}%`
                      : ""}
                  </p>
                  {report.dropoutLessonTitle ? (
                    <p className="text-slate text-small mt-1">
                      Most learners stop at: {report.dropoutLessonTitle}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-slate text-small mt-10">
        Signed in as {instructor.email}.{" "}
        <Link href="/admin/account" className="underline underline-offset-2">
          Change your password
        </Link>
      </p>
    </>
  );
}
