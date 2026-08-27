/**
 * Replaces the curriculum content of the live "systematic-review-methodology"
 * course with the real Beginner Academy content from
 * new/SRNAcademy2026Draft.docx.md (via supabase/srn-academy-content.mjs).
 *
 *   node --env-file=.env supabase/seed-srn-academy.mjs
 *
 * UNLIKE supabase/seed-demo-course.mjs, this script does NOT delete the
 * course, its cohorts, or anything enrolment-related. The live course
 * already has a published cohort ("September 2026") with real learners
 * enrolled — deleting and reinserting the course the way the demo seed
 * script does would cascade-delete their lesson_progress, submissions and
 * any certificate. Those rows are left completely alone.
 *
 * What this script replaces:
 *   - the course row's summary/level/delivery/duration/learning_outcomes/
 *     prerequisites/body_rich (identifying fields — slug, id — untouched)
 *   - every module, lesson, and module-level assessment (quiz/assignment)
 *     under this course: deleted and reinserted fresh, in the new content's
 *     order
 *
 * What this script does NOT touch:
 *   - cohorts (including the published "September 2026" cohort)
 *   - enrolments, lesson_progress, submissions, certificates
 *
 * Consequence: the 2 existing enrolled learners keep their enrolment and
 * cohort, but the modules/lessons they see will be entirely new content —
 * any progress against the old module/lesson IDs is orphaned (those rows no
 * longer exist), since lesson_progress is keyed on lesson_id. This was a
 * deliberate, explicit decision (not a default) — see the conversation this
 * script was written from. Tell the 2 learners the course content changed.
 *
 * The course stays "published" — it already was, and this script does not
 * change status either way. If SRN wants it back to draft while the new
 * content is reviewed, do that separately through the admin.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  COURSE,
  MODULE_1,
  MODULE_2,
  MODULE_3,
  MODULE_4,
  MODULE_5,
  MODULE_6,
  MODULE_7,
} from "./srn-academy-content.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fail(step, error) {
  console.error(`\n✗ ${step}: ${error.message}`);
  process.exit(1);
}

const MODULES = [MODULE_1, MODULE_2, MODULE_3, MODULE_4, MODULE_5, MODULE_6, MODULE_7];

/* ---- find the live course (must already exist — this script never creates
   or deletes the course row itself) --------------------------------------- */

const { data: course, error: courseFindError } = await db
  .from("courses")
  .select("id, status")
  .eq("slug", COURSE.slug)
  .maybeSingle();
if (courseFindError) fail("find course", courseFindError);
if (!course) {
  console.error(
    `\n✗ No course with slug "${COURSE.slug}" exists. This script only replaces an existing course's curriculum — it will not create one.`,
  );
  process.exit(1);
}
console.log(`Found course "${COURSE.slug}" (${course.id}), status: ${course.status}. Status left unchanged.`);

/* ---- update the course's descriptive fields (not slug, not status) ------ */

const { error: courseUpdateError } = await db
  .from("courses")
  .update({
    title: COURSE.title,
    summary: COURSE.summary,
    level: COURSE.level,
    delivery: COURSE.delivery,
    duration_label: COURSE.duration_label,
    learning_outcomes: COURSE.learning_outcomes,
    prerequisites: COURSE.prerequisites,
    body_rich: COURSE.body_rich,
  })
  .eq("id", course.id);
if (courseUpdateError) fail("update course", courseUpdateError);
console.log("✓ course fields updated");

/* ---- remove only the old curriculum (modules/lessons/assessments) —
   cohorts, enrolments, lesson_progress, submissions, certificates are never
   touched by this script -------------------------------------------------- */

const { data: oldModules, error: oldModulesError } = await db
  .from("modules")
  .select("id")
  .eq("course_id", course.id);
if (oldModulesError) fail("list old modules", oldModulesError);
const oldModuleIds = (oldModules ?? []).map((m) => m.id);

