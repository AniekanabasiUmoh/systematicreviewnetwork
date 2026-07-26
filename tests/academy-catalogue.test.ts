import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.2 — adversarial catalogue visibility.
 *
 * The lesson from 6.1: an empty table returns zero rows whether RLS is working
 * or not, so a test that only counts rows on an empty table proves nothing.
 * This suite therefore SEEDS three courses — published, draft, and archived —
 * and asserts the anon key sees exactly one of the three.
 *
 * It also covers the join that RLS cannot express: a PUBLISHED cohort under a
 * DRAFT course is readable at the row level by design, so the guarantee has to
 * come from the query layer starting at the course. That is asserted directly
 * against getCourse() rather than assumed. */

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

const PREFIX = "zz-test-6-2";
const PUBLISHED = `${PREFIX}-published`;
const DRAFT = `${PREFIX}-draft`;
const ARCHIVED = `${PREFIX}-archived`;

let anon: SupabaseClient;
let admin: SupabaseClient;
const courseIds: string[] = [];

async function seedCourse(
  slug: string,
  patch: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await admin
    .from("courses")
    .insert({
      slug,
      title: `Test course ${slug}`,
      level: "introductory",
      delivery: "online",
      ...patch,
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(`seed ${slug} failed: ${error.message}`);
  const id = (data as { id: string }).id;
  courseIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!URL || !ANON || !SERVICE)
    throw new Error("Missing Supabase env for the catalogue suite.");
  anon = createClient(URL, ANON, { auth: { persistSession: false } });
  admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Clean up anything a previous interrupted run left behind.
  await admin.from("cohorts").delete().like("slug", `${PREFIX}%`);
  await admin.from("courses").delete().like("slug", `${PREFIX}%`);

  const publishedId = await seedCourse(PUBLISHED, { status: "published" });
  const draftId = await seedCourse(DRAFT, { status: "draft" });
  await seedCourse(ARCHIVED, {
    status: "published",
    archived_at: new Date().toISOString(),
  });

  // A published cohort under each, including the draft course. The one under
  // the draft course is the interesting case.
  for (const [courseId, slug] of [
    [publishedId, `${PREFIX}-cohort-visible`],
    [draftId, `${PREFIX}-cohort-hidden-parent`],
  ] as const) {
    const { error } = await admin.from("cohorts").insert({
      course_id: courseId,
      label: `Test cohort ${slug}`,
      slug,
      status: "published",
      pacing: "cohort_paced",
      price_kobo: 0,
      currency: "NGN",
    } as never);
    if (error) throw new Error(`seed cohort failed: ${error.message}`);
  }
}, 60_000);

afterAll(async () => {
  if (!admin) return;
  await admin.from("cohorts").delete().like("slug", `${PREFIX}%`);
  await admin.from("courses").delete().like("slug", `${PREFIX}%`);
}, 60_000);

