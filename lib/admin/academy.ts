import "server-only";

import type { AdminField } from "@/lib/admin/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { CoursesRow, CohortsRow } from "@/lib/database.types";

/* Sprint 6.2 — admin descriptors and reads for the Academy catalogue.
 *
 * Why this is not an entry in lib/admin/resources.ts:
 *
 * That registry describes FLAT resources — one list, one form, one slug that is
 * unique across the table. Courses and cohorts are nested (Programme -> Course
 * -> Cohort, per §6.2's "not three flat lists"), a cohort's slug is unique only
 * within its course, and both forms need option lists loaded from other tables.
 * Encoding any of that in `AdminResource` would put a `parent` and an
 * `optionsFrom` concept into every resource that has neither.
 *
 * What IS shared is the field renderer (components/admin/FormFields.tsx) and
 * the AdminField type, so these screens look and behave like the rest of the
 * admin without the registry growing a shape it doesn't want. */

export const LEVEL_OPTIONS = [
  { value: "introductory", label: "Introductory" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const DELIVERY_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "In person" },
  { value: "blended", label: "Blended" },
] as const;

export const PACING_OPTIONS = [
  {
    value: "cohort_paced",
    label: "Cohort-paced — everyone moves together on set dates",
  },
  {
    value: "self_paced",
    label: "Self-paced — learners start any time and set their own pace",
  },
] as const;

export function courseFields(
  programmes: ReadonlyArray<{ id: string; title: string }>,
): ReadonlyArray<AdminField> {
  return [
    {
      name: "title",
      label: "Title",
      kind: "text",
      required: true,
      maxLength: 180,
      slugFrom: "title",
      wide: true,
    },
    {
      name: "slug",
      label: "URL slug",
      kind: "slug",
      required: true,
      hint: "Changing this changes the public URL and breaks existing links.",
    },
    {
      name: "programme_id",
      label: "Programme",
      kind: "select",
      hint: "Which SRN programme this course sits under. Optional.",
      options: programmes.map((row) => ({ value: row.id, label: row.title })),
    },
    {
      name: "summary",
      label: "Summary",
      kind: "textarea",
      maxLength: 600,
      hint: "Two or three sentences, shown on the catalogue card.",
      wide: true,
    },
    {
      name: "level",
      label: "Level",
      kind: "select",
      required: true,
      defaultValue: "introductory",
      options: LEVEL_OPTIONS,
    },
    {
      name: "delivery",
      label: "Delivery",
      kind: "select",
      required: true,
      defaultValue: "online",
      options: DELIVERY_OPTIONS,
    },
    {
      name: "duration_label",
      label: "Duration",
      kind: "text",
      maxLength: 120,
      hint: "As you'd say it out loud — “Six weeks, three hours a week”.",
    },
    {
      name: "learning_outcomes",
      label: "What learners will be able to do",
      kind: "textarea",
      hint: "One per line. Each becomes a bullet on the course page.",
      wide: true,
    },
    {
      name: "prerequisites",
      label: "Prerequisites",
      kind: "textarea",
      hint: "One per line. Leave blank if there are none.",
      wide: true,
    },
    { name: "featured_image_url", label: "Featured image", kind: "image", wide: true },
    { name: "body_rich", label: "Full description", kind: "richtext", wide: true },
  ];
}

