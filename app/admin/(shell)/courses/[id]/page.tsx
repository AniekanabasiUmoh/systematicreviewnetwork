import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  courseFields,
  cohortFields,
  getCourseRow,
  listCohorts,
  listProgrammeOptions,
} from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseForm, CohortForm } from "@/components/admin/CourseForm";
import {
  CourseStatusControl,
  CourseDangerZone,
  CohortRowActions,
} from "@/components/admin/AcademyActions";
import {
  cohortState,
  cohortLabel,
  formatCohortDates,
  PACING_LABELS,
} from "@/lib/academy/cohorts";
import { getCohortSeatCounts } from "@/lib/academy/courses";
import { formatPrice } from "@/lib/events";

/* Sprint 6.2 — the course workspace.
 *
 * §6.2 asks for "admin CRUD nested Programme -> Course -> Cohort, not three
 * flat lists". This page is that nesting: a course's own fields, then its
 * cohorts in place, then the form to add another. A staffer opening "Spring
 * 2026" never has to know a cohort is a separate table. */

export const dynamic = "force-dynamic";

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const course = await getCourseRow(id);
  if (!course) notFound();

  const [programmes, cohorts] = await Promise.all([
    listProgrammeOptions(),
    listCohorts(course.id),
  ]);
  const seats = await getCohortSeatCounts(cohorts.map((row) => row.id));

  return (
    <>
      <AdminPageHeader
        title={course.title}
        description={
          course.archived_at
            ? "This course is archived. It is off the public site; publishing it again will restore it."
            : "Edit the teaching here. Each run of the course is a cohort, listed below."
        }
      />

      <div className="border-hairline bg-paper mb-5 flex flex-wrap items-center justify-between gap-4 border p-4">
        <div>
          <p className="text-ink text-small font-semibold capitalize">
            Current status: {course.status}
            {course.archived_at ? " · archived" : ""}
          </p>
          {course.status === "published" ? (
            <Link
              href={`/academy/${course.slug}`}
              className="text-slate text-small underline underline-offset-2"
            >
              View on the public site
            </Link>
          ) : (
            <p className="text-slate text-small">
              Drafts are not on the public site. Publish when the syllabus is ready.
            </p>
          )}
        </div>
        <CourseStatusControl id={course.id} status={course.status} />
      </div>

      <div className="border-hairline bg-paper mb-5 flex flex-wrap items-center justify-between gap-4 border p-4">
        <div>
          <p className="text-ink text-small font-semibold">Curriculum</p>
          <p className="text-slate text-small">
            The modules and lessons every cohort of this course inherits.
          </p>
        </div>
        <Link
          href={`/admin/courses/${course.id}/curriculum`}
          className="text-ink text-small underline underline-offset-2"
        >
          Edit curriculum
        </Link>
      </div>

      <CourseForm
        fields={courseFields(programmes)}
        initial={course as unknown as Record<string, unknown>}
      />

      <section className="mt-10">
        <h2 className="text-display text-ink text-h3">Cohorts</h2>
        <p className="text-slate text-small mt-2 max-w-2xl">
          One cohort per run of this course. Duplicating a cohort copies its
          price, capacity and pacing but not its dates, so last term&rsquo;s run
          stays as history.
        </p>

        {cohorts.length === 0 ? (
          <div className="border-hairline bg-paper mt-5 border px-6 py-8">
            <p className="text-slate text-small">
              This course has no cohorts yet, so nobody can enrol in it. Add one
              below with the dates you plan to run it.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {cohorts.map((cohort) => {
              const state = cohortState(cohort, seats[cohort.id] ?? 0);
              return (
                <li key={cohort.id} className="border-hairline bg-paper border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/admin/courses/${course.id}/cohorts/${cohort.id}`}
                        className="text-ink text-small font-semibold underline underline-offset-2"
                      >
                        {cohort.label}
                      </Link>
                      <p className="text-slate text-small mt-1">
                        {formatCohortDates(
                          cohort.starts_on,
                          cohort.ends_on,
                          cohort.pacing,
                        )}
                      </p>
                      <p className="text-slate text-small mt-1">
                        {PACING_LABELS[cohort.pacing] ?? cohort.pacing} ·{" "}
                        {formatPrice(
                          cohort.price_kobo,
                          cohort.currency as "NGN" | "USD",
                        )}{" "}
                        ·{" "}
                        {cohort.capacity === null
                          ? "No capacity limit"
                          : `${seats[cohort.id] ?? 0} of ${cohort.capacity} seats taken`}
                      </p>
                    </div>
                    <p className="text-slate text-small capitalize">
                      {cohort.status} · {cohortLabel[state]}
                      {cohort.archived_at ? " · archived" : ""}
                    </p>
                  </div>
                  <div className="border-hairline mt-4 border-t pt-4">
                    <CohortRowActions
                      id={cohort.id}
                      label={cohort.label}
                      status={cohort.status}
                      enrolmentClosed={cohort.enrolment_closed_manually}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8">
          <h3 className="text-ink text-small mb-3 font-semibold">
            Add a cohort
          </h3>
          <CohortForm fields={cohortFields([])} courseId={course.id} />
        </div>
      </section>

      <CourseDangerZone
        id={course.id}
        title={course.title}
        cohortCount={cohorts.length}
      />
    </>
  );
}
