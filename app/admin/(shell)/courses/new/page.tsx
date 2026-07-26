import { requireStaff } from "@/lib/admin/auth";
import { courseFields, listProgrammeOptions } from "@/lib/admin/academy";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseForm } from "@/components/admin/CourseForm";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  await requireStaff();
  const programmes = await listProgrammeOptions();
  return (
    <>
      <AdminPageHeader
        title="New course"
        description="Describe the teaching here. Dates, price and capacity belong to a cohort, which you add once the course is saved."
      />
      <CourseForm fields={courseFields(programmes)} />
    </>
  );
}
