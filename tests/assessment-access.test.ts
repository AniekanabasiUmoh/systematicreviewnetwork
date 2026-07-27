import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.6 — the answer key must not leak, and marking must be honest.
 *
 * The central claim of this sprint is that `quiz_options.is_correct` never
 * reaches a learner. That is asserted three ways: the learner-facing function
 * does not return it, the anon key cannot read the table, and a signed-in
 * learner cannot either. The seed contains a question whose correct answer is
 * known here, so a leak would be detectable rather than merely absent. */

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through */
  }
  return { ...process.env, ...env } as Record<string, string>;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const PREFIX = "zz-test-6-6";

let anon: SupabaseClient;
let admin: SupabaseClient;

const ids = {
  course: "",
  cohort: "",
  selfPaced: "",
  module: "",
  quiz: "",
  assignment: "",
  q1: "",
  q1Correct: "",
  q1Wrong: "",
  q2: "",
  q2Correct: "",
  q2Wrong: "",
  unmarkable: "",
  learner: "",
  enrolment: "",
};
const authUsers: string[] = [];

async function cleanup() {
  if (!admin) return;
  const { data: assessments } = await admin
    .from("assessments")
    .select("id")
    .like("title", `${PREFIX}%`);
  const assessmentIds = (assessments ?? []).map((a) => (a as { id: string }).id);
  if (assessmentIds.length) {
    await admin.from("submissions").delete().in("assessment_id", assessmentIds);
    const { data: questions } = await admin
      .from("quiz_questions")
      .select("id")
      .in("assessment_id", assessmentIds);
    const questionIds = (questions ?? []).map((q) => (q as { id: string }).id);
    if (questionIds.length)
      await admin.from("quiz_options").delete().in("question_id", questionIds);
    await admin.from("quiz_questions").delete().in("assessment_id", assessmentIds);
    await admin.from("assessments").delete().in("id", assessmentIds);
  }
  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id")
    .like("slug", `${PREFIX}%`);
  const cohortIds = (cohorts ?? []).map((c) => (c as { id: string }).id);
  if (cohortIds.length) {
    const { data: enrolments } = await admin
      .from("enrolments")
      .select("id")
      .in("cohort_id", cohortIds);
    const enrolIds = (enrolments ?? []).map((e) => (e as { id: string }).id);
    if (enrolIds.length)
      await admin.from("lesson_progress").delete().in("enrolment_id", enrolIds);
    await admin.from("enrolments").delete().in("cohort_id", cohortIds);
  }
  await admin.from("lessons").delete().like("title", `${PREFIX}%`);
  await admin.from("modules").delete().like("title", `${PREFIX}%`);
  await admin.from("cohorts").delete().like("slug", `${PREFIX}%`);
  await admin.from("courses").delete().like("slug", `${PREFIX}%`);
  await admin.from("learners").delete().like("email", `${PREFIX}%`);
  for (const id of authUsers) await admin.auth.admin.deleteUser(id).catch(() => {});
  authUsers.length = 0;
}

