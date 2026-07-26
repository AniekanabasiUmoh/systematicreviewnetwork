import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { listCourses } from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { LEVEL_LABELS, DELIVERY_LABELS } from "@/lib/academy/cohorts";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await requireStaff();
  const courses = await listCourses();

  if (courses.length === 0) {
    return (
      <>
        <AdminPageHeader
          title="Courses"
          description="Academy courses and the cohorts that run them."
          action={{ href: "/admin/courses/new", label: "Add course" }}
        />
        <EmptyState
          title="No courses yet"
          body="A course holds the teaching — the outcomes, the syllabus, the level. Once it exists you can open a cohort for each term you run it, without retyping any of it."
          href="/admin/courses/new"
          action="Add the first course"
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Courses"
        description="A course holds the teaching. A cohort is one run of it, with its own dates, price and capacity."
        action={{ href: "/admin/courses/new", label: "Add course" }}
      />

      <div className="border-hairline bg-paper border">
        <table className="hidden w-full sm:table">
          <thead>
            <tr className="border-hairline border-b">
              {["Course", "Programme", "Level", "Cohorts", "Status"].map((head) => (
                <th
                  key={head}
                  className="text-slate px-4 py-3 text-left text-[0.75rem] font-semibold tracking-[0.08em] uppercase"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-hairline border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="text-ink text-small font-semibold underline underline-offset-2"
                  >
                    {course.title}
                  </Link>
                  {course.archived_at ? (
                    <span className="text-slate text-small"> · Archived</span>
                  ) : null}
                </td>
                <td className="text-slate px-4 py-3 text-small">
                  {course.programme_title ?? "—"}
                </td>
                <td className="text-slate px-4 py-3 text-small">
                  {LEVEL_LABELS[course.level] ?? course.level} ·{" "}
                  {DELIVERY_LABELS[course.delivery] ?? course.delivery}
                </td>
                <td className="text-slate px-4 py-3 text-small">
                  {course.cohort_count}
                </td>
                <td className="text-slate px-4 py-3 text-small capitalize">
                  {course.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 5.9b — stacked cards below `sm`; duplicated markup is the honest fix. */}
        <div className="sm:hidden">
          {courses.map((course) => (
            <div key={course.id} className="border-hairline border-b p-4 last:border-b-0">
              <Link
                href={`/admin/courses/${course.id}`}
                className="text-ink text-small font-semibold underline underline-offset-2"
              >
                {course.title}
              </Link>
              <p className="text-slate text-small mt-1">
                {course.programme_title ?? "No programme"} ·{" "}
                {LEVEL_LABELS[course.level] ?? course.level}
              </p>
              <p className="text-slate text-small mt-1 capitalize">
                {course.status} · {course.cohort_count} cohort
                {course.cohort_count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
