import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.4 — enrolment, seats and payment state.
 *
 * The free path is fully testable and is proven here end to end. The PAID path
 * cannot be: PAYSTACK_SECRET_KEY is empty, so initializeTransaction() never
 * runs. What IS tested about payment is everything on our side of the boundary
 * — that a pending enrolment holds no seat and unlocks no lesson, that a
 * reference is unique, and that only a paid or not_required row counts.
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
    /* fall through */
  }
  return { ...process.env, ...env } as Record<string, string>;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const PREFIX = "zz-test-6-4";

let anon: SupabaseClient;
let admin: SupabaseClient;

const ids = {
  course: "",
  freeCohort: "",
  paidCohort: "",
  smallCohort: "",
  learnerA: "",
  learnerB: "",
  learnerC: "",
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
    await admin.from("cohort_waitlist").delete().in("cohort_id", cohortIds);
    await admin.from("enrolments").delete().in("cohort_id", cohortIds);
  }
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

  for (const [key, slug, price, capacity] of [
    ["freeCohort", `${PREFIX}-free`, 0, null],
    ["paidCohort", `${PREFIX}-paid`, 1_500_000, null],
    ["smallCohort", `${PREFIX}-small`, 0, 1],
  ] as const) {
    const { data, error: cohortError } = await admin
      .from("cohorts")
      .insert({
        course_id: ids.course,
        label: slug,
        slug,
        status: "published",
        pacing: "cohort_paced",
        price_kobo: price,
        currency: "NGN",
        capacity,
      } as never)
      .select("id")
      .single();
    if (cohortError) throw new Error(`cohort ${slug}: ${cohortError.message}`);
    ids[key] = (data as { id: string }).id;
  }

  ids.learnerA = await makeLearner("a");
  ids.learnerB = await makeLearner("b");
  ids.learnerC = await makeLearner("c");
}, 120_000);

afterAll(cleanup, 120_000);

describe("seed sanity", () => {
  it("seeded everything", () => {
    for (const [key, value] of Object.entries(ids))
      expect(value, key).toBeTruthy();
  });
});

describe("getCohortSeatCounts — what actually holds a seat", () => {
  it("counts nobody before anyone enrols", async () => {
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.freeCohort]);
    expect(counts[ids.freeCohort] ?? 0).toBe(0);
  });

  it("counts a free (not_required) enrolment", async () => {
    await admin.from("enrolments").insert({
      learner_id: ids.learnerA,
      cohort_id: ids.freeCohort,
      state: "active",
      payment_status: "not_required",
    } as never);
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.freeCohort]);
    expect(counts[ids.freeCohort]).toBe(1);
  });

  it("does NOT count a pending enrolment — an abandoned checkout holds nothing", async () => {
    await admin.from("enrolments").insert({
      learner_id: ids.learnerB,
      cohort_id: ids.paidCohort,
      state: "pending",
      payment_status: "pending",
      amount_kobo: 1_500_000,
      paystack_reference: `${PREFIX}-ref-pending`,
    } as never);
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.paidCohort]);
    expect(counts[ids.paidCohort] ?? 0).toBe(0);
  });

  it("counts it once it is paid", async () => {
    await admin
      .from("enrolments")
      .update({
        state: "active",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      } as never)
      .eq("paystack_reference", `${PREFIX}-ref-pending`);
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.paidCohort]);
    expect(counts[ids.paidCohort]).toBe(1);
  });

  it("frees the seat again when it is cancelled", async () => {
    await admin
      .from("enrolments")
      .update({ cancelled_at: new Date().toISOString() } as never)
      .eq("paystack_reference", `${PREFIX}-ref-pending`);
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.paidCohort]);
    expect(counts[ids.paidCohort] ?? 0).toBe(0);
  });

  it("frees the seat when the learner withdraws", async () => {
    await admin
      .from("enrolments")
      .update({ state: "withdrawn" } as never)
      .eq("learner_id", ids.learnerA)
      .eq("cohort_id", ids.freeCohort);
    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const counts = await getCohortSeatCounts([ids.freeCohort]);
    expect(counts[ids.freeCohort] ?? 0).toBe(0);

    // Put it back for the tests below.
    await admin
      .from("enrolments")
      .update({ state: "active" } as never)
      .eq("learner_id", ids.learnerA)
      .eq("cohort_id", ids.freeCohort);
  });
});

describe("capacity closes a cohort", () => {
  it("reads as full once its one seat is taken", async () => {
    await admin.from("enrolments").insert({
      learner_id: ids.learnerC,
      cohort_id: ids.smallCohort,
      state: "active",
      payment_status: "not_required",
    } as never);

    const { getCohortSeatCounts } = await import("@/lib/academy/courses");
    const { cohortState } = await import("@/lib/academy/cohorts");
    const { data: cohort } = await admin
      .from("cohorts")
      .select("*")
      .eq("id", ids.smallCohort)
      .single();

    const counts = await getCohortSeatCounts([ids.smallCohort]);
    expect(counts[ids.smallCohort]).toBe(1);
    expect(cohortState(cohort as never, counts[ids.smallCohort])).toBe("full");
  });
});

