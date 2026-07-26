import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  cohortFields,
  getCourseRow,
  getCohortRow,
  listCourseOptions,
  listRoster,
  listWaitlist,
} from "@/lib/admin/academy";
import {
  RosterTable,
  WaitlistTable,
  ManualEnrolForm,
} from "@/components/admin/Roster";
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

  const [courses, roster, waitlist] = await Promise.all([
    listCourseOptions(),
    listRoster(cohort.id),
    listWaitlist(cohort.id),
  ]);
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

      <section className="mt-10">
        <h2 className="text-display text-ink text-h3">Roster</h2>
        <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
          Everyone on this cohort, including people who withdrew or were
          refunded — they stay listed so the export still reconciles against
          Paystack.
        </p>
        <RosterTable
          rows={roster}
          exportHref={`/api/admin/roster/${cohort.id}`}
        />
        <div className="mt-5">
          <ManualEnrolForm cohortId={cohort.id} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-display text-ink text-h3">Waiting list</h2>
        <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
          In the order people joined. Marking someone as offered records that
          you have contacted them; they still enrol and pay in the normal way.
        </p>
        <WaitlistTable rows={waitlist} />
      </section>
    </>
  );
}
