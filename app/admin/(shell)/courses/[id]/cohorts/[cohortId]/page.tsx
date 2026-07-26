import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  cohortFields,
  getCourseRow,
  getCohortRow,
  listCourseOptions,
} from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CohortForm } from "@/components/admin/CourseForm";
import { CohortRowActions } from "@/components/admin/AcademyActions";
import { cohortState, cohortLabel } from "@/lib/academy/cohorts";
import { getCohortSeatCounts } from "@/lib/academy/courses";

export const dynamic = "force-dynamic";

export default async function AdminCohortPage({
  params,
}: {
  params: Promise<{ id: string; cohortId: string }>;
}) {
  await requireStaff();
  const { id, cohortId } = await params;
  const [course, cohort] = await Promise.all([
    getCourseRow(id),
    getCohortRow(cohortId),
  ]);

  // A cohort id from another course must not render under this course's
  // heading — the URL is a claim about the relationship, so check it.
  if (!course || !cohort || cohort.course_id !== course.id) notFound();

  const courses = await listCourseOptions();
  const seats = await getCohortSeatCounts([cohort.id]);
  const state = cohortState(cohort, seats[cohort.id] ?? 0);

  /* The form takes a price in whole naira; the column stores kobo. Converting
     here rather than in the component keeps the minor-unit boundary in one
     place — the schema converts on the way in, this converts on the way out. */
  const initial = {
    ...(cohort as unknown as Record<string, unknown>),
    price_naira: cohort.price_kobo / 100,
  };

  return (
    <>
      <AdminPageHeader
        title={cohort.label}
        description={`A run of ${course.title}. Currently ${cohortLabel[state].toLowerCase()}.`}
      />

      <p className="text-slate text-small mb-5">
        <Link
          href={`/admin/courses/${course.id}`}
          className="underline underline-offset-2"
        >
          Back to {course.title}
        </Link>
      </p>

      <div className="border-hairline bg-paper mb-5 border p-4">
        <CohortRowActions
          id={cohort.id}
          label={cohort.label}
          status={cohort.status}
          enrolmentClosed={cohort.enrolment_closed_manually}
        />
      </div>

      <CohortForm fields={cohortFields(courses)} initial={initial} />
    </>
  );
}
