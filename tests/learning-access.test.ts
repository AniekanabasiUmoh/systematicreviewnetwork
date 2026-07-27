import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.5 — join URLs, progress, and the drip loop.
 *
 * §6.5's done-when names two callers who must fail to obtain a join URL: a
 * signed-out visitor, and an enrolled learner on a DIFFERENT cohort. The second
 * is the interesting one — they have a real, paid, active enrolment, just not
 * on this cohort — so it is seeded and asserted directly rather than assumed.
 *
 * It also closes the loop 6.3 left open: `after_previous` was written but could
 * never fire, because nothing supplied a completion set. Here it does. */

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

const PREFIX = "zz-test-6-5";
const JOIN_URL = "https://zoom.us/j/9999999999";

let anon: SupabaseClient;
let admin: SupabaseClient;

const ids = {
  course: "",
  cohortA: "",
  cohortB: "",
  selfPaced: "",
  moduleOne: "",
  moduleTwo: "",
  lessonOne: "",
  lessonTwo: "",
  sessionNow: "",
  insider: "",
  outsider: "",
  enrolInsider: "",
};
const authUsers: string[] = [];

async function makeLearner(tag: string): Promise<string> {
  const email = `${PREFIX}-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Test-${Math.random().toString(36).slice(2)}-9aB!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`user: ${error?.message}`);
  authUsers.push(data.user.id);
  const { error: rowError } = await admin.from("learners").insert({
    id: data.user.id,
    email,
    full_name: `Test ${tag}`,
    verified_at: new Date().toISOString(),
  } as never);
  if (rowError) throw new Error(`learner: ${rowError.message}`);
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
    const { data: sessions } = await admin
      .from("live_sessions")
      .select("id")
      .in("cohort_id", cohortIds);
    const sessionIds = (sessions ?? []).map((s) => (s as { id: string }).id);
    if (sessionIds.length)
      await admin.from("session_attendance").delete().in("session_id", sessionIds);
    await admin.from("live_sessions").delete().in("cohort_id", cohortIds);
    await admin.from("cohort_announcements").delete().in("cohort_id", cohortIds);

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
    ["cohortA", `${PREFIX}-a`, "cohort_paced"],
    ["cohortB", `${PREFIX}-b`, "cohort_paced"],
    ["selfPaced", `${PREFIX}-self`, "self_paced"],
  ] as const) {
    const { data, error: e } = await admin
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
    if (e) throw new Error(`cohort ${slug}: ${e.message}`);
    ids[key] = (data as { id: string }).id;
  }

  /* Module two uses after_previous — the rule 6.3 wrote and could not fire. */
  const { data: m1 } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} module one`,
      sort_order: 0,
      release_rule: "immediate",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.moduleOne = (m1 as { id: string }).id;

  const { data: m2 } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} module two`,
      sort_order: 1,
      release_rule: "after_previous",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.moduleTwo = (m2 as { id: string }).id;

  for (const [moduleId, title, key] of [
    [ids.moduleOne, `${PREFIX} lesson one`, "lessonOne"],
    [ids.moduleTwo, `${PREFIX} lesson two`, "lessonTwo"],
  ] as const) {
    const { data, error: e } = await admin
      .from("lessons")
      .insert({ module_id: moduleId, title, status: "published", sort_order: 0 } as never)
      .select("id")
      .single();
    if (e) throw new Error(`lesson: ${e.message}`);
    ids[key] = (data as { id: string }).id;
  }

  // A session running right now on cohort A, so the join window is open.
  const { data: session } = await admin
    .from("live_sessions")
    .insert({
      cohort_id: ids.cohortA,
      title: `${PREFIX} session`,
      starts_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      duration_minutes: 60,
      join_url: JOIN_URL,
    } as never)
    .select("id")
    .single();
  ids.sessionNow = (session as { id: string }).id;

  ids.insider = await makeLearner("insider");
  ids.outsider = await makeLearner("outsider");

  // The insider is on cohort A. The outsider is genuinely enrolled — paid,
  // active — but on cohort B. That is the case §6.5 names.
  const { data: enrolA } = await admin
    .from("enrolments")
    .insert({
      learner_id: ids.insider,
      cohort_id: ids.cohortA,
      state: "active",
      payment_status: "not_required",
    } as never)
    .select("id")
    .single();
  ids.enrolInsider = (enrolA as { id: string }).id;

  await admin.from("enrolments").insert({
    learner_id: ids.outsider,
    cohort_id: ids.cohortB,
    state: "active",
    payment_status: "paid",
  } as never);

  // The insider is also on the self-paced cohort, for the decision-1 test.
  await admin.from("enrolments").insert({
    learner_id: ids.insider,
    cohort_id: ids.selfPaced,
    state: "active",
    payment_status: "not_required",
  } as never);
}, 120_000);

afterAll(cleanup, 120_000);

describe("seed sanity", () => {
  it("seeded everything", () => {
    for (const [key, value] of Object.entries(ids))
      expect(value, key).toBeTruthy();
  });
});

describe("the join URL — §6.5's named done-when", () => {
  const cohortA = () => ({ id: ids.cohortA, pacing: "cohort_paced" });

  it("gives it to a learner enrolled on THIS cohort, during the window", async () => {
    const { getSessionsForLearner } = await import("@/lib/academy/sessions");
    const sessions = await getSessionsForLearner(ids.insider, cohortA());
    expect(sessions).not.toBeNull();
    const session = sessions!.find((s) => s.id === ids.sessionNow)!;
    expect(session.joinable).toBe(true);
    expect(session.join_url).toBe(JOIN_URL);
  });

  it("refuses an enrolled learner on a DIFFERENT cohort", async () => {
    const { getSessionsForLearner } = await import("@/lib/academy/sessions");
    // They are paid and active — just not here.
    expect(await getSessionsForLearner(ids.outsider, cohortA())).toBeNull();
  });

  it("strips it outside the join window", async () => {
    const { getSessionsForLearner } = await import("@/lib/academy/sessions");
    const long = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const sessions = await getSessionsForLearner(
      ids.insider,
      cohortA(),
      long,
    );
    const session = sessions!.find((s) => s.id === ids.sessionNow)!;
    expect(session.joinable).toBe(false);
    expect(session.join_url).toBeNull();
  });

  it("strips it for a COMPLETED enrolment — access to material is not access to a call", async () => {
    const { getSessionsForLearner } = await import("@/lib/academy/sessions");
    await admin
      .from("enrolments")
      .update({ state: "completed" } as never)
      .eq("id", ids.enrolInsider);

    const sessions = await getSessionsForLearner(ids.insider, cohortA());
    expect(sessions).not.toBeNull();
    const session = sessions!.find((s) => s.id === ids.sessionNow)!;
    expect(session.join_url).toBeNull();

    await admin
      .from("enrolments")
      .update({ state: "active" } as never)
      .eq("id", ids.enrolInsider);
  });

  it("never reaches the anon key at all", async () => {
    const { data } = await anon.from("live_sessions").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);

    // And the row genuinely exists, so the empty result means RLS.
    const { count } = await admin
      .from("live_sessions")
      .select("id", { count: "exact", head: true })
      .eq("id", ids.sessionNow);
    expect(count).toBe(1);
  });

  it("returns no sessions at all for a self-paced cohort (decision 1)", async () => {
    const { getSessionsForLearner } = await import("@/lib/academy/sessions");
    const sessions = await getSessionsForLearner(ids.insider, {
      id: ids.selfPaced,
      pacing: "self_paced",
    });
    expect(sessions).toEqual([]);
  });
});

describe("progress closes 6.3's after_previous loop", () => {
  const cohortRef = () => ({
    id: ids.cohortA,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("module two is LOCKED before module one is finished", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const { getCompletedLessonIds } = await import("@/lib/academy/progress");
    const completed = await getCompletedLessonIds(ids.enrolInsider);
    const modules = await getCurriculumForLearner(
      ids.insider,
      cohortRef(),
      completed,
    );
    const two = modules!.find((m) => m.id === ids.moduleTwo)!;
    expect(two.released).toBe(false);
    expect(two.lessons).toHaveLength(0);
  });

  it("finishing module one OPENS module two", async () => {
    const { markComplete, getCompletedLessonIds } = await import(
      "@/lib/academy/progress"
    );
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");

    expect(await markComplete(ids.enrolInsider, ids.lessonOne)).toBe(true);

    const completed = await getCompletedLessonIds(ids.enrolInsider);
    expect(completed.has(ids.lessonOne)).toBe(true);

    const modules = await getCurriculumForLearner(
      ids.insider,
      cohortRef(),
      completed,
    );
    const two = modules!.find((m) => m.id === ids.moduleTwo)!;
    expect(two.released).toBe(true);
    expect(two.lessons).toHaveLength(1);
  });

  it("marking twice is a no-op, not an error", async () => {
    const { markComplete } = await import("@/lib/academy/progress");
    expect(await markComplete(ids.enrolInsider, ids.lessonOne)).toBe(true);
    const { count } = await admin
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("enrolment_id", ids.enrolInsider)
      .eq("lesson_id", ids.lessonOne);
    expect(count).toBe(1);
  });

  it("unmarking closes module two again", async () => {
    const { markIncomplete, getCompletedLessonIds } = await import(
      "@/lib/academy/progress"
    );
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");

    expect(await markIncomplete(ids.enrolInsider, ids.lessonOne)).toBe(true);
    const completed = await getCompletedLessonIds(ids.enrolInsider);
    const modules = await getCurriculumForLearner(
      ids.insider,
      cohortRef(),
      completed,
    );
    expect(modules!.find((m) => m.id === ids.moduleTwo)!.released).toBe(false);

    // Restore for the tests below.
    const { markComplete } = await import("@/lib/academy/progress");
    await markComplete(ids.enrolInsider, ids.lessonOne);
  });

  it("a self-paced learner sees module two open regardless (decision 1)", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const modules = await getCurriculumForLearner(
      ids.insider,
      { id: ids.selfPaced, course_id: ids.course, pacing: "self_paced" },
      new Set(),
    );
    expect(modules!.every((m) => m.released)).toBe(true);
  });
});

describe("progress belongs to the enrolment, not the browser", () => {
  it("another learner's progress is not visible in mine", async () => {
    const { getCompletedLessonIds } = await import("@/lib/academy/progress");
    const { data: outsiderEnrol } = await admin
      .from("enrolments")
      .select("id")
      .eq("learner_id", ids.outsider)
      .eq("cohort_id", ids.cohortB)
      .single();

    const theirs = await getCompletedLessonIds(
      (outsiderEnrol as { id: string }).id,
    );
    expect(theirs.size).toBe(0);

    // While the insider's is populated — so this is a real separation, not an
    // empty table on both sides.
    const mine = await getCompletedLessonIds(ids.enrolInsider);
    expect(mine.size).toBeGreaterThan(0);
  });

  it("anon cannot read or write progress", async () => {
    const { data } = await anon.from("lesson_progress").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);
    const { error } = await anon.from("lesson_progress").insert({} as never);
    expect(error).not.toBeNull();
  });
});

describe("announcements", () => {
  it("shows published notices to an enrolled learner and hides drafts", async () => {
    await admin.from("cohort_announcements").insert([
      {
        cohort_id: ids.cohortA,
        title: `${PREFIX} published`,
        published_at: new Date().toISOString(),
      },
      { cohort_id: ids.cohortA, title: `${PREFIX} draft`, published_at: null },
    ] as never);

    const { getAnnouncementsForLearner } = await import("@/lib/academy/sessions");
    const notes = await getAnnouncementsForLearner(ids.insider, ids.cohortA);
    const titles = (notes ?? []).map((n) => n.title);
    expect(titles).toContain(`${PREFIX} published`);
    expect(titles).not.toContain(`${PREFIX} draft`);
  });

  it("refuses a learner on a different cohort", async () => {
    const { getAnnouncementsForLearner } = await import("@/lib/academy/sessions");
    expect(
      await getAnnouncementsForLearner(ids.outsider, ids.cohortA),
    ).toBeNull();
  });
});

describe("database integrity", () => {
  it("refuses a session longer than a day", async () => {
    const { error } = await admin.from("live_sessions").insert({
      cohort_id: ids.cohortA,
      title: `${PREFIX} marathon`,
      starts_at: new Date().toISOString(),
      duration_minutes: 2000,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses duplicate attendance for one session", async () => {
    const first = await admin.from("session_attendance").insert({
      session_id: ids.sessionNow,
      enrolment_id: ids.enrolInsider,
    } as never);
    expect(first.error).toBeNull();
    const second = await admin.from("session_attendance").insert({
      session_id: ids.sessionNow,
      enrolment_id: ids.enrolInsider,
    } as never);
    expect(second.error).not.toBeNull();
  });
});
