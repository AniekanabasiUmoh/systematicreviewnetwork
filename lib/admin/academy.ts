import "server-only";

import type { AdminField } from "@/lib/admin/resources";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  CoursesRow,
  CohortsRow,
  ModulesRow,
  LessonsRow,
  LessonMaterialsRow,
} from "@/lib/database.types";

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

/* Sprint 6.3 — curriculum descriptors. */

export const RELEASE_OPTIONS = [
  { value: "immediate", label: "Open from enrolment" },
  { value: "on_date", label: "Opens on a date" },
  { value: "after_previous", label: "Opens when the previous module is complete" },
] as const;

export function moduleFields(): ReadonlyArray<AdminField> {
  return [
    {
      name: "title",
      label: "Module title",
      kind: "text",
      required: true,
      maxLength: 180,
      wide: true,
    },
    {
      name: "summary",
      label: "Summary",
      kind: "textarea",
      maxLength: 600,
      hint: "One or two sentences describing what this module covers.",
      wide: true,
    },
    {
      name: "release_rule",
      label: "When it opens",
      kind: "select",
      required: true,
      defaultValue: "immediate",
      options: RELEASE_OPTIONS,
      hint: "Self-paced cohorts ignore this — every module is open from enrolment.",
      wide: true,
    },
    {
      name: "release_on",
      label: "Opens on",
      kind: "datetime",
      hint: "Only used when the rule above is “Opens on a date”.",
    },
  ];
}

export function lessonFields(): ReadonlyArray<AdminField> {
  return [
    {
      name: "title",
      label: "Lesson title",
      kind: "text",
      required: true,
      maxLength: 180,
      wide: true,
    },
    {
      name: "summary",
      label: "Summary",
      kind: "textarea",
      maxLength: 600,
      wide: true,
    },
    {
      name: "estimated_minutes",
      label: "Estimated time",
      kind: "number",
      min: 1,
      step: 1,
      hint: "In minutes. Shown to learners so they can plan. Optional.",
    },
    { name: "body_rich", label: "Lesson content", kind: "richtext", wide: true },
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

/* --------------------------------------------------------------------------
 * Sprint 6.3 — curriculum reads.
 * ------------------------------------------------------------------------ */

export type LessonWithMaterials = LessonsRow & {
  materials: LessonMaterialsRow[];
};

export type ModuleWithLessonRows = ModulesRow & {
  lessons: LessonWithMaterials[];
};

/**
 * The curriculum tree for the admin builder — every module, published or not,
 * with its lessons and their materials.
 *
 * Pass a course id to edit the shared syllabus, or a cohort id to edit what
 * that single run adds. Both are accepted because a module belongs to exactly
 * one of the two.
 */
export async function listCurriculum(parent: {
  courseId?: string;
  cohortId?: string;
}): Promise<ModuleWithLessonRows[]> {
  const column = parent.courseId ? "course_id" : "cohort_id";
  const value = parent.courseId ?? parent.cohortId;
  if (!value) return [];

  const { data: moduleRows, error } = await supabaseAdmin
    .from("modules")
    .select("*")
    .eq(column, value)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[academy admin] module list failed:", error.message);
    return [];
  }
  const modules = (moduleRows ?? []) as ModulesRow[];
  if (modules.length === 0) return [];

  const { data: lessonRows } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .in("module_id", modules.map((m) => m.id))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const lessons = (lessonRows ?? []) as LessonsRow[];

  const { data: materialRows } = lessons.length
    ? await supabaseAdmin
        .from("lesson_materials")
        .select("*")
        .in("lesson_id", lessons.map((l) => l.id))
        .order("sort_order", { ascending: true })
    : { data: [] };

  const materialsByLesson = new Map<string, LessonMaterialsRow[]>();
  for (const material of (materialRows ?? []) as LessonMaterialsRow[]) {
    const list = materialsByLesson.get(material.lesson_id) ?? [];
    list.push(material);
    materialsByLesson.set(material.lesson_id, list);
  }

  const lessonsByModule = new Map<string, LessonWithMaterials[]>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push({ ...lesson, materials: materialsByLesson.get(lesson.id) ?? [] });
    lessonsByModule.set(lesson.module_id, list);
  }

  return modules.map((module) => ({
    ...module,
    lessons: lessonsByModule.get(module.id) ?? [],
  }));
}

export async function getModuleRow(id: string): Promise<ModulesRow | null> {
  const { data } = await supabaseAdmin
    .from("modules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as ModulesRow) ?? null;
}

export async function getLessonRow(id: string): Promise<LessonsRow | null> {
  const { data } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as LessonsRow) ?? null;
}