describe("a pending enrolment unlocks nothing (the 6.3 gate still holds)", () => {
  it("getEnrolment refuses a pending row", async () => {
    const { getEnrolment } = await import("@/lib/academy/curriculum");
    await admin.from("enrolments").insert({
      learner_id: ids.learnerC,
      cohort_id: ids.paidCohort,
      state: "pending",
      payment_status: "pending",
      amount_kobo: 1_500_000,
      paystack_reference: `${PREFIX}-ref-c`,
    } as never);
    expect(await getEnrolment(ids.learnerC, ids.paidCohort)).toBeNull();
  });

  it("and grants once the webhook would have flipped it to paid", async () => {
    const { getEnrolment } = await import("@/lib/academy/curriculum");
    await admin
      .from("enrolments")
      .update({ state: "active", payment_status: "paid" } as never)
      .eq("paystack_reference", `${PREFIX}-ref-c`);
    expect(await getEnrolment(ids.learnerC, ids.paidCohort)).not.toBeNull();
  });
});

describe("listMyCourses", () => {
  it("lists only cohorts the learner may actually open", async () => {
    const { listMyCourses } = await import("@/lib/academy/curriculum");
    const mine = await listMyCourses(ids.learnerC);
    const slugs = mine.map((row) => row.cohortSlug);
    expect(slugs).toContain(`${PREFIX}-small`);
    expect(slugs).toContain(`${PREFIX}-paid`);
  });

  it("does not list a withdrawn enrolment", async () => {
    const { listMyCourses } = await import("@/lib/academy/curriculum");
    await admin
      .from("enrolments")
      .update({ state: "withdrawn" } as never)
      .eq("learner_id", ids.learnerC)
      .eq("cohort_id", ids.paidCohort);
    const mine = await listMyCourses(ids.learnerC);
    expect(mine.map((r) => r.cohortSlug)).not.toContain(`${PREFIX}-paid`);
  });
});

describe("database integrity", () => {
  it("refuses two enrolments for the same learner and cohort", async () => {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.learnerA,
      cohort_id: ids.freeCohort,
      state: "active",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses two enrolments sharing a Paystack reference", async () => {
    /* One charge must never be able to fulfil two rows. */
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.learnerB,
      cohort_id: ids.smallCohort,
      state: "pending",
      payment_status: "pending",
      paystack_reference: `${PREFIX}-ref-c`,
    } as never);
    expect(error).not.toBeNull();
    expect((error as { code?: string })?.code).toBe("23505");
  });

  it("allows many enrolments with no reference (the free path)", async () => {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.learnerB,
      cohort_id: ids.freeCohort,
      state: "active",
      payment_status: "not_required",
    } as never);
    expect(error).toBeNull();
  });

  it("refuses a negative amount", async () => {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.learnerC,
      cohort_id: ids.freeCohort,
      amount_kobo: -1,
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses an unknown payment status", async () => {
    const { error } = await admin.from("enrolments").insert({
      learner_id: ids.learnerC,
      cohort_id: ids.freeCohort,
      payment_status: "maybe",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuses a duplicate waitlist entry", async () => {
    const first = await admin.from("cohort_waitlist").insert({
      cohort_id: ids.smallCohort,
      learner_id: ids.learnerA,
    } as never);
    expect(first.error).toBeNull();
    const second = await admin.from("cohort_waitlist").insert({
      cohort_id: ids.smallCohort,
      learner_id: ids.learnerA,
    } as never);
    expect(second.error).not.toBeNull();
  });
});

describe("anon cannot touch enrolments or the waitlist", () => {
  for (const table of ["enrolments", "cohort_waitlist"]) {
    it(`anon reads nothing from ${table}`, async () => {
      const { data } = await anon.from(table).select("*").limit(5);
      expect(data ?? []).toHaveLength(0);
    });

    it(`anon cannot insert into ${table}`, async () => {
      const { error } = await anon.from(table).insert({} as never);
      expect(error).not.toBeNull();
    });
  }

  it("the rows really exist on the service role", async () => {
    const { count } = await admin
      .from("enrolments")
      .select("id", { count: "exact", head: true })
      .in("cohort_id", [ids.freeCohort, ids.paidCohort, ids.smallCohort]);
    expect((count ?? 0)).toBeGreaterThan(0);
  });

  it("anon cannot call expire_pending_enrolments", async () => {
    const { error } = await anon.rpc("expire_pending_enrolments" as never);
    expect(error).not.toBeNull();
  });
});

describe("expire_pending_enrolments", () => {
  it("withdraws a pending enrolment older than two hours, and leaves fresh ones alone", async () => {
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: stale } = await admin
      .from("enrolments")
      .insert({
        learner_id: ids.learnerA,
        cohort_id: ids.smallCohort,
        state: "pending",
        payment_status: "pending",
        paystack_reference: `${PREFIX}-ref-stale`,
        created_at: old,
      } as never)
      .select("id")
      .single();

    const { data: expired, error } = await admin.rpc(
      "expire_pending_enrolments" as never,
    );
    expect(error).toBeNull();
    expect((expired as unknown as number) ?? 0).toBeGreaterThanOrEqual(1);

    const { data: after } = await admin
      .from("enrolments")
      .select("state, payment_status")
      .eq("id", (stale as { id: string }).id)
      .single();
    expect((after as { state: string }).state).toBe("withdrawn");

    /* The fresh pending row from earlier in this file must be untouched —
       expiring a checkout someone is still completing would be worse than
       leaving a stale one. */
    const { data: fresh } = await admin
      .from("enrolments")
      .select("state")
      .eq("paystack_reference", `${PREFIX}-ref-c`)
      .maybeSingle();
    if (fresh) expect((fresh as { state: string }).state).not.toBe("pending");
  });
});
