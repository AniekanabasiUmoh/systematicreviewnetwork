import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ModulesRow, LessonsRow, LessonMaterialsRow } from "@/lib/database.types";

/* Sprint 6.3 — curriculum access and drip release.
 *
 * This module is the gate. Every route that shows a lesson, a module, or a
 * material goes through it, and nothing here trusts anything the caller passes
 * except an id it then re-checks.
 *
 * Two rules carry the sprint:
 *
 *   1. ACCESS IS AN ENROLMENT, NOT A DATE. Phase 6 decision 3: access outlives
 *      the cohort. The check is "does this learner have an active or completed
 *      enrolment on this cohort", never "is the cohort still running". A
 *      learner who finished last term keeps their materials.
 *
 *   2. DRIP APPLIES ONLY TO A COHORT-PACED COHORT. Phase 6 decision 1. In a
 *      self-paced cohort `release_rule` is ignored entirely and every module is
 *      open from enrolment — a self-paced learner must never hit a locked
 *      module. That is checked first, before any date arithmetic, for the same
 *      reason cohortState() checks pacing first.
 *
 * All reads use the SERVICE ROLE. The RLS on these tables has no anon policy at
 * all, so the anon key returns nothing whatever the query says; the real
 * authorization decision is made here, in code, and is what the tests assert.
 */

export type Module = ModulesRow;
export type Lesson = LessonsRow;
export type Material = LessonMaterialsRow;

/** Only these states grant access. `pending` holds no seat and unlocks nothing. */
const ACCESS_STATES = ["active", "completed"] as const;

export type ModuleWithLessons = Module & {
  lessons: Lesson[];
  /** False when drip has not yet released it. Locked modules still LIST, so a
      learner can see the shape of the course; their lessons are withheld. */
  released: boolean;
  /** Plain sentence for a locked module, or null. Never an apology. */
  lockedReason: string | null;
};

/**
 * Does this learner have access to this cohort's curriculum?
 *
 * Deliberately returns the enrolment row rather than a boolean: callers that
 * need to know *why* access was granted (completed vs active) already have it,
 * and a boolean tempts a second query.
 */
export async function getEnrolment(
  learnerId: string,
  cohortId: string,
): Promise<{ id: string; state: string } | null> {
  const { data } = await supabaseAdmin
    .from("enrolments")
    .select("id, state")
    .eq("learner_id", learnerId)
    .eq("cohort_id", cohortId)
    .in("state", ACCESS_STATES)
    .maybeSingle();
  return data ?? null;
}

/**
 * Whether a module is released to a learner right now.
 *
 * `now` and `previousComplete` are parameters rather than lookups so this stays
 * a pure function and can be unit-tested across the calendar without touching
 * the database.
 */
export function moduleReleased(
  mod: Pick<Module, "release_rule" | "release_on">,
  pacing: string,
  previousComplete: boolean,
  now: Date = new Date(),
): { released: boolean; reason: string | null } {
  /* Decision 1, checked first. A self-paced cohort has no shared timetable, so
     a release date belonging to some other run of the course must not lock a
     learner out of material they have paid for. */
  if (pacing === "self_paced") return { released: true, reason: null };

  if (mod.release_rule === "on_date") {
    if (!mod.release_on) return { released: true, reason: null };
    const opens = new Date(mod.release_on);
    if (opens.getTime() > now.getTime()) {
      return {
        released: false,
        reason: `This module opens on ${formatReleaseDate(opens)}.`,
      };
    }
    return { released: true, reason: null };
  }

  if (mod.release_rule === "after_previous" && !previousComplete) {
    return {
      released: false,
      reason: "Finish the previous module to open this one.",
    };
  }

  return { released: true, reason: null };
}

/** Africa/Lagos, matching the rest of the site (§2.6). */
function formatReleaseDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The full curriculum for a cohort, as a specific learner sees it.
 *
 * Returns null when the learner has no qualifying enrolment — the caller turns
 * that into a 404, so an unenrolled visitor cannot even learn that the cohort
 * has lessons.
 *
 * Course-scoped and cohort-scoped modules are merged: the shared syllabus plus
 * anything added for this particular run, ordered together by sort_order.
 */
