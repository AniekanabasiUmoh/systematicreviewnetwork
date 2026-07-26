import { createClient } from "@supabase/supabase-js";
import type { Database, CoursesRow, CohortsRow } from "@/lib/database.types";

/* Sprint 6.2 — the public course catalogue.
 *
 * Deliberately on the ANON key, matching lib/queries.ts and §1: RLS then
 * guarantees a draft or archived course cannot come back, so a mistake in a
 * filter here is caught by the database rather than published to the world.
 * Contrast lib/academy/queries.ts, which reads a learner's own private rows and
 * therefore must use the service role with a mandatory learner-id filter.
 *
 * The one thing RLS cannot express cheaply is the parent relationship: a
 * published cohort under a draft course is readable at the row level. Every
 * function here therefore starts from the course and reaches cohorts through
 * it, so an unpublished course has no route by which its cohorts surface. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

const db = createClient<Database>(url, anonKey, {
  auth: { persistSession: false },
});

export type Course = CoursesRow;
export type Cohort = CohortsRow;

export type CourseWithCohorts = Course & {
  cohorts: Cohort[];
  programme: { slug: string; title: string } | null;
};

const COURSE_FIELDS =
  "id, slug, title, summary, body_rich, level, delivery, duration_label, learning_outcomes, prerequisites, featured_image_url, sort_order, status, programme_id, created_at, updated_at, archived_at";

/** Published courses for the catalogue, in editorial order. */
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await db
    .from("courses")
    .select(COURSE_FIELDS)
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[academy] course list failed:", error.message);
    return [];
  }
  return (data ?? []) as Course[];
}

/**
 * One course by slug, with its published cohorts.
 *
 * Returns null for a draft or archived course — RLS enforces that, so this is
 * a real 404 rather than a filter we could forget.
 */
export async function getCourse(
  slug: string,
): Promise<CourseWithCohorts | null> {
  const { data, error } = await db
    .from("courses")
    .select(`${COURSE_FIELDS}, programmes (slug, title)`)
    .eq("slug", slug)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const course = data as unknown as Course & {
    programmes: { slug: string; title: string } | null;
  };

  const { data: cohortRows } = await db
    .from("cohorts")
    .select("*")
    .eq("course_id", course.id)
    .eq("status", "published")
    .is("archived_at", null)
    // Soonest first, but a self-paced cohort has no start date; nulls last
    // keeps "starts in September" above "start any time" rather than below it.
    .order("starts_on", { ascending: true, nullsFirst: false });

  const { programmes, ...rest } = course;
  return {
    ...rest,
    programme: programmes ?? null,
    cohorts: (cohortRows ?? []) as Cohort[],
  };
}

/** Slugs for generateStaticParams / sitemap. */
export async function getCourseSlugs(): Promise<string[]> {
  const { data } = await db
    .from("courses")
    .select("slug")
    .eq("status", "published")
    .is("archived_at", null);
  return (data ?? []).map((row) => row.slug);
}

/** One published cohort within a published course, or null. */
export async function getCohort(
  courseSlug: string,
  cohortSlug: string,
): Promise<{ course: CourseWithCohorts; cohort: Cohort } | null> {
  const course = await getCourse(courseSlug);
  if (!course) return null;
  const cohort = course.cohorts.find((row) => row.slug === cohortSlug);
  return cohort ? { course, cohort } : null;
}

/**
 * Seats held per cohort.
 *
 * 6.4 builds `enrolments`; until then there is nothing to count and every
 * cohort reads as empty. Returning {} rather than throwing means the capacity
 * sentence degrades to "60 seats" instead of breaking the page, and the shape
 * is already right for 6.4 to fill in — one function to change, exactly like
 * `getSeatCounts` (§5.12).
 */
export async function getCohortSeatCounts(
  cohortIds: string[],
): Promise<Record<string, number>> {
  if (cohortIds.length === 0) return {};
  return {};
}
