import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Sprint 6.7 — issuing, verifying and revoking.
 *
 * §6.7's done-when: completing a course issues a certificate, the verification
 * URL confirms a real one and rejects a forged code. Both are asserted against
 * real rows, plus the case that carries the sprint's honesty — a REVOKED
 * certificate must verify as revoked, never as unknown. */

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

const PREFIX = "zz-test-6-7";
// A name that a standard PDF font cannot encode. See certificate-pdf.ts.
const YORUBA_NAME = "Adébáyọ̀ Ọlámidé";

let anon: SupabaseClient;
let admin: SupabaseClient;

const ids = {
  course: "",
  cohort: "",
  module: "",
  lessonOne: "",
  lessonTwo: "",
  assessment: "",
  learner: "",
  enrolment: "",
};
const authUsers: string[] = [];

async function cleanup() {
  if (!admin) return;
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
    if (enrolIds.length) {
      await admin.from("certificates").delete().in("enrolment_id", enrolIds);
      await admin.from("submissions").delete().in("enrolment_id", enrolIds);
      await admin.from("lesson_progress").delete().in("enrolment_id", enrolIds);
    }
    await admin.from("enrolments").delete().in("cohort_id", cohortIds);
  }
  await admin.from("assessments").delete().like("title", `${PREFIX}%`);
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

  const { data: cohort } = await admin
    .from("cohorts")
    .insert({
      course_id: ids.course,
      label: `${PREFIX} cohort`,
      slug: `${PREFIX}-c`,
      pacing: "cohort_paced",
      status: "published",
      price_kobo: 0,
      currency: "NGN",
      starts_on: "2026-01-05",
      ends_on: "2026-02-16",
    } as never)
    .select("id")
    .single();
  ids.cohort = (cohort as { id: string }).id;

  const { data: mod, error: modError } = await admin
    .from("modules")
    .insert({
      course_id: ids.course,
      title: `${PREFIX} module`,
      release_rule: "immediate",
      status: "published",
    } as never)
    .select("id")
    .single();
  if (modError) throw new Error(`module: ${modError.message}`);
  ids.module = (mod as { id: string }).id;

  for (const [key, title] of [
    ["lessonOne", `${PREFIX} lesson one`],
    ["lessonTwo", `${PREFIX} lesson two`],
  ] as const) {
    const { data } = await admin
      .from("lessons")
      .insert({ module_id: ids.module, title, status: "published" } as never)
      .select("id")
      .single();
    ids[key] = (data as { id: string }).id;
  }

  const { data: assessment } = await admin
    .from("assessments")
    .insert({
      module_id: ids.module,
      kind: "assignment",
      title: `${PREFIX} final assignment`,
      pass_mark: 50,
      status: "published",
    } as never)
    .select("id")
    .single();
  ids.assessment = (assessment as { id: string }).id;

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
    full_name: YORUBA_NAME,
    verified_at: new Date().toISOString(),
  } as never);

  const { data: enrolment } = await admin
    .from("enrolments")
    .insert({
      learner_id: ids.learner,
      cohort_id: ids.cohort,
      state: "active",
      payment_status: "not_required",
      learner_name_at_enrolment: YORUBA_NAME,
      learner_email_at_enrolment: email,
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

describe("eligibility", () => {
  const cohortRef = () => ({
    id: ids.cohort,
    course_id: ids.course,
    pacing: "cohort_paced",
  });

  it("refuses while lessons are outstanding, and counts them", async () => {
    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("2 lessons");
  });

  it("counts only what the learner can actually see right now", async () => {
    /* Found in 6.9 by looking at the rendered page: the sidebar read "3 of 6
       lessons done" while this panel read "11 lessons still to finish". Both
       were correct — six released, fourteen total — and together they made the
       site look like it was contradicting itself.
     *
       The count stays whole-course, so the SENTENCE has to separate work that
       is available now from work still locked behind drip. */
    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toContain("open to you");
      expect(result.reason).not.toMatch(/^There (is|are) \d+ lessons? still/);
    }
  });

  it("still refuses with lessons done but the assignment unpassed", async () => {
    const { markComplete } = await import("@/lib/academy/progress");
    await markComplete(ids.enrolment, ids.lessonOne);
    await markComplete(ids.enrolment, ids.lessonTwo);

    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("final assignment");
  });

  it("does NOT count a failed submission as a pass", async () => {
    await admin.from("submissions").insert({
      assessment_id: ids.assessment,
      enrolment_id: ids.enrolment,
      attempt: 1,
      state: "returned",
      score: 30,
      passed: false,
    } as never);

    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(false);
  });

  it("allows it once everything is done and passed", async () => {
    await admin
      .from("submissions")
      .update({ score: 80, passed: true } as never)
      .eq("enrolment_id", ids.enrolment)
      .eq("assessment_id", ids.assessment);

    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(true);
  });

  it("judges against the WHOLE course, not just what drip has released", async () => {
    /* Regression for a real bug. getCurriculum() withholds lessons from a
       locked module — right for display, wrong for counting. Reading through it
       meant a locked module contributed zero lessons, so this learner (who HAS
       finished everything) was refused with "this course has no lessons yet".
       Eligibility now reads the lessons directly. */
    await admin
      .from("modules")
      .update({
        release_rule: "on_date",
        release_on: "2099-01-01T00:00:00Z",
      } as never)
      .eq("id", ids.module);

    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(ids.enrolment, cohortRef());
    expect(result.eligible).toBe(true);

    await admin
      .from("modules")
      .update({ release_rule: "immediate", release_on: null } as never)
      .eq("id", ids.module);
  });

  it("does not hand a certificate to someone who has done nothing in a locked course", async () => {
    /* The mirror of the case above, and the reason the fix is not simply
       "ignore locked modules". A second learner with no progress must still be
       refused while the course is locked — otherwise drip would become a way to
       qualify by waiting. */
    const email = `${PREFIX}-idle-${Date.now()}@example.com`;
    const { data: user } = await admin.auth.admin.createUser({
      email,
      password: `Test-${Math.random().toString(36).slice(2)}-9aB!`,
      email_confirm: true,
    });
    authUsers.push(user!.user!.id);
    await admin.from("learners").insert({
      id: user!.user!.id,
      email,
      full_name: "Idle learner",
      verified_at: new Date().toISOString(),
    } as never);
    const { data: idleEnrolment } = await admin
      .from("enrolments")
      .insert({
        learner_id: user!.user!.id,
        cohort_id: ids.cohort,
        state: "active",
        payment_status: "not_required",
      } as never)
      .select("id")
      .single();

    await admin
      .from("modules")
      .update({
        release_rule: "on_date",
        release_on: "2099-01-01T00:00:00Z",
      } as never)
      .eq("id", ids.module);

    const { checkEligibility } = await import("@/lib/academy/certificates");
    const result = await checkEligibility(
      (idleEnrolment as { id: string }).id,
      cohortRef(),
    );
    /* The guarantee is REFUSAL — a fully locked course must not hand out a
       certificate to someone who has done nothing. The wording changed in 6.9
       (this learner is told the rest unlocks as they go, rather than being
       given a count of lessons they cannot yet see), so assert the decision and
       the absence of a false promise rather than a particular sentence. */
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason.toLowerCase()).not.toContain("congratulation");
    }

    await admin
      .from("modules")
      .update({ release_rule: "immediate", release_on: null } as never)
      .eq("id", ids.module);
  });
});