export async function getCurriculumForLearner(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<ModuleWithLessons[] | null> {
  const enrolment = await getEnrolment(learnerId, cohort.id);
  if (!enrolment) return null;

  return getCurriculum(cohort, completedLessonIds, now);
}

/**
 * The curriculum without the enrolment check — for staff preview and for the
 * learner path above, which has already checked.
 *
 * Kept separate and NOT exported to any public route. If you are calling this
 * from a learner-facing page, you want getCurriculumForLearner().
 */
export async function getCurriculum(
  cohort: { id: string; course_id: string; pacing: string },
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<ModuleWithLessons[]> {
  const { data: moduleRows } = await supabaseAdmin
    .from("modules")
    .select("*")
    .or(`course_id.eq.${cohort.course_id},cohort_id.eq.${cohort.id}`)
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  const modules = (moduleRows ?? []) as Module[];
  if (modules.length === 0) return [];

  const { data: lessonRows } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .in(
      "module_id",
      modules.map((m) => m.id),
    )
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  const lessonsByModule = new Map<string, Lesson[]>();
  for (const lesson of (lessonRows ?? []) as Lesson[]) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }

  const result: ModuleWithLessons[] = [];
  let previousComplete = true; // the first module has no predecessor to wait on

  for (const mod of modules) {
    const lessons = lessonsByModule.get(mod.id) ?? [];
    const { released, reason } = moduleReleased(
      mod,
      cohort.pacing,
      previousComplete,
      now,
    );

    result.push({
      ...mod,
      /* A locked module lists its shape but withholds its contents. Returning
         the lessons and hiding them in the template would ship their titles and
         bodies to the browser. */
      lessons: released ? lessons : [],
      released,
      lockedReason: reason,
    });

    /* "after_previous" means the previous module's lessons are all complete.
       A module with no lessons cannot block the chain. */
    previousComplete =
      released &&
      lessons.every((lesson) => completedLessonIds.has(lesson.id));
  }

  return result;
}

/**
 * One lesson, only if the learner may see it.
 *
 * Re-runs the whole gate — enrolment AND drip — rather than trusting that the
 * caller arrived from a page that checked. A lesson URL is guessable and gets
 * shared; this is the function that makes that harmless.
 */
export async function getLessonForLearner(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  lessonId: string,
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<{ lesson: Lesson; materials: Material[] } | null> {
  const modules = await getCurriculumForLearner(
    learnerId,
    cohort,
    completedLessonIds,
    now,
  );
  if (!modules) return null;

  /* Searching the RELEASED curriculum rather than querying the lesson directly
     is what makes drip apply here too: a locked module contributed no lessons
     above, so its lesson ids simply are not in this list. */
  const lesson = modules
    .flatMap((mod) => mod.lessons)
    .find((row) => row.id === lessonId);
  if (!lesson) return null;

  const { data: materialRows } = await supabaseAdmin
    .from("lesson_materials")
    .select("*")
    .eq("lesson_id", lesson.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  return { lesson, materials: (materialRows ?? []) as Material[] };
}

/**
 * Every cohort this learner may open, newest first.
 *
 * Sprint 6.4. Uses the same ACCESS_STATES as the gate, so "what is on my
 * account page" and "what may I actually open" can never drift apart.
 */
export async function listMyCourses(learnerId: string): Promise<
  Array<{
    cohortSlug: string;
    cohortLabel: string;
    courseSlug: string;
    courseTitle: string;
    state: string;
    enrolledAt: string;
  }>
> {
  const { data } = await supabaseAdmin
    .from("enrolments")
    .select(
      "state, enrolled_at, cohorts (slug, label, courses (slug, title))",
    )
    .eq("learner_id", learnerId)
    .in("state", ACCESS_STATES)
    .order("enrolled_at", { ascending: false });

  return ((data ?? []) as unknown as Array<{
    state: string;
    enrolled_at: string;
    cohorts: {
      slug: string;
      label: string;
      courses: { slug: string; title: string } | null;
    } | null;
  }>)
    .filter((row) => row.cohorts?.courses)
    .map((row) => ({
      cohortSlug: row.cohorts!.slug,
      cohortLabel: row.cohorts!.label,
      courseSlug: row.cohorts!.courses!.slug,
      courseTitle: row.cohorts!.courses!.title,
      state: row.state,
      enrolledAt: row.enrolled_at,
    }));
}

/**
 * Why a lesson is not available, when the answer is "it is locked, not absent".
 *
 * Returns null for everyone who should simply get a 404: no enrolment, wrong
 * cohort, unknown lesson. The enrolment is checked FIRST and separately, so a
 * stranger can never turn this into an oracle for which lesson ids are real.
 */
export async function lockedLessonReason(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  lessonId: string,
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<string | null> {
  const enrolment = await getEnrolment(learnerId, cohort.id);
  if (!enrolment) return null;

  /* Self-paced cohorts never lock anything (decision 1), so a missing lesson
     there is genuinely missing and must stay a 404. */
  if (cohort.pacing === "self_paced") return null;

  const modules = await getCurriculum(cohort, completedLessonIds, now);
  for (const mod of modules) {
    if (mod.released || !mod.lockedReason) continue;
    if (await moduleHoldsLesson(mod.id, lessonId)) return mod.lockedReason;
  }
  return null;
}

/** How long a signed material link stays valid. Long enough to click and
    download, short enough that a leaked link is not a permanent one. */
export const MATERIAL_URL_TTL_SECONDS = 300;

/**
 * The outcome of asking for a material.
 *
 * Three cases, deliberately distinguished, because they deserve different HTTP
 * answers:
 *
 *   ok       — a short-lived signed URL.
 *   locked   — the learner IS enrolled, but drip has not released this module
 *              yet. Safe to explain: someone enrolled on the cohort already
 *              knows the course and its modules exist, so naming the lock
 *              tells them nothing they could not see on the overview page.
 *   notfound — anything else: no enrolment, wrong cohort, unknown id, archived.
 *              All collapse into one answer on purpose. Distinguishing them
 *              would let someone walk material ids and map a paid course's
 *              contents by the difference between "denied" and "no such thing".
 */
export type MaterialResult =
  | { status: "ok"; url: string }
  | { status: "locked"; reason: string }
  | { status: "notfound" };

/**
 * A signed URL for one material.
 *
 * Every argument is re-checked: the material must belong to the lesson, the
 * lesson must be released to this learner, and the learner must be enrolled.
 * Only then is a short-lived URL minted. There is no public URL for these
 * objects to fall back to — the bucket is private — so a bug here fails closed.
 */
export async function getMaterial(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  materialId: string,
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<MaterialResult> {
  const { data: material } = await supabaseAdmin
    .from("lesson_materials")
    .select("id, lesson_id, storage_path, archived_at")
    .eq("id", materialId)
    .maybeSingle();
  if (!material || material.archived_at) return { status: "notfound" };

  /* The enrolment check comes FIRST and on its own. Without a qualifying
     enrolment there is no "locked" answer to give — a stranger must not learn
     that this id is a real material, only that they got nothing. */
  const enrolment = await getEnrolment(learnerId, cohort.id);
  if (!enrolment) return { status: "notfound" };

  const modules = await getCurriculum(cohort, completedLessonIds, now);
  const owning = modules.find((mod) =>
    mod.lessons.some((lesson) => lesson.id === material.lesson_id),
  );

  if (!owning) {
    /* Either drip has locked the module holding this lesson, or the lesson is
       not in this cohort's curriculum at all. Only the first deserves an
       explanation; lockedLessonReason() returns null for the second. */
    const reason = await lockedLessonReason(
      learnerId,
      cohort,
      material.lesson_id,
      completedLessonIds,
      now,
    );
    return reason ? { status: "locked", reason } : { status: "notfound" };
  }

  const { data, error } = await supabaseAdmin.storage
    .from("course-materials")
    .createSignedUrl(material.storage_path, MATERIAL_URL_TTL_SECONDS);
  if (error || !data) return { status: "notfound" };
  return { status: "ok", url: data.signedUrl };
}

/** Does this module contain this lesson? Used only to justify a "locked". */
async function moduleHoldsLesson(
  moduleId: string,
  lessonId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Backwards-compatible wrapper: a URL or null.
 *
 * Kept because callers that only need "may I have this, yes or no" should not
 * have to destructure a result type.
 */
export async function getMaterialUrl(
  learnerId: string,
  cohort: { id: string; course_id: string; pacing: string },
  materialId: string,
  completedLessonIds: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
): Promise<string | null> {
  const result = await getMaterial(
    learnerId,
    cohort,
    materialId,
    completedLessonIds,
    now,
  );
  return result.status === "ok" ? result.url : null;
}
