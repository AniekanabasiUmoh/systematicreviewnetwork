import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.3 — adversarial curriculum access.
 *
 * The 6.1 lesson again: an empty table returns nothing whether the gate works
 * or not. So this suite seeds a REAL course with real modules, lessons and an
 * enrolled learner, then asserts that a DIFFERENT learner — signed in, verified,
 * enrolled on nothing — gets null from every entry point.
 *
 * It also covers the two rules that are easy to get backwards:
 *   - a self-paced learner is never locked out (decision 1);
 *   - access survives the cohort ending (decision 3).
 */

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through to process.env */
  }
  return { ...process.env, ...env } as Record<string, string>;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const PREFIX = "zz-test-6-3";

let anon: SupabaseClient;
let admin: SupabaseClient;

const ids = {
  course: "",
  cohortPaced: "",
  selfPaced: "",
  pastCohort: "",
  openModule: "",
  lockedModule: "",
  openLesson: "",
  lockedLesson: "",
  material: "",
  materialPath: "",
  enrolledLearner: "",
  strangerLearner: "",
  pendingLearner: "",
};

const createdAuthUsers: string[] = [];

async function makeLearner(tag: string): Promise<string> {
  const email = `${PREFIX}-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Test-${Math.random().toString(36).slice(2)}-9aB!`,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(`create user failed: ${error?.message}`);
  createdAuthUsers.push(data.user.id);

  const { error: rowError } = await admin.from("learners").insert({
    id: data.user.id,
    email,
    full_name: `Test ${tag}`,
    verified_at: new Date().toISOString(),
  } as never);
  if (rowError) throw new Error(`learner row failed: ${rowError.message}`);
  return data.user.id;
}