describe("issuing", () => {
  it("issues one and freezes the facts", async () => {
    const { issueCertificate } = await import("@/lib/academy/certificates");
    const certificate = await issueCertificate(ids.enrolment, {
      learner_name: YORUBA_NAME,
      course_title: `${PREFIX} course`,
      cohort_label: `${PREFIX} cohort`,
      cohort_dates: "5 January – 16 February 2026",
    });
    expect(certificate).not.toBeNull();
    expect(certificate!.code).toMatch(/^SRN(-[A-Z0-9]{4}){3}$/);
    expect(certificate!.learner_name).toBe(YORUBA_NAME);
  });

  it("is idempotent — a second claim returns the same code", async () => {
    const { issueCertificate, getCertificate } = await import(
      "@/lib/academy/certificates"
    );
    const first = await getCertificate(ids.enrolment);
    const second = await issueCertificate(ids.enrolment, {
      learner_name: "Someone Else",
      course_title: "A different course",
      cohort_label: "Another cohort",
      cohort_dates: null,
    });
    expect(second!.code).toBe(first!.code);
    // And the second call did not overwrite the frozen facts.
    expect(second!.learner_name).toBe(YORUBA_NAME);
  });

  it("keeps the certificate intact when the course is later renamed", async () => {
    const { getCertificate } = await import("@/lib/academy/certificates");
    await admin
      .from("courses")
      .update({ title: `${PREFIX} course RENAMED` } as never)
      .eq("id", ids.course);

    const certificate = await getCertificate(ids.enrolment);
    expect(certificate!.course_title).toBe(`${PREFIX} course`);
  });

  it("refuses a second certificate for one enrolment at the database level", async () => {
    const { error } = await admin.from("certificates").insert({
      enrolment_id: ids.enrolment,
      code: "SRN-ZZZZ-ZZZZ-ZZZZ",
      learner_name: "Duplicate",
      course_title: "Duplicate",
      cohort_label: "Duplicate",
      completed_on: "2026-02-16",
    } as never);
    expect(error).not.toBeNull();
    expect((error as { code?: string })?.code).toBe("23505");
  });
});

