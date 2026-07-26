import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  getCourseRow,
  listCurriculum,
  moduleFields,
} from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  CurriculumOutline,
  ModuleForm,
} from "@/components/admin/CurriculumBuilder";

/* Sprint 6.3 — the curriculum builder for a course.
 *
 * Modules edited here are COURSE-scoped: the shared syllabus every cohort
 * inherits, which is the whole point of §6.2's "SRN runs the same course every
 * term and must not retype a syllabus". A cohort that needs something extra
 * adds its own modules on the cohort screen. */

export const dynamic = "force-dynamic";

export default async function CourseCurriculumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const course = await getCourseRow(id);
  if (!course) notFound();

  const modules = await listCurriculum({ courseId: course.id });

  return (
    <>
      <AdminPageHeader
        title={`${course.title} — curriculum`}
        description="Modules and lessons every cohort of this course inherits. Learners only ever see published modules, and only once they are enrolled."
      />

      <p className="mb-5">
        <Link
          href={`/admin/courses/${course.id}`}
          className="text-slate text-small underline underline-offset-2"
        >
          Back to {course.title}
        </Link>
      </p>

      <CurriculumOutline
        modules={modules}
        basePath={`/admin/courses/${course.id}/curriculum`}
      />

      <section className="mt-10">
        <h2 className="text-display text-ink text-h3">Add a module</h2>
        <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
          A module groups lessons into a week, a topic, or a stage. New modules
          start as drafts, so nothing appears to learners until you publish it.
        </p>
        <ModuleForm fields={moduleFields()} courseId={course.id} />
      </section>
    </>
  );
}