describe("course visibility to the anon key", () => {
  it("seeded three courses, so a zero-row result would be meaningful", () => {
    expect(courseIds).toHaveLength(3);
  });

  it("anon CAN read the published, non-archived course", async () => {
    const { data, error } = await anon
      .from("courses")
      .select("slug")
      .eq("slug", PUBLISHED)
      .maybeSingle();
    expect(error).toBeNull();
    expect((data as { slug: string } | null)?.slug).toBe(PUBLISHED);
  });

  it("anon canNOT read the draft course", async () => {
    const { data } = await anon
      .from("courses")
      .select("slug")
      .eq("slug", DRAFT)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("anon canNOT read the archived course, even though it is published", async () => {
    const { data } = await anon
      .from("courses")
      .select("slug")
      .eq("slug", ARCHIVED)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("anon sees exactly one of the three seeded courses", async () => {
    const { data } = await anon
      .from("courses")
      .select("slug")
      .like("slug", `${PREFIX}%`);
    expect((data ?? []).map((r) => (r as { slug: string }).slug)).toEqual([
      PUBLISHED,
    ]);
  });

  it("anon cannot write a course by any verb", async () => {
    const insert = await anon
      .from("courses")
      .insert({ slug: `${PREFIX}-attack`, title: "Attack" } as never);
    expect(insert.error).not.toBeNull();

    const update = await anon
      .from("courses")
      .update({ title: "Owned" } as never)
      .eq("slug", PUBLISHED)
      .select("id");
    expect(update.error !== null || (update.data ?? []).length === 0).toBe(true);

    const del = await anon
      .from("courses")
      .delete({ count: "exact" })
      .eq("slug", PUBLISHED);
    expect(del.error !== null || (del.count ?? 0) === 0).toBe(true);
  });

  it("the published course still exists after the write attempts", async () => {
    const { data } = await admin
      .from("courses")
      .select("title")
      .eq("slug", PUBLISHED)
      .maybeSingle();
    expect((data as { title: string } | null)?.title).toBe(
      `Test course ${PUBLISHED}`,
    );
  });
});

describe("cohorts under an unpublished course", () => {
  it("the row-level policy alone does let the cohort through", async () => {
    /* Documents the real posture rather than pretending otherwise: RLS cannot
       cheaply express "my parent is published", so this row IS readable at the
       row level. The guarantee comes from the query layer below. */
    const { data } = await anon
      .from("cohorts")
      .select("slug")
      .eq("slug", `${PREFIX}-cohort-hidden-parent`)
      .maybeSingle();
    expect((data as { slug: string } | null)?.slug).toBe(
      `${PREFIX}-cohort-hidden-parent`,
    );
  });

  it("getCourse() returns null for the draft course, so there is no route to it", async () => {
    const { getCourse } = await import("@/lib/academy/courses");
    expect(await getCourse(DRAFT)).toBeNull();
    expect(await getCourse(ARCHIVED)).toBeNull();
  });

  it("getCourse() returns the published course with its cohort", async () => {
    const { getCourse } = await import("@/lib/academy/courses");
    const course = await getCourse(PUBLISHED);
    expect(course).not.toBeNull();
    expect(course!.cohorts.map((c) => c.slug)).toEqual([
      `${PREFIX}-cohort-visible`,
    ]);
  });

  it("getCohort() refuses a cohort whose course is not published", async () => {
    const { getCohort } = await import("@/lib/academy/courses");
    expect(await getCohort(DRAFT, `${PREFIX}-cohort-hidden-parent`)).toBeNull();
    // And refuses a real cohort slug against the wrong course.
    expect(
      await getCohort(PUBLISHED, `${PREFIX}-cohort-hidden-parent`),
    ).toBeNull();
  });

  it("getCourseSlugs() lists only the published course", async () => {
    const { getCourseSlugs } = await import("@/lib/academy/courses");
    const slugs = await getCourseSlugs();
    expect(slugs).toContain(PUBLISHED);
    expect(slugs).not.toContain(DRAFT);
    expect(slugs).not.toContain(ARCHIVED);
  });
});

describe("database-level integrity", () => {
  it("refuses a cohort whose end date precedes its start", async () => {
    const { error } = await admin.from("cohorts").insert({
      course_id: courseIds[0],
      label: "Backwards",
      slug: `${PREFIX}-backwards`,
      starts_on: "2026-04-01",
      ends_on: "2026-03-01",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses a negative price", async () => {
    const { error } = await admin.from("cohorts").insert({
      course_id: courseIds[0],
      label: "Negative",
      slug: `${PREFIX}-negative`,
      price_kobo: -100,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses an unknown pacing value", async () => {
    const { error } = await admin.from("cohorts").insert({
      course_id: courseIds[0],
      label: "Whenever",
      slug: `${PREFIX}-whenever`,
      pacing: "whenever",
    } as never);
    expect(error).not.toBeNull();
  });

  it("allows the same cohort slug under two different courses", async () => {
    const shared = `${PREFIX}-shared-slug`;
    const first = await admin.from("cohorts").insert({
      course_id: courseIds[0],
      label: "Shared A",
      slug: shared,
    } as never);
    const second = await admin.from("cohorts").insert({
      course_id: courseIds[1],
      label: "Shared B",
      slug: shared,
    } as never);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
  });

  it("refuses a duplicate cohort slug within one course", async () => {
    const { error } = await admin.from("cohorts").insert({
      course_id: courseIds[0],
      label: "Shared A again",
      slug: `${PREFIX}-shared-slug`,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses to delete a course that has cohorts (ON DELETE RESTRICT)", async () => {
    const { error } = await admin
      .from("courses")
      .delete()
      .eq("id", courseIds[0]);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });
});