describe("verification — §6.7's done-when", () => {
  it("confirms a real code", async () => {
    const { verifyCode, getCertificate } = await import(
      "@/lib/academy/certificates"
    );
    const certificate = await getCertificate(ids.enrolment);
    const result = await verifyCode(certificate!.code);
    expect(result.status).toBe("valid");
    if (result.status === "valid")
      expect(result.certificate.learner_name).toBe(YORUBA_NAME);
  });

  it("confirms it however the checker types it", async () => {
    const { verifyCode, getCertificate } = await import(
      "@/lib/academy/certificates"
    );
    const code = (await getCertificate(ids.enrolment))!.code;
    for (const variant of [
      code.toLowerCase(),
      code.replace(/-/g, ""),
      `  ${code}  `,
    ]) {
      expect((await verifyCode(variant)).status).toBe("valid");
    }
  });

  it("rejects a forged code", async () => {
    const { verifyCode } = await import("@/lib/academy/certificates");
    expect((await verifyCode("SRN-ZZZZ-ZZZZ-ZZZZ")).status).toBe("unknown");
    expect((await verifyCode("not a code")).status).toBe("unknown");
    expect((await verifyCode("")).status).toBe("unknown");
  });

  it("reports a revoked certificate as REVOKED, never as unknown", async () => {
    const { verifyCode, getCertificate } = await import(
      "@/lib/academy/certificates"
    );
    const code = (await getCertificate(ids.enrolment))!.code;

    await admin
      .from("certificates")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: "Issued in error during testing",
      } as never)
      .eq("enrolment_id", ids.enrolment);

    const result = await verifyCode(code);
    expect(result.status).toBe("revoked");
    if (result.status === "revoked") {
      // The checker learns why, not merely that something is wrong.
      expect(result.certificate.revoked_reason).toContain("error");
      expect(result.certificate.learner_name).toBe(YORUBA_NAME);
    }
  });

  it("verifies again once restored", async () => {
    const { verifyCode, getCertificate } = await import(
      "@/lib/academy/certificates"
    );
    const code = (await getCertificate(ids.enrolment))!.code;
    await admin
      .from("certificates")
      .update({ revoked_at: null, revoked_reason: null } as never)
      .eq("enrolment_id", ids.enrolment);
    expect((await verifyCode(code)).status).toBe("valid");
  });
});

describe("the PDF", () => {
  it("renders a Yoruba name without throwing", async () => {
    /* The bug this catches is real and was hit during development: pdf-lib's
       standard fonts are WinAnsi and THROW on "ọ". An embedded font is the
       only reason certificate generation does not crash for a large part of
       SRN's audience. */
    const { buildCertificatePdf } = await import(
      "@/lib/academy/certificate-pdf"
    );
    const { getCertificate } = await import("@/lib/academy/certificates");
    const certificate = await getCertificate(ids.enrolment);

    const bytes = await buildCertificatePdf(
      certificate!,
      `https://example.org/verify/${certificate!.code}`,
    );
    expect(bytes.length).toBeGreaterThan(1000);
    // A real PDF, not an error page or an empty buffer.
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("renders a very long name without throwing", async () => {
    const { buildCertificatePdf } = await import(
      "@/lib/academy/certificate-pdf"
    );
    const { getCertificate } = await import("@/lib/academy/certificates");
    const certificate = await getCertificate(ids.enrolment);

    const bytes = await buildCertificatePdf(
      { ...certificate!, learner_name: "A".repeat(120) },
      "https://example.org/verify/x",
    );
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("renders a revoked certificate too, so a stale printout is not silent", async () => {
    const { buildCertificatePdf } = await import(
      "@/lib/academy/certificate-pdf"
    );
    const { getCertificate } = await import("@/lib/academy/certificates");
    const certificate = await getCertificate(ids.enrolment);

    const bytes = await buildCertificatePdf(
      { ...certificate!, revoked_at: new Date().toISOString() },
      "https://example.org/verify/x",
    );
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("the register is not readable by anon", () => {
  it("anon cannot list certificates", async () => {
    const { data } = await anon.from("certificates").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);

    // The row exists, so this is RLS rather than an empty table.
    const { count } = await admin
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("enrolment_id", ids.enrolment);
    expect(count).toBe(1);
  });

  it("anon cannot write one", async () => {
    const { error } = await anon.from("certificates").insert({} as never);
    expect(error).not.toBeNull();
  });
});
