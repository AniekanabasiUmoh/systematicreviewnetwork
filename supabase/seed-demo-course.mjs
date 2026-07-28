/* Sprint 6.9 — seed the demonstration course.
 *
 * Idempotent: re-running replaces the course cleanly rather than duplicating
 * it. Safe to run repeatedly while iterating on the content.
 *
 * The cohort is created as a DRAFT and must stay that way until SRN reviews
 * the material — see the note in demo-course-content.mjs. This script refuses
 * to publish it and prints a reminder at the end.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { COURSE, MODULES, COHORT } from "./demo-course-content.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function fail(step, error) {
  console.error(`\n✗ ${step}: ${error.message}`);
  process.exit(1);
}

/* ---- clean up any previous run ------------------------------------------ */

console.log("Removing any previous demo course…");

const { data: existing } = await db
  .from("courses")
  .select("id")
  .eq("slug", COURSE.slug)
  .maybeSingle();

if (existing) {
  const courseId = existing.id;

  const { data: cohorts } = await db
    .from("cohorts")
    .select("id")
    .eq("course_id", courseId);
  const cohortIds = (cohorts ?? []).map((c) => c.id);

  if (cohortIds.length) {
    const { data: enrolments } = await db
      .from("enrolments")
      .select("id")
      .in("cohort_id", cohortIds);
    const enrolIds = (enrolments ?? []).map((e) => e.id);
    if (enrolIds.length) {
      await db.from("certificates").delete().in("enrolment_id", enrolIds);
      await db.from("submissions").delete().in("enrolment_id", enrolIds);
      await db.from("lesson_progress").delete().in("enrolment_id", enrolIds);
    }
    await db.from("enrolments").delete().in("cohort_id", cohortIds);
    await db.from("cohort_instructors").delete().in("cohort_id", cohortIds);
    await db.from("cohort_announcements").delete().in("cohort_id", cohortIds);
    await db.from("live_sessions").delete().in("cohort_id", cohortIds);
  }

  const { data: modules } = await db
    .from("modules")
    .select("id")
    .eq("course_id", courseId);
  const moduleIds = (modules ?? []).map((m) => m.id);

  if (moduleIds.length) {
    const { data: assessments } = await db
      .from("assessments")
      .select("id")
      .in("module_id", moduleIds);
    const assessmentIds = (assessments ?? []).map((a) => a.id);
    if (assessmentIds.length) {
      const { data: questions } = await db
        .from("quiz_questions")
        .select("id")
        .in("assessment_id", assessmentIds);
      const questionIds = (questions ?? []).map((q) => q.id);
      if (questionIds.length)
        await db.from("quiz_options").delete().in("question_id", questionIds);
      await db.from("quiz_questions").delete().in("assessment_id", assessmentIds);
      await db.from("assessments").delete().in("id", assessmentIds);
    }

    const { data: lessons } = await db
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds);
    const lessonIds = (lessons ?? []).map((l) => l.id);
    if (lessonIds.length)
      await db.from("lesson_materials").delete().in("lesson_id", lessonIds);
    await db.from("lessons").delete().in("module_id", moduleIds);
    await db.from("modules").delete().in("id", moduleIds);
  }

  await db.from("cohorts").delete().eq("course_id", courseId);
  await db.from("courses").delete().eq("id", courseId);
}

/* ---- course -------------------------------------------------------------- */

const { data: course, error: courseError } = await db
  .from("courses")
  .insert({
    slug: COURSE.slug,
    title: COURSE.title,
    summary: COURSE.summary,
    level: COURSE.level,
    delivery: COURSE.delivery,
    duration_label: COURSE.duration_label,
    learning_outcomes: COURSE.learning_outcomes,
    prerequisites: COURSE.prerequisites,
    body_rich: COURSE.body_rich,
    // Draft. The catalogue must not show un-reviewed teaching material.
    status: "draft",
  })
  .select("id")
  .single();
if (courseError) fail("course", courseError);
console.log(`✓ course: ${COURSE.title}`);

/* ---- cohort -------------------------------------------------------------- */

const startsOn = new Date();
startsOn.setUTCDate(startsOn.getUTCDate() - 7);
const endsOn = new Date(startsOn);
endsOn.setUTCDate(endsOn.getUTCDate() + 42);

const { data: cohort, error: cohortError } = await db
  .from("cohorts")
  .insert({
    course_id: course.id,
    label: COHORT.label,
    slug: COHORT.slug,
    pacing: COHORT.pacing,
    price_kobo: COHORT.price_kobo,
    currency: COHORT.currency,
    capacity: COHORT.capacity,
    starts_on: startsOn.toISOString().slice(0, 10),
    ends_on: endsOn.toISOString().slice(0, 10),
    status: COHORT.status,
  })
  .select("id")
  .single();
if (cohortError) fail("cohort", cohortError);
console.log(`✓ cohort: ${COHORT.label} (${COHORT.status})`);

/* ---- modules, lessons, assessments --------------------------------------- */

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
      if (qError) fail(`question ${qIndex + 1}`, qError);

      for (const [oIndex, option] of question.options.entries()) {
        const { error: oError } = await db.from("quiz_options").insert({
          question_id: q.id,
          label: option.label,
          is_correct: Boolean(option.correct),
          sort_order: oIndex,
        });
        if (oError) fail(`option ${oIndex + 1}`, oError);
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
  `\nDone. ${MODULES.length} modules, ${lessonCount} lessons, ${quizCount} quiz, ${assignmentCount} assignment.`,
);
console.log(
  `\nThe cohort is a DRAFT and is not on the public catalogue. It stays that\nway until SRN has reviewed the content — a certificate from it would carry\nSRN's name.\n`,
);
console.log(`Admin:   /admin/courses`);
console.log(`Preview: /academy/${COURSE.slug}  (404 until published — expected)`);