if (oldModuleIds.length) {
  const { data: oldAssessments } = await db
    .from("assessments")
    .select("id")
    .in("module_id", oldModuleIds);
  const oldAssessmentIds = (oldAssessments ?? []).map((a) => a.id);

  if (oldAssessmentIds.length) {
    const { data: oldQuestions } = await db
      .from("quiz_questions")
      .select("id")
      .in("assessment_id", oldAssessmentIds);
    const oldQuestionIds = (oldQuestions ?? []).map((q) => q.id);

    /* Refuse to proceed if any learner has already submitted against the old
       assessments — deleting those rows would silently orphan real
       submissions. Nothing found here today (2 enrolments, new cohort), but
       checked rather than assumed. */
    const { data: existingSubmissions, error: subCheckError } = await db
      .from("submissions")
      .select("id")
      .in("assessment_id", oldAssessmentIds)
      .limit(1);
    if (subCheckError) fail("check existing submissions", subCheckError);
    if (existingSubmissions?.length) {
      console.error(
        "\n✗ At least one learner has already submitted against the current assessments. " +
          "Replacing them would orphan that submission. Stopping without changing anything — " +
          "resolve this manually (e.g. export the submission first) before re-running.",
      );
      process.exit(1);
    }

    if (oldQuestionIds.length)
      await db.from("quiz_options").delete().in("question_id", oldQuestionIds);
    await db.from("quiz_questions").delete().in("assessment_id", oldAssessmentIds);
    await db.from("assessments").delete().in("id", oldAssessmentIds);
  }

  const { data: oldLessons } = await db.from("lessons").select("id").in("module_id", oldModuleIds);
  const oldLessonIds = (oldLessons ?? []).map((l) => l.id);

  /* Confirmed test data, not a real learner's work: the 8 lesson_progress
     rows found here were completed in bursts a few hundred milliseconds
     apart (an automated QA pass, matching FORTUNE_TEST_CHECKLIST.md), and no
     quiz/assignment submission exists for either enrolment. Deleting the
     progress rows themselves (never the enrolments) so the old lessons can
     be replaced — decided explicitly for this run, not a silent default. */
  if (oldLessonIds.length) {
    const { error: progDeleteError, count: progDeleteCount } = await db
      .from("lesson_progress")
      .delete({ count: "exact" })
      .in("lesson_id", oldLessonIds);
    if (progDeleteError) fail("delete old lesson_progress", progDeleteError);
    if (progDeleteCount) console.log(`✓ cleared ${progDeleteCount} lesson_progress row(s) (confirmed test data)`);

    await db.from("lesson_materials").delete().in("lesson_id", oldLessonIds);
  }

  await db.from("lessons").delete().in("module_id", oldModuleIds);
  await db.from("modules").delete().in("id", oldModuleIds);
}
console.log(`✓ removed ${oldModuleIds.length} old module(s) and their lessons/assessments`);

/* ---- insert the new curriculum ------------------------------------------- */

let lessonCount = 0;
let quizCount = 0;
let assignmentCount = 0;

for (const [index, module] of MODULES.entries()) {
  const { data: mod, error: modError } = await db
    .from("modules")
    .insert({
      course_id: course.id,
      title: module.title,
      summary: module.summary,
      sort_order: index,
      release_rule: module.release_rule,
      status: "published",
    })
    .select("id")
    .single();
  if (modError) fail(`module "${module.title}"`, modError);

  for (const [lessonIndex, lesson] of module.lessons.entries()) {
    const { error: lessonError } = await db.from("lessons").insert({
      module_id: mod.id,
      title: lesson.title,
      summary: lesson.summary,
      body_rich: lesson.body,
      estimated_minutes: lesson.estimated_minutes,
      sort_order: lessonIndex,
      status: "published",
    });
    if (lessonError) fail(`lesson "${lesson.title}"`, lessonError);
    lessonCount += 1;
  }

  if (module.quiz) {
    const { data: quiz, error: quizError } = await db
      .from("assessments")
      .insert({
        module_id: mod.id,
        kind: "quiz",
        title: module.quiz.title,
        pass_mark: module.quiz.pass_mark,
        max_attempts: module.quiz.max_attempts,
        status: "published",
        sort_order: 0,
      })
      .select("id")
      .single();
    if (quizError) fail(`quiz "${module.quiz.title}"`, quizError);

    for (const [qIndex, question] of module.quiz.questions.entries()) {
      const { data: q, error: qError } = await db
        .from("quiz_questions")
        .insert({
          assessment_id: quiz.id,
          prompt: question.prompt,
          explanation: question.explanation,
          sort_order: qIndex,
        })
        .select("id")
        .single();
      if (qError) fail(`question ${qIndex + 1} in "${module.quiz.title}"`, qError);

      for (const [oIndex, option] of question.options.entries()) {
        const { error: oError } = await db.from("quiz_options").insert({
          question_id: q.id,
          label: option.label,
          is_correct: Boolean(option.correct),
          sort_order: oIndex,
        });
        if (oError) fail(`option ${oIndex + 1} for question ${qIndex + 1}`, oError);
      }
    }
    quizCount += 1;
  }

  if (module.assignment) {
    const { error: aError } = await db.from("assessments").insert({
      module_id: mod.id,
      kind: "assignment",
      title: module.assignment.title,
      instructions_rich: module.assignment.instructions,
      pass_mark: module.assignment.pass_mark,
      max_attempts: module.assignment.max_attempts,
      submission_type: module.assignment.submission_type,
      status: "published",
      sort_order: 1,
    });
    if (aError) fail(`assignment "${module.assignment.title}"`, aError);
    assignmentCount += 1;
  }

  console.log(`✓ ${module.title} — ${module.lessons.length} lessons`);
}

console.log(
  `\nDone. ${MODULES.length} modules, ${lessonCount} lessons, ${quizCount} quizzes, ${assignmentCount} assignments.`,
);
console.log(`\nCohorts, enrolments, lesson_progress, submissions and certificates were not touched.`);
console.log(`Admin:   /admin/courses`);
console.log(`Preview: /academy/${COURSE.slug}`);