export function cohortFields(
  courses: ReadonlyArray<{ id: string; title: string }>,
): ReadonlyArray<AdminField> {
  return [
    {
      name: "label",
      label: "Cohort name",
      kind: "text",
      required: true,
      maxLength: 180,
      slugFrom: "label",
      hint: "How staff and learners refer to this run — “Spring 2026”.",
      wide: true,
    },
    {
      name: "slug",
      label: "URL slug",
      kind: "slug",
      required: true,
      slugFrom: "label",
      hint: "Unique within this course only.",
    },
    {
      name: "course_id",
      label: "Course",
      kind: "select",
      required: true,
      options: courses.map((row) => ({ value: row.id, label: row.title })),
    },
    {
      name: "pacing",
      label: "Pacing",
      kind: "select",
      required: true,
      defaultValue: "cohort_paced",
      hint: "Self-paced cohorts ignore start and end dates, release everything at enrolment, and set no deadlines.",
      options: PACING_OPTIONS,
      wide: true,
    },
    { name: "starts_on", label: "Starts on", kind: "date" },
    { name: "ends_on", label: "Ends on", kind: "date" },
    { name: "enrolment_opens", label: "Enrolment opens", kind: "datetime" },
    { name: "enrolment_closes", label: "Enrolment closes", kind: "datetime" },
    {
      name: "capacity",
      label: "Capacity",
      kind: "number",
      min: 1,
      step: 1,
      hint: "Leave blank for no limit.",
    },
    {
      name: "price_naira",
      label: "Price",
      kind: "number",
      min: 0,
      step: 1,
      hint: "In whole naira. Enter 0 for a free cohort — learners still need an account.",
    },
    {
      name: "currency",
      label: "Currency",
      kind: "select",
      required: true,
      defaultValue: "NGN",
      options: [
        { value: "NGN", label: "Naira (NGN)" },
        { value: "USD", label: "US dollars (USD)" },
      ],
    },
  ];
}

/* --------------------------------------------------------------------------
 * Reads. Service role: staff screens must see drafts, which RLS hides from the
 * anon key by design.
 * ------------------------------------------------------------------------ */

export type CourseWithCounts = CoursesRow & {
  cohort_count: number;
  programme_title: string | null;
};

export async function listCourses(): Promise<CourseWithCounts[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*, programmes (title), cohorts (id)")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[academy admin] course list failed:", error.message);
    return [];
  }

  return (data as unknown as Array<
    CoursesRow & { programmes: { title: string } | null; cohorts: { id: string }[] }
  >).map(({ programmes, cohorts, ...row }) => ({
    ...row,
    programme_title: programmes?.title ?? null,
    cohort_count: cohorts?.length ?? 0,
  }));
}

export async function getCourseRow(id: string): Promise<CoursesRow | null> {
  const { data } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CoursesRow) ?? null;
}

export async function listCohorts(courseId: string): Promise<CohortsRow[]> {
  const { data } = await supabaseAdmin
    .from("cohorts")
    .select("*")
    .eq("course_id", courseId)
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as CohortsRow[];
}

export async function getCohortRow(id: string): Promise<CohortsRow | null> {
  const { data } = await supabaseAdmin
    .from("cohorts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CohortsRow) ?? null;
}

export async function listProgrammeOptions(): Promise<
  Array<{ id: string; title: string }>
> {
  const { data } = await supabaseAdmin
    .from("programmes")
    .select("id, title")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Array<{ id: string; title: string }>;
}

export async function listCourseOptions(): Promise<
  Array<{ id: string; title: string }>
> {
  const { data } = await supabaseAdmin
    .from("courses")
    .select("id, title")
    .is("archived_at", null)
    .order("title", { ascending: true });
  return (data ?? []) as Array<{ id: string; title: string }>;
}

/** Slug uniqueness. Courses are globally unique; cohorts only within a course. */
export async function courseSlugTaken(slug: string, excludeId?: string) {
  let query = supabaseAdmin.from("courses").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

export async function cohortSlugTaken(
  courseId: string,
  slug: string,
  excludeId?: string,
) {
  let query = supabaseAdmin
    .from("cohorts")
    .select("id")
    .eq("course_id", courseId)
    .eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

/**
 * A label for a duplicated cohort that does not collide.
 *
 * "Duplicate a cohort" is the point of §6.2 — SRN runs the same course every
 * term and must not retype a syllabus. A duplicate is worthless if it fails on
 * a unique-index violation, so this walks forward until it finds a free slug
 * rather than trusting a single guess.
 */
export async function nextCohortSlug(
  courseId: string,
  base: string,
): Promise<string> {
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await cohortSlugTaken(courseId, candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}
