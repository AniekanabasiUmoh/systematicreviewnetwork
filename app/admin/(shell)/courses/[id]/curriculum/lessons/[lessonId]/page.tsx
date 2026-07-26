import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import {
  getCourseRow,
  getLessonRow,
  getModuleRow,
  lessonFields,
} from "@/lib/admin/academy";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  LessonForm,
  LessonControls,
} from "@/components/admin/CurriculumBuilder";
import type { LessonMaterialsRow } from "@/lib/database.types";

/* Sprint 6.3 — one lesson: its content, its video, and its private files. */

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireStaff();
  const { id, lessonId } = await params;

  const [course, lesson] = await Promise.all([
    getCourseRow(id),
    getLessonRow(lessonId),
  ]);
  if (!course || !lesson) notFound();

  /* Walk up to the module to confirm this lesson really belongs to the course
     in the URL. Without this, any lesson id would be editable from any course. */
  const mod = await getModuleRow(lesson.module_id);
  if (!mod || mod.course_id !== course.id) notFound();

  const { data } = await supabaseAdmin
    .from("lesson_materials")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("sort_order", { ascending: true });
  const materials = (data ?? []) as LessonMaterialsRow[];

  return (
    <>
      <AdminPageHeader
        title={lesson.title}
        description={`In ${mod.title}. Files attached here are private — learners reach them through a link that expires, and only if they are enrolled.`}
      />

      <p className="mb-5">
        <Link
          href={`/admin/courses/${course.id}/curriculum`}
          className="text-slate text-small underline underline-offset-2"
        >
          Back to the curriculum
        </Link>
      </p>

      <LessonForm
        fields={lessonFields()}
        initial={lesson as unknown as Record<string, unknown>}
        moduleId={mod.id}
      />

      <section className="mt-10">
        <LessonControls
          lesson={{ id: lesson.id, title: lesson.title, status: lesson.status }}
          materials={materials.map((row) => ({
            id: row.id,
            title: row.title,
            file_name: row.file_name,
          }))}
        />
      </section>
    </>
  );
}
