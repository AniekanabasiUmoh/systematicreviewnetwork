import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  getCourseRow,
  getModuleRow,
  moduleFields,
} from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ModuleForm } from "@/components/admin/CurriculumBuilder";

export const dynamic = "force-dynamic";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  await requireStaff();
  const { id, moduleId } = await params;
  const [course, mod] = await Promise.all([
    getCourseRow(id),
    getModuleRow(moduleId),
  ]);
  if (!course || !mod) notFound();

  /* A module id from another course must not be editable through this URL.
     Same guard as the cohort screen: the parent in the path is the authority. */
  if (mod.course_id !== course.id) notFound();

  return (
    <>
      <AdminPageHeader
        title={mod.title}
        description="Editing a module in the shared syllabus. Changes reach every cohort of this course."
      />

      <p className="mb-5">
        <Link
          href={`/admin/courses/${course.id}/curriculum`}
          className="text-slate text-small underline underline-offset-2"
        >
          Back to the curriculum
        </Link>
      </p>

      <ModuleForm
        fields={moduleFields()}
        initial={module as unknown as Record<string, unknown>}
        courseId={course.id}
      />
    </>
  );
}