/**
 * How many enrolments exist on the cohorts this module reaches.
 *
 * Drives the counted refusal on delete (§5.7/§5.12 pattern). A course-scoped
 * module reaches every cohort of the course; a cohort-scoped one reaches only
 * its own.
 */
export async function moduleEnrolmentCount(
  module: Pick<ModulesRow, "course_id" | "cohort_id">,
): Promise<number> {
  let cohortIds: string[] = [];
  if (module.cohort_id) {
    cohortIds = [module.cohort_id];
  } else if (module.course_id) {
    const { data } = await supabaseAdmin
      .from("cohorts")
      .select("id")
      .eq("course_id", module.course_id);
    cohortIds = (data ?? []).map((row) => row.id);
  }
  if (cohortIds.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from("enrolments")
    .select("id", { count: "exact", head: true })
    .in("cohort_id", cohortIds);
  return count ?? 0;
}

/** Next sort_order for a new child, so new items land at the end. */
export async function nextSortOrder(
  table: "modules" | "lessons" | "lesson_materials",
  column: string,
  value: string,
): Promise<number> {
  const { data } = await supabaseAdmin
    .from(table)
    .select("sort_order")
    .eq(column, value)
    .order("sort_order", { ascending: false })
    .limit(1);
  const highest = (data ?? [])[0] as { sort_order: number } | undefined;
  return (highest?.sort_order ?? -1) + 1;
}

/* --------------------------------------------------------------------------
 * Sprint 6.4 — the cohort roster.
 * ------------------------------------------------------------------------ */

export type RosterRow = {
  id: string;
  learner_id: string;
  full_name: string;
  email: string;
  state: string;
  payment_status: string;
  amount_kobo: number;
  currency: string;
  enrolled_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  paystack_reference: string | null;
};

/**
 * Everyone on a cohort, whatever their state.
 *
 * Names and emails come from the DENORMALISED columns first, falling back to
 * the learner row. That ordering matters: the snapshot records who enrolled,
 * and a later profile edit must not silently relabel a historic roster
 * (the applications.programme rule from §5.7).
 */
export async function listRoster(cohortId: string): Promise<RosterRow[]> {
  const { data, error } = await supabaseAdmin
    .from("enrolments")
    .select(
      "id, learner_id, state, payment_status, amount_kobo, currency, enrolled_at, paid_at, cancelled_at, paystack_reference, learner_name_at_enrolment, learner_email_at_enrolment, learners (full_name, email)",
    )
    .eq("cohort_id", cohortId)
    .order("enrolled_at", { ascending: true });

  if (error) {
    console.error("[academy admin] roster failed:", error.message);
    return [];
  }

  return (data as unknown as Array<
    Omit<RosterRow, "full_name" | "email"> & {
      learner_name_at_enrolment: string | null;
      learner_email_at_enrolment: string | null;
      learners: { full_name: string | null; email: string } | null;
    }
  >).map((row) => ({
    id: row.id,
    learner_id: row.learner_id,
    full_name:
      row.learner_name_at_enrolment ?? row.learners?.full_name ?? "Not given",
    email: row.learner_email_at_enrolment ?? row.learners?.email ?? "",
    state: row.state,
    payment_status: row.payment_status,
    amount_kobo: row.amount_kobo,
    currency: row.currency,
    enrolled_at: row.enrolled_at,
    paid_at: row.paid_at,
    cancelled_at: row.cancelled_at,
    paystack_reference: row.paystack_reference,
  }));
}

export type WaitlistRow = {
  id: string;
  learner_id: string;
  full_name: string;
  email: string;
  created_at: string;
  offered_at: string | null;
};

/** The queue for a cohort, oldest first — position is derived, never stored. */
export async function listWaitlist(cohortId: string): Promise<WaitlistRow[]> {
  const { data } = await supabaseAdmin
    .from("cohort_waitlist")
    .select("id, learner_id, created_at, offered_at, learners (full_name, email)")
    .eq("cohort_id", cohortId)
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  return (data as unknown as Array<{
    id: string;
    learner_id: string;
    created_at: string;
    offered_at: string | null;
    learners: { full_name: string | null; email: string } | null;
  }> ?? []).map((row) => ({
    id: row.id,
    learner_id: row.learner_id,
    full_name: row.learners?.full_name ?? "Not given",
    email: row.learners?.email ?? "",
    created_at: row.created_at,
    offered_at: row.offered_at,
  }));
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
