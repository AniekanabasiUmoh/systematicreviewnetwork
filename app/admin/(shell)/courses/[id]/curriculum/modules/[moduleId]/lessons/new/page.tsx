import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { getCourseRow, getModuleRow, lessonFields } from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LessonForm } from "@/components/admin/CurriculumBuilder";

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
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
  if (!course || !mod || mod.course_id !== course.id) notFound();

  return (
    <>
      <AdminPageHeader
        title="Add a lesson"
        description={`A new lesson in ${mod.title}. It starts as a draft — attach files and video, then publish when it is ready.`}
      />

      <p className="mb-5">
        <Link
          href={`/admin/courses/${course.id}/curriculum`}
          className="text-slate text-small underline underline-offset-2"
        >
          Back to the curriculum
        </Link>
      </p>

      <LessonForm fields={lessonFields()} moduleId={mod.id} />
    </>
  );
}