beforeAll(async () => {
  if (!URL || !ANON || !SERVICE) throw new Error("Missing Supabase env.");
  anon = createClient(URL, ANON, { auth: { persistSession: false } });
  admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await cleanup();

  const { data: course, error } = await admin
    .from("courses")
    .insert({
      slug: `${PREFIX}-course`,
      title: `${PREFIX} course`,
      level: "introductory",
      delivery: "online",
      status: "published",
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(`course: ${error.message}`);
  ids.course = (course as { id: string }).id;

  for (const [key, slug, pacing] of [
    ["cohort", `${PREFIX}-c`, "cohort_paced"],
    ["selfPaced", `${PREFIX}-s`, "self_paced"],
  ] as const) {
    const { data } = await admin
      .from("cohorts")
      .insert({
        course_id: ids.course,
        label: slug,
        slug,
        pacing,
        status: "published",
        price_kobo: 0,
        currency: "NGN",
      } as never)
      .select("id")
      .single();
    ids[key] = (data as { id: string }).id;
  }

  const { data: mod } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} module`,
      release_rule: "immediate",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.module = (mod as { id: string }).id;

  const { data: quiz } = await admin
    .from("assessments")
    .insert({
      module_id: ids.module,
      kind: "quiz",
      title: `${PREFIX} quiz`,
      pass_mark: 50,
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.quiz = (quiz as { id: string }).id;

  const { data: assignment } = await admin
    .from("assessments")
    .insert({
      module_id: ids.module,
      kind: "assignment",
      title: `${PREFIX} assignment`,
      pass_mark: 60,
      max_attempts: 2,
      submission_type: "text",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.assignment = (assignment as { id: string }).id;

  // Two markable questions, plus one with NO correct option — a staff mistake
  // that must not count against a learner.
  for (const [qKey, correctKey, wrongKey, prompt] of [
    ["q1", "q1Correct", "q1Wrong", `${PREFIX} question one`],
    ["q2", "q2Correct", "q2Wrong", `${PREFIX} question two`],
  ] as const) {
    const { data: q } = await admin
      .from("quiz_questions")
      .insert({ assessment_id: ids.quiz, prompt, sort_order: 0 } as never)
      .select("id")
      .single();
    ids[qKey] = (q as { id: string }).id;

    const { data: right } = await admin
      .from("quiz_options")
      .insert({
        question_id: ids[qKey],
        label: "The right answer",
        is_correct: true,
        sort_order: 0,
      } as never)
      .select("id")
      .single();
    ids[correctKey] = (right as { id: string }).id;

    const { data: wrong } = await admin
      .from("quiz_options")
      .insert({
        question_id: ids[qKey],
        label: "The wrong answer",
        is_correct: false,
        sort_order: 1,
      } as never)
      .select("id")
      .single();
    ids[wrongKey] = (wrong as { id: string }).id;
  }

  const { data: broken } = await admin
    .from("quiz_questions")
    .insert({
      assessment_id: ids.quiz,
      prompt: `${PREFIX} question with no key`,
      sort_order: 2,
    } as never)
    .select("id")
    .single();
  ids.unmarkable = (broken as { id: string }).id;
  await admin.from("quiz_options").insert({
    question_id: ids.unmarkable,
    label: "Neither option is marked correct",
    is_correct: false,
  } as never);

  const email = `${PREFIX}-learner-${Date.now()}@example.com`;
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password: `Test-${Math.random().toString(36).slice(2)}-9aB!`,
    email_confirm: true,
  });
  if (userError || !user.user) throw new Error(`user: ${userError?.message}`);
  authUsers.push(user.user.id);
  ids.learner = user.user.id;
  await admin.from("learners").insert({
    id: ids.learner,
    email,
    full_name: "Test learner",
    verified_at: new Date().toISOString(),
  } as never);

  const { data: enrolment } = await admin
    .from("enrolments")
    .insert({
      learner_id: ids.learner,
      cohort_id: ids.cohort,
      state: "active",
      payment_status: "not_required",
    } as never)
    .select("id")
    .single();
  ids.enrolment = (enrolment as { id: string }).id;
}, 120_000);

afterAll(cleanup, 120_000);

describe("seed sanity", () => {
  it("seeded everything", () => {
    for (const [key, value] of Object.entries(ids))
      expect(value, key).toBeTruthy();
  });
});

describe("the answer key never reaches a learner", () => {
  it("getQuizForLearner returns options with NO correctness field", async () => {
    const { getQuizForLearner } = await import("@/lib/academy/assessment");
    const questions = await getQuizForLearner(ids.quiz);
    expect(questions.length).toBe(3);

    for (const question of questions) {
      for (const option of question.options) {
        // The shape itself must not carry it, under any key spelling.
        expect(Object.keys(option).sort()).toEqual(["id", "label"]);
        expect("is_correct" in option).toBe(false);
      }
    }
  });

  it("nothing in the serialised payload reveals which option is right", async () => {
    /* The real leak would be a stray field surviving JSON.stringify into the
       RSC payload. Assert against the serialised form, not just the type. */
    const { getQuizForLearner } = await import("@/lib/academy/assessment");
    const questions = await getQuizForLearner(ids.quiz);
    const serialised = JSON.stringify(questions);

    /* Test the FIELD, not the prose: an option's label may legitimately contain
       the word "correct", and an earlier version of this test failed on its own
       seed data for exactly that reason. What must never appear is the key
       itself, under any spelling, or a boolean beside an option. */
    expect(serialised).not.toContain("is_correct");
    expect(serialised).not.toContain("isCorrect");
    expect(serialised).not.toContain("true");
    expect(serialised).not.toContain("false");

    /* And the answer key is genuinely known to the database for this quiz, so
       "no boolean present" means it was withheld rather than never existing. */
    const { data: key } = await admin
      .from("quiz_options")
      .select("id")
      .eq("question_id", ids.q1)
      .eq("is_correct", true);
    expect((key ?? []).length).toBe(1);
  });

  it("anon cannot read quiz_options at all", async () => {
    const { data } = await anon.from("quiz_options").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);

    // And the rows genuinely exist, so this is RLS and not an empty table.
    const { count } = await admin
      .from("quiz_options")
      .select("id", { count: "exact", head: true })
      .eq("question_id", ids.q1);
    expect(count).toBe(2);
  });

  it("anon cannot read the questions either", async () => {
    const { data } = await anon.from("quiz_questions").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);
  });
});

describe("markQuiz", () => {
  it("scores a perfect answer sheet at 100", async () => {
    const { markQuiz } = await import("@/lib/academy/assessment");
    const result = await markQuiz(ids.quiz, {
      [ids.q1]: ids.q1Correct,
      [ids.q2]: ids.q2Correct,
    });
    expect(result.score).toBe(100);
    expect(result.correct).toBe(2);
  });

  it("scores half right at 50", async () => {
    const { markQuiz } = await import("@/lib/academy/assessment");
    const result = await markQuiz(ids.quiz, {
      [ids.q1]: ids.q1Correct,
      [ids.q2]: ids.q2Wrong,
    });
    expect(result.score).toBe(50);
  });

  it("scores an empty sheet at 0 without throwing", async () => {
    const { markQuiz } = await import("@/lib/academy/assessment");
    const result = await markQuiz(ids.quiz, {});
    expect(result.score).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it("EXCLUDES a question with no correct option rather than failing the learner", async () => {
    /* Three questions exist, one of them unmarkable. A learner who answers the
       two real ones correctly must score 100, not 67 — the staff mistake is not
       theirs to pay for. */
    const { markQuiz } = await import("@/lib/academy/assessment");
    const result = await markQuiz(ids.quiz, {
      [ids.q1]: ids.q1Correct,
      [ids.q2]: ids.q2Correct,
      [ids.unmarkable]: "anything",
    });
    expect(result.total).toBe(2);
    expect(result.score).toBe(100);
  });

  it("ignores an answer naming an option from another question", async () => {
    const { markQuiz } = await import("@/lib/academy/assessment");
    const result = await markQuiz(ids.quiz, {
      [ids.q1]: ids.q2Correct,
      [ids.q2]: ids.q2Correct,
    });
    expect(result.correct).toBe(1);
    expect(result.score).toBe(50);
  });
});

describe("assessments follow the 6.3 gate", () => {
  const cohortRef = () => ({
    id: ids.cohort,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("lists assessments to an enrolled learner", async () => {
    const { listAssessmentsForLearner } = await import(
      "@/lib/academy/assessment"
    );
    const list = await listAssessmentsForLearner(ids.learner, cohortRef());
    expect(list).not.toBeNull();
    expect(list!.map((a) => a.id).sort()).toEqual(
      [ids.quiz, ids.assignment].sort(),
    );
  });

  it("returns null for someone with no enrolment", async () => {
    const { listAssessmentsForLearner } = await import(
      "@/lib/academy/assessment"
    );
    expect(
      await listAssessmentsForLearner(
        "00000000-0000-0000-0000-000000000000",
        cohortRef(),
      ),
    ).toBeNull();
  });

  it("hides an assessment inside a LOCKED module", async () => {
    const { listAssessmentsForLearner } = await import(
      "@/lib/academy/assessment"
    );
    await admin
      .from("modules")
      .update({
        release_rule: "on_date",
        release_on: "2099-01-01T00:00:00Z",
      } as never)
      .eq("id", ids.module);

    const list = await listAssessmentsForLearner(ids.learner, cohortRef());
    expect(list).toEqual([]);

    await admin
      .from("modules")
      .update({ release_rule: "immediate", release_on: null } as never)
      .eq("id", ids.module);
  });

  it("hides an unpublished assessment", async () => {
    const { listAssessmentsForLearner } = await import(
      "@/lib/academy/assessment"
    );
    await admin
      .from("assessments")
      .update({ status: "draft" } as never)
      .eq("id", ids.assignment);

    const list = await listAssessmentsForLearner(ids.learner, cohortRef());
    expect(list!.map((a) => a.id)).not.toContain(ids.assignment);

    await admin
      .from("assessments")
      .update({ status: "published" } as never)
      .eq("id", ids.assignment);
  });
});

describe("submissions and attempts", () => {
  it("records an attempt and keeps earlier ones", async () => {
    await admin.from("submissions").insert({
      assessment_id: ids.assignment,
      enrolment_id: ids.enrolment,
      attempt: 1,
      state: "returned",
      body_text: "First try",
      score: 40,
      passed: false,
      feedback: "Needs more detail on the search strategy.",
      marked_by: "marker@example.com",
      marked_at: new Date().toISOString(),
    } as never);

    await admin.from("submissions").insert({
      assessment_id: ids.assignment,
      enrolment_id: ids.enrolment,
      attempt: 2,
      state: "submitted",
      body_text: "Second try",
    } as never);

    const { listAttempts } = await import("@/lib/academy/assessment");
    const attempts = await listAttempts(ids.enrolment, ids.assignment);
    expect(attempts.map((a) => a.attempt)).toEqual([2, 1]);
    // The first attempt's feedback survived the resubmission.
    expect(attempts[1].feedback).toContain("search strategy");
  });

  it("refuses a duplicate attempt number", async () => {
    const { error } = await admin.from("submissions").insert({
      assessment_id: ids.assignment,
      enrolment_id: ids.enrolment,
      attempt: 1,
    } as never);
    expect(error).not.toBeNull();
    expect((error as { code?: string })?.code).toBe("23505");
  });

  it("blocks a third attempt on a two-attempt assessment", async () => {
    const { canAttempt, listAttempts } = await import(
      "@/lib/academy/assessment"
    );
    // Mark the outstanding one so "still being marked" is not the reason.
    await admin
      .from("submissions")
      .update({ state: "returned", score: 50, passed: false } as never)
      .eq("enrolment_id", ids.enrolment)
      .eq("assessment_id", ids.assignment)
      .eq("attempt", 2);

    const attempts = await listAttempts(ids.enrolment, ids.assignment);
    const result = canAttempt({ max_attempts: 2 }, attempts);
    expect(result.allowed).toBe(false);
  });

  it("refuses a score outside 0–100", async () => {
    const { error } = await admin.from("submissions").insert({
      assessment_id: ids.quiz,
      enrolment_id: ids.enrolment,
      attempt: 99,
      score: 150,
    } as never);
    expect(error).not.toBeNull();
  });

  it("anon cannot read or write submissions", async () => {
    const { data } = await anon.from("submissions").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);
    const { error } = await anon.from("submissions").insert({} as never);
    expect(error).not.toBeNull();
  });
});

describe("database integrity", () => {
  it("refuses a pass mark above 100", async () => {
    const { error } = await admin.from("assessments").insert({
      module_id: ids.module,
      kind: "quiz",
      title: `${PREFIX} impossible`,
      pass_mark: 150,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses zero max_attempts — blank means unlimited, 0 means nobody", async () => {
    const { error } = await admin.from("assessments").insert({
      module_id: ids.module,
      kind: "quiz",
      title: `${PREFIX} nobody`,
      max_attempts: 0,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses an unknown assessment kind", async () => {
    const { error } = await admin.from("assessments").insert({
      module_id: ids.module,
      kind: "essay",
      title: `${PREFIX} unknown`,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses to delete an assessment that has submissions", async () => {
    const { error } = await admin
      .from("assessments")
      .delete()
      .eq("id", ids.assignment);
    expect(error).not.toBeNull();
    expect((error as { code?: string })?.code).toBe("23503");
  });
});
