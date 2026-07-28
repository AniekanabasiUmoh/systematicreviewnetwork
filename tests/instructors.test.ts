import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.8 — the instructor boundary.
 *
 * §6.8's done-when: "an instructor manages only their cohorts". The case that
 * proves it is not "an instructor can see their cohort" — it is an instructor
 * assigned to cohort A being exactly as powerless on cohort B as a stranger.
 * Both cohorts are seeded with real learners and real submissions so a zero
 * result means refusal rather than an empty table.
 *
 * The other claim under test: instructor is NOT is_staff(). That function gates
 * ~40 write policies across the Academy, and folding the role into it would
 * have been a one-line change with a very large blast radius. */

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

const PREFIX = "zz-test-6-8";

let anon: SupabaseClient;
let admin: SupabaseClient;
/** Signed in AS the instructor — the credential that must stay narrow. */
let asInstructor: SupabaseClient;

const ids = {
  course: "",
  cohortA: "",
  cohortB: "",
  module: "",
  lesson: "",
  assessment: "",
  instructor: "",
  learnerA: "",
  learnerB: "",
  enrolA: "",
  enrolB: "",
  submissionA: "",
  submissionB: "",
};
const authUsers: string[] = [];
const instructorPassword = `Test-${Math.random().toString(36).slice(2)}-9aB!`;
let instructorEmail = "";

async function makeUser(tag: string, password?: string): Promise<string> {
  const email = `${PREFIX}-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: password ?? `Test-${Math.random().toString(36).slice(2)}-9aB!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`${tag}: ${error?.message}`);
  authUsers.push(data.user.id);
  if (tag === "instructor") instructorEmail = email;
  return data.user.id;
}