async function cleanup() {
  if (!admin) return;
  const { data: objects } = await admin.storage
    .from("course-materials")
    .list(PREFIX);
  if (objects?.length) {
    await admin.storage
      .from("course-materials")
      .remove(objects.map((o) => `${PREFIX}/${o.name}`));
  }
  await admin.from("lesson_materials").delete().like("title", `${PREFIX}%`);
  await admin.from("lessons").delete().like("title", `${PREFIX}%`);
  await admin.from("modules").delete().like("title", `${PREFIX}%`);
  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id")
    .like("slug", `${PREFIX}%`);
  const cohortIds = (cohorts ?? []).map((c) => (c as { id: string }).id);
  if (cohortIds.length)
    await admin.from("enrolments").delete().in("cohort_id", cohortIds);
  await admin.from("cohorts").delete().like("slug", `${PREFIX}%`);
  await admin.from("courses").delete().like("slug", `${PREFIX}%`);
  await admin.from("learners").delete().like("email", `${PREFIX}%`);
  for (const id of createdAuthUsers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  createdAuthUsers.length = 0;
}

beforeAll(async () => {
  if (!URL || !ANON || !SERVICE)
    throw new Error("Missing Supabase env for the curriculum suite.");
  anon = createClient(URL, ANON, { auth: { persistSession: false } });
  admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await cleanup();

  const { data: course, error: courseError } = await admin
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
  if (courseError) throw new Error(`course: ${courseError.message}`);
  ids.course = (course as { id: string }).id;

  const cohortRows = [
    { slug: `${PREFIX}-cohort-paced`, pacing: "cohort_paced", key: "cohortPaced" },
    { slug: `${PREFIX}-self-paced`, pacing: "self_paced", key: "selfPaced" },
    {
      slug: `${PREFIX}-past`,
      pacing: "cohort_paced",
      key: "pastCohort",
      starts_on: "2020-01-01",
      ends_on: "2020-02-01",
    },
  ] as const;

  for (const row of cohortRows) {
    const { data, error } = await admin
      .from("cohorts")
      .insert({
        course_id: ids.course,
        label: row.slug,
        slug: row.slug,
        pacing: row.pacing,
        status: "published",
        price_kobo: 0,
        currency: "NGN",
        starts_on: "starts_on" in row ? row.starts_on : null,
        ends_on: "ends_on" in row ? row.ends_on : null,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(`cohort ${row.slug}: ${error.message}`);
    ids[row.key] = (data as { id: string }).id;
  }

  // Module 1 opens immediately; module 2 is locked behind a future date.
  const { data: openModule } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} open module`,
      sort_order: 0,
      release_rule: "immediate",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.openModule = (openModule as { id: string }).id;

  const { data: lockedModule } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} locked module`,
      sort_order: 1,
      release_rule: "on_date",
      release_on: "2099-01-01T00:00:00Z",
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.lockedModule = (lockedModule as { id: string }).id;

  for (const [moduleId, title, key] of [
    [ids.openModule, `${PREFIX} open lesson`, "openLesson"],
    [ids.lockedModule, `${PREFIX} locked lesson`, "lockedLesson"],
  ] as const) {
    const { data, error } = await admin
      .from("lessons")
      .insert({
        module_id: moduleId,
        title,
        status: "published",
        sort_order: 0,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(`lesson ${title}: ${error.message}`);
    ids[key] = (data as { id: string }).id;
  }

  /* A real object, because createSignedUrl() verifies the object exists before
     signing — a row pointing at nothing would fail for the wrong reason and
     the test would prove nothing about authorization. */
  ids.materialPath = `${PREFIX}/reading.txt`;
  const { error: uploadError } = await admin.storage
    .from("course-materials")
    .upload(ids.materialPath, new Uint8Array([116, 101, 115, 116]), {
      contentType: "text/plain",
      upsert: true,
    });
  if (uploadError) throw new Error(`upload: ${uploadError.message}`);

  const { data: material } = await admin
    .from("lesson_materials")
    .insert({
      lesson_id: ids.openLesson,
      storage_path: ids.materialPath,
      file_name: "reading.txt",
      mime_type: "text/plain",
      title: `${PREFIX} reading`,
    } as never)
    .select("id")
    .single();
  ids.material = (material as { id: string }).id;

  ids.enrolledLearner = await makeLearner("enrolled");
  ids.strangerLearner = await makeLearner("stranger");
  ids.pendingLearner = await makeLearner("pending");

  // Active on both live cohorts and the finished one; the stranger on nothing.
  for (const cohortId of [ids.cohortPaced, ids.selfPaced, ids.pastCohort]) {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.enrolledLearner,
      cohort_id: cohortId,
      state: "active",
    } as never);
    if (error) throw new Error(`enrolment: ${error.message}`);
  }

  // A PENDING enrolment: paid nothing, holds no seat, unlocks no lesson.
  const { error: pendingError } = await admin.from("enrolments").insert({
    learner_id: ids.pendingLearner,
    cohort_id: ids.cohortPaced,
    state: "pending",
  } as never);
  if (pendingError) throw new Error(`pending: ${pendingError.message}`);
}, 120_000);

afterAll(cleanup, 120_000);

describe("seed sanity — a zero result would otherwise prove nothing", () => {
  it("created a course, cohorts, modules, lessons and learners", () => {
    for (const [key, value] of Object.entries(ids)) {
      expect(value, `${key} was not seeded`).toBeTruthy();
    }
  });
});

describe("anon gets nothing from the curriculum tables", () => {
  for (const table of ["modules", "lessons", "lesson_materials", "enrolments"]) {
    it(`anon reads zero rows from ${table}`, async () => {
      const { data } = await anon.from(table).select("*").limit(5);
      expect(data ?? []).toHaveLength(0);
    });

    it(`anon cannot insert into ${table}`, async () => {
      const { error } = await anon.from(table).insert({} as never);
      expect(error).not.toBeNull();
    });
  }

  it("the rows really are there on the service role", async () => {
    // Proves the assertions above are about RLS, not an empty table.
    const { count } = await admin
      .from("modules")
      .select("id", { count: "exact", head: true })
      .like("title", `${PREFIX}%`);
    expect(count).toBe(2);
  });
});

describe("getCurriculumForLearner — the enrolment gate", () => {
  it("returns null for a learner enrolled on nothing", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const result = await getCurriculumForLearner(ids.strangerLearner, {
      id: ids.cohortPaced,
      course_id: ids.course,
      pacing: "cohort_paced",
    });
    expect(result).toBeNull();
  });

  it("returns null for a PENDING enrolment — unpaid unlocks nothing", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const result = await getCurriculumForLearner(ids.pendingLearner, {
      id: ids.cohortPaced,
      course_id: ids.course,
      pacing: "cohort_paced",
    });
    expect(result).toBeNull();
  });

  it("returns the curriculum for an active enrolment", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const result = await getCurriculumForLearner(ids.enrolledLearner, {
      id: ids.cohortPaced,
      course_id: ids.course,
      pacing: "cohort_paced",
    });
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  it("still returns the curriculum after the cohort has finished (decision 3)", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const result = await getCurriculumForLearner(ids.enrolledLearner, {
      id: ids.pastCohort,
      course_id: ids.course,
      pacing: "cohort_paced",
    });
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });
});

