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
 * The Academy's counterpart to `getSeatCounts` (§5.12), and deliberately the
 * only place a cohort's seats are counted — so the three rules below are true
 * everywhere at once rather than in each caller that remembers them:
 *
 *   1. Only paid-up seats count. A `pending` enrolment is someone who opened
 *      Paystack and may never come back; holding a seat for them would let one
 *      abandoned checkout shrink a paid cohort (§13.2).
 *   2. A withdrawn enrolment frees its seat.
 *   3. A cancelled or refunded one does too — the money went back, so the seat
 *      must as well.
 *
 * Service role, because a learner must not be able to read other people's
 * enrolments to derive this; they only ever see the resulting number.
 */
export async function getCohortSeatCounts(
  cohortIds: string[],
): Promise<Record<string, number>> {
  if (cohortIds.length === 0) return {};

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return {};

  const admin = createClient<Database>(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await admin
    .from("enrolments")
    .select("cohort_id")
    .in("cohort_id", cohortIds)
    .in("state", ["active", "completed"])
    .in("payment_status", ["paid", "not_required"])
    .is("cancelled_at", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.cohort_id] = (counts[row.cohort_id] ?? 0) + 1;
  }
  return counts;
}