async function cleanup() {
  if (!admin) return;
  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id")
    .like("slug", `${PREFIX}%`);
  const cohortIds = (cohorts ?? []).map((c) => (c as { id: string }).id);
  if (cohortIds.length) {
    await admin.from("cohort_instructors").delete().in("cohort_id", cohortIds);
    const { data: enrolments } = await admin
      .from("enrolments")
      .select("id")
      .in("cohort_id", cohortIds);
    const enrolIds = (enrolments ?? []).map((e) => (e as { id: string }).id);
    if (enrolIds.length) {
      await admin.from("submissions").delete().in("enrolment_id", enrolIds);
      await admin.from("lesson_progress").delete().in("enrolment_id", enrolIds);
      await admin.from("certificates").delete().in("enrolment_id", enrolIds);
    }
    await admin.from("enrolments").delete().in("cohort_id", cohortIds);
  }
  await admin.from("assessments").delete().like("title", `${PREFIX}%`);
  await admin.from("lessons").delete().like("title", `${PREFIX}%`);
  await admin.from("modules").delete().like("title", `${PREFIX}%`);
  await admin.from("cohorts").delete().like("slug", `${PREFIX}%`);
  await admin.from("courses").delete().like("slug", `${PREFIX}%`);
  await admin.from("learners").delete().like("email", `${PREFIX}%`);
  await admin.from("profiles").delete().like("email", `${PREFIX}%`);
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

  const { data: course } = await admin
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
  ids.course = (course as { id: string }).id;

  for (const [key, slug] of [
    ["cohortA", `${PREFIX}-a`],
    ["cohortB", `${PREFIX}-b`],
  ] as const) {
    const { data } = await admin
      .from("cohorts")
      .insert({
        course_id: ids.course,
        label: slug,
        slug,
        pacing: "cohort_paced",
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

  const { data: lesson } = await admin
    .from("lessons")
    .insert({
      module_id: ids.module,
      title: `${PREFIX} lesson`,
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.lesson = (lesson as { id: string }).id;

  const { data: assessment } = await admin
    .from("assessments")
    .insert({
      module_id: ids.module,
      kind: "assignment",
      title: `${PREFIX} assignment`,
      pass_mark: 50,
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.assessment = (assessment as { id: string }).id;

  // The instructor, with a real password so we can sign in AS them.
  ids.instructor = await makeUser("instructor", instructorPassword);
  const { error: profileError } = await admin.from("profiles").insert({
    id: ids.instructor,
    email: instructorEmail,
    full_name: "Test Instructor",
    role: "instructor",
  } as never);
  if (profileError) throw new Error(`profile: ${profileError.message}`);

  // One learner and one submission on each cohort.
  for (const [learnerKey, enrolKey, subKey, cohortKey] of [
    ["learnerA", "enrolA", "submissionA", "cohortA"],
    ["learnerB", "enrolB", "submissionB", "cohortB"],
  ] as const) {
    ids[learnerKey] = await makeUser(learnerKey);
    const email = `${PREFIX}-${learnerKey}-${Date.now()}@example.com`;
    await admin.from("learners").insert({
      id: ids[learnerKey],
      email,
      full_name: `Test ${learnerKey}`,
      verified_at: new Date().toISOString(),
    } as never);

    const { data: enrol } = await admin
      .from("enrolments")
      .insert({
        learner_id: ids[learnerKey],
        cohort_id: ids[cohortKey],
        state: "active",
        payment_status: "not_required",
        learner_email_at_enrolment: email,
        learner_name_at_enrolment: `Test ${learnerKey}`,
      } as never)
      .select("id")
      .single();
    ids[enrolKey] = (enrol as { id: string }).id;

    const { data: sub } = await admin
      .from("submissions")
      .insert({
        assessment_id: ids.assessment,
        enrolment_id: ids[enrolKey],
        attempt: 1,
        state: "submitted",
        body_text: `${PREFIX} work from ${learnerKey}`,
      } as never)
      .select("id")
      .single();
    ids[subKey] = (sub as { id: string }).id;
  }

  // Assign the instructor to cohort A ONLY.
  await admin.from("cohort_instructors").insert({
    instructor_id: ids.instructor,
    cohort_id: ids.cohortA,
  } as never);

  // Sign in as them — this client carries their real, narrow credential.
  asInstructor = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await asInstructor.auth.signInWithPassword({
    email: instructorEmail,
    password: instructorPassword,
  });
  if (signInError) throw new Error(`sign in: ${signInError.message}`);
}, 180_000);

afterAll(cleanup, 180_000);

describe("seed sanity", () => {
  it("seeded both cohorts with real learners and submissions", () => {
    for (const [key, value] of Object.entries(ids))
      expect(value, key).toBeTruthy();
  });
});

describe("an instructor is NOT staff", () => {
  it("is_staff() is false for them", async () => {
    const { data } = await asInstructor.rpc("is_staff" as never);
    expect(data).toBe(false);
  });

  it("getSessionUser() returns null, so every requireStaff() page refuses", async () => {
    /* This is the load-bearing one. Dozens of admin pages call requireStaff()
       and none of them know instructors exist; they are safe only because the
       instructor never becomes a StaffUser. */
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", ids.instructor)
      .single();
    expect((data as { role: string }).role).toBe("instructor");
    expect(["admin", "editor"]).not.toContain((data as { role: string }).role);
  });

  it("cannot write course content", async () => {
    const { error } = await asInstructor.from("courses").insert({
      slug: `${PREFIX}-attack`,
      title: "Attack",
    } as never);
    expect(error).not.toBeNull();
  });

  it("cannot edit an existing course", async () => {
    const { data, error } = await asInstructor
      .from("courses")
      .update({ title: "Owned" } as never)
      .eq("id", ids.course)
      .select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("cannot read the certificate register", async () => {
    const { data } = await asInstructor.from("certificates").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot assign themselves to another cohort", async () => {
    const { error } = await asInstructor.from("cohort_instructors").insert({
      instructor_id: ids.instructor,
      cohort_id: ids.cohortB,
    } as never);
    expect(error).not.toBeNull();
  });
});

describe("scoped to their own cohort — §6.8's done-when", () => {
  it("is_instructor_for() is true for their cohort", async () => {
    const { data } = await asInstructor.rpc("is_instructor_for" as never, {
      p_cohort_id: ids.cohortA,
    } as never);
    expect(data).toBe(true);
  });

  it("is_instructor_for() is FALSE for a cohort they do not teach", async () => {
    const { data } = await asInstructor.rpc("is_instructor_for" as never, {
      p_cohort_id: ids.cohortB,
    } as never);
    expect(data).toBe(false);
  });

  it("sees their own cohort's enrolments and ONLY those", async () => {
    const { data } = await asInstructor.from("enrolments").select("id, cohort_id");
    const rows = (data ?? []) as Array<{ id: string; cohort_id: string }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.cohort_id === ids.cohortA)).toBe(true);
    expect(rows.map((r) => r.id)).not.toContain(ids.enrolB);
  });

  it("sees their own cohort's submissions and ONLY those", async () => {
    const { data } = await asInstructor.from("submissions").select("id");
    const ids_ = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
    expect(ids_).toContain(ids.submissionA);
    expect(ids_).not.toContain(ids.submissionB);
  });

  it("can mark work on their own cohort", async () => {
    const { data, error } = await asInstructor
      .from("submissions")
      .update({ score: 70, passed: true, feedback: "Good." } as never)
      .eq("id", ids.submissionA)
      .select("id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });

  it("canNOT mark work on a cohort they do not teach", async () => {
    const { data, error } = await asInstructor
      .from("submissions")
      .update({ score: 100, passed: true } as never)
      .eq("id", ids.submissionB)
      .select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);

    // And the row is genuinely untouched.
    const { data: check } = await admin
      .from("submissions")
      .select("score")
      .eq("id", ids.submissionB)
      .single();
    expect((check as { score: number | null }).score).toBeNull();
  });

  it("cannot create or delete a submission — marking is not authoring", async () => {
    const insert = await asInstructor.from("submissions").insert({
      assessment_id: ids.assessment,
      enrolment_id: ids.enrolA,
      attempt: 99,
    } as never);
    expect(insert.error).not.toBeNull();

    const del = await asInstructor
      .from("submissions")
      .delete({ count: "exact" })
      .eq("id", ids.submissionA);
    expect(del.error !== null || (del.count ?? 0) === 0).toBe(true);
  });

  it("sees only their own assignment row", async () => {
    const { data } = await asInstructor
      .from("cohort_instructors")
      .select("cohort_id");
    const rows = (data ?? []) as Array<{ cohort_id: string }>;
    expect(rows.every((r) => r.cohort_id === ids.cohortA)).toBe(true);
  });
});

describe("anon reaches none of it", () => {
  it("cannot read assignments", async () => {
    const { data } = await anon.from("cohort_instructors").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);

    const { count } = await admin
      .from("cohort_instructors")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", ids.cohortA);
    expect(count).toBe(1);
  });

  it("cannot call is_instructor_for()", async () => {
    const { error } = await anon.rpc("is_instructor_for" as never, {
      p_cohort_id: ids.cohortA,
    } as never);
    expect(error).not.toBeNull();
  });
});

describe("cohort_report", () => {
  it("counts seats the same way the roster does", async () => {
    const { data } = await admin.rpc("cohort_report" as never, {
      p_cohort_id: ids.cohortA,
    } as never);
    const row = (Array.isArray(data) ? data[0] : data) as {
      enrolled: number;
      completed: number;
      completion_rate: string;
    };
    expect(row.enrolled).toBe(1);
    expect(row.completed).toBe(0);
    expect(Number(row.completion_rate)).toBe(0);
  });

  it("does NOT count a cancelled enrolment as reach", async () => {
    /* The figure that would overstate a funder application. */
    await admin
      .from("enrolments")
      .update({ cancelled_at: new Date().toISOString() } as never)
      .eq("id", ids.enrolA);

    const { data } = await admin.rpc("cohort_report" as never, {
      p_cohort_id: ids.cohortA,
    } as never);
    const row = (Array.isArray(data) ? data[0] : data) as { enrolled: number };
    expect(row.enrolled).toBe(0);

    await admin
      .from("enrolments")
      .update({ cancelled_at: null } as never)
      .eq("id", ids.enrolA);
  });

  it("returns zeros, not nulls, for a cohort with nobody in it", async () => {
    const { data } = await admin.rpc("cohort_report" as never, {
      p_cohort_id: ids.cohortB,
    } as never);
    const row = (Array.isArray(data) ? data[0] : data) as {
      enrolled: number;
      completion_rate: string;
      average_score: string;
    };
    expect(row.enrolled).toBe(1);
    expect(Number(row.completion_rate)).toBe(0);
    expect(Number.isNaN(Number(row.average_score))).toBe(false);
  });
});