describe("drip release through the real query", () => {
  it("withholds a locked module's lessons entirely, not just visually", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const modules = await getCurriculumForLearner(ids.enrolledLearner, {
      id: ids.cohortPaced,
      course_id: ids.course,
      pacing: "cohort_paced",
    });
    const locked = modules!.find((m) => m.id === ids.lockedModule)!;
    expect(locked.released).toBe(false);
    expect(locked.lessons).toHaveLength(0);
    expect(locked.lockedReason).toBeTruthy();

    const open = modules!.find((m) => m.id === ids.openModule)!;
    expect(open.released).toBe(true);
    expect(open.lessons).toHaveLength(1);
  });

  it("opens every module for a self-paced learner (decision 1)", async () => {
    const { getCurriculumForLearner } = await import("@/lib/academy/curriculum");
    const modules = await getCurriculumForLearner(ids.enrolledLearner, {
      id: ids.selfPaced,
      course_id: ids.course,
      pacing: "self_paced",
    });
    expect(modules!.every((m) => m.released)).toBe(true);
    expect(modules!.every((m) => m.lessons.length === 1)).toBe(true);
  });
});

describe("getLessonForLearner — a guessable URL is not a way in", () => {
  const cohortPaced = () => ({
    id: ids.cohortPaced,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("refuses a stranger the open lesson", async () => {
    const { getLessonForLearner } = await import("@/lib/academy/curriculum");
    expect(
      await getLessonForLearner(ids.strangerLearner, cohortPaced(), ids.openLesson),
    ).toBeNull();
  });

  it("refuses an enrolled learner a lesson inside a LOCKED module", async () => {
    const { getLessonForLearner } = await import("@/lib/academy/curriculum");
    expect(
      await getLessonForLearner(
        ids.enrolledLearner,
        cohortPaced(),
        ids.lockedLesson,
      ),
    ).toBeNull();
  });

  it("gives an enrolled learner the open lesson and its materials", async () => {
    const { getLessonForLearner } = await import("@/lib/academy/curriculum");
    const result = await getLessonForLearner(
      ids.enrolledLearner,
      cohortPaced(),
      ids.openLesson,
    );
    expect(result).not.toBeNull();
    expect(result!.materials).toHaveLength(1);
  });

  it("gives a SELF-PACED learner the otherwise-locked lesson", async () => {
    const { getLessonForLearner } = await import("@/lib/academy/curriculum");
    const result = await getLessonForLearner(
      ids.enrolledLearner,
      { id: ids.selfPaced, course_id: ids.course, pacing: "self_paced" },
      ids.lockedLesson,
    );
    expect(result).not.toBeNull();
  });
});

describe("getMaterialUrl — signed URLs are not handed out freely", () => {
  const cohortPaced = () => ({
    id: ids.cohortPaced,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("refuses a stranger", async () => {
    const { getMaterialUrl } = await import("@/lib/academy/curriculum");
    expect(
      await getMaterialUrl(ids.strangerLearner, cohortPaced(), ids.material),
    ).toBeNull();
  });

  it("refuses a pending enrolment", async () => {
    const { getMaterialUrl } = await import("@/lib/academy/curriculum");
    expect(
      await getMaterialUrl(ids.pendingLearner, cohortPaced(), ids.material),
    ).toBeNull();
  });

  it("refuses an unknown material id without leaking whether it exists", async () => {
    const { getMaterialUrl } = await import("@/lib/academy/curriculum");
    expect(
      await getMaterialUrl(
        ids.enrolledLearner,
        cohortPaced(),
        "00000000-0000-0000-0000-000000000000",
      ),
    ).toBeNull();
  });

  it("issues a signed URL to an enrolled learner", async () => {
    const { getMaterialUrl } = await import("@/lib/academy/curriculum");
    const url = await getMaterialUrl(
      ids.enrolledLearner,
      cohortPaced(),
      ids.material,
    );
    expect(url).toBeTruthy();
    expect(url).toContain("token=");
  });
});

describe("locked vs missing — 403 explains, 404 says nothing", () => {
  const cohortPaced = () => ({
    id: ids.cohortPaced,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("tells an ENROLLED learner why a locked lesson is closed", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    const reason = await lockedLessonReason(
      ids.enrolledLearner,
      cohortPaced(),
      ids.lockedLesson,
    );
    expect(reason).toBeTruthy();
    expect(reason).toContain("opens on");
  });

  it("tells a STRANGER nothing — no enrolment, no explanation", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    expect(
      await lockedLessonReason(
        ids.strangerLearner,
        cohortPaced(),
        ids.lockedLesson,
      ),
    ).toBeNull();
  });

  it("tells a PENDING enrolment nothing either", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    expect(
      await lockedLessonReason(
        ids.pendingLearner,
        cohortPaced(),
        ids.lockedLesson,
      ),
    ).toBeNull();
  });

  it("gives no reason for a lesson that is simply open", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    expect(
      await lockedLessonReason(
        ids.enrolledLearner,
        cohortPaced(),
        ids.openLesson,
      ),
    ).toBeNull();
  });

  it("gives no reason in a self-paced cohort — nothing is ever locked", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    expect(
      await lockedLessonReason(
        ids.enrolledLearner,
        { id: ids.selfPaced, course_id: ids.course, pacing: "self_paced" },
        ids.lockedLesson,
      ),
    ).toBeNull();
  });

  it("gives no reason for an unknown lesson id", async () => {
    const { lockedLessonReason } = await import("@/lib/academy/curriculum");
    expect(
      await lockedLessonReason(
        ids.enrolledLearner,
        cohortPaced(),
        "00000000-0000-0000-0000-000000000000",
      ),
    ).toBeNull();
  });
});

describe("getMaterial — the three-way result", () => {
  const cohortPaced = () => ({
    id: ids.cohortPaced,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("returns notfound for a stranger, never locked", async () => {
    const { getMaterial } = await import("@/lib/academy/curriculum");
    const result = await getMaterial(
      ids.strangerLearner,
      cohortPaced(),
      ids.material,
    );
    expect(result.status).toBe("notfound");
  });

  it("returns notfound for a pending enrolment", async () => {
    const { getMaterial } = await import("@/lib/academy/curriculum");
    expect(
      (await getMaterial(ids.pendingLearner, cohortPaced(), ids.material))
        .status,
    ).toBe("notfound");
  });

  it("returns notfound for an unknown material id", async () => {
    const { getMaterial } = await import("@/lib/academy/curriculum");
    expect(
      (
        await getMaterial(
          ids.enrolledLearner,
          cohortPaced(),
          "00000000-0000-0000-0000-000000000000",
        )
      ).status,
    ).toBe("notfound");
  });

  it("returns ok with a signed URL for an enrolled learner", async () => {
    const { getMaterial } = await import("@/lib/academy/curriculum");
    const result = await getMaterial(
      ids.enrolledLearner,
      cohortPaced(),
      ids.material,
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.url).toContain("token=");
  });

  it("returns locked, with a reason, for a material inside a locked module", async () => {
    /* Attach a material to the LOCKED lesson so the locked branch is exercised
       against a real row rather than assumed. */
    const { data } = await admin
      .from("lesson_materials")
      .insert({
        lesson_id: ids.lockedLesson,
        storage_path: `${PREFIX}/locked.txt`,
        file_name: "locked.txt",
        mime_type: "text/plain",
        title: `${PREFIX} locked reading`,
      } as never)
      .select("id")
      .single();
    const lockedMaterialId = (data as { id: string }).id;

    const { getMaterial } = await import("@/lib/academy/curriculum");
    const result = await getMaterial(
      ids.enrolledLearner,
      cohortPaced(),
      lockedMaterialId,
    );
    expect(result.status).toBe("locked");
    if (result.status === "locked") {
      expect(result.reason).toContain("opens on");
      expect(result.reason).not.toContain("[");
    }

    // ...and a stranger asking for the SAME id still gets nothing.
    const stranger = await getMaterial(
      ids.strangerLearner,
      cohortPaced(),
      lockedMaterialId,
    );
    expect(stranger.status).toBe("notfound");
  });
});

describe("the course-materials bucket is private", () => {
  it("is not listed as public", async () => {
    const { data } = await admin.storage.listBuckets();
    const bucket = (data ?? []).find((b) => b.name === "course-materials");
    expect(bucket).toBeTruthy();
    expect(bucket!.public).toBe(false);
  });

  it("anon cannot list its objects", async () => {
    const { data, error } = await anon.storage.from("course-materials").list();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

describe("database-level integrity", () => {
  it("refuses a module with two parents", async () => {
    const { error } = await admin.from("modules").insert({
      course_id: ids.course,
      cohort_id: ids.cohortPaced,
      title: `${PREFIX} two parents`,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses a module with no parent", async () => {
    const { error } = await admin
      .from("modules")
      .insert({ title: `${PREFIX} orphan` } as never);
    expect(error).not.toBeNull();
  });

  it("refuses an on_date module with no date", async () => {
    const { error } = await admin.from("modules").insert({
      course_id: ids.course,
      title: `${PREFIX} dateless`,
      release_rule: "on_date",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses a second enrolment for the same learner and cohort", async () => {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.enrolledLearner,
      cohort_id: ids.cohortPaced,
      state: "active",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses to delete a module that still has lessons (ON DELETE RESTRICT)", async () => {
    const { error } = await admin
      .from("modules")
      .delete()
      .eq("id", ids.openModule);
    expect(error).not.toBeNull();
    expect((error as { code?: string })?.code).toBe("23503");
  });

  it("refuses to delete a cohort that has enrolments", async () => {
    const { error } = await admin
      .from("cohorts")
      .delete()
      .eq("id", ids.cohortPaced);
    expect(error).not.toBeNull();
  });
});
