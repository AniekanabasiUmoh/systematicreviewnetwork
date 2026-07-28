import "server-only";

import { randomInt } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getCurriculum } from "@/lib/academy/curriculum";
import { getCompletedLessonIds } from "@/lib/academy/progress";
import type { CertificatesRow } from "@/lib/database.types";

/* Sprint 6.7 — certificates.
 *
 * The credential is only worth something if an employer can check it, so the
 * verification code carries the weight of this sprint.
 *
 * ALPHABET: no 0/O, no 1/I/L. A code gets read off a printed PDF and typed in
 * by someone who did not create it; ambiguous glyphs turn a genuine
 * certificate into a failed check, which is the worst outcome this feature has.
 *
 * LENGTH: 12 characters over 31 symbols is ~59 bits. Guessing one is not the
 * threat — harvesting is. At that size, an attacker enumerating a million codes
 * a second still expects to wait longer than the organisation will exist.
 *
 * SOURCE: node:crypto randomInt, not Math.random. A predictable code is a
 * forgeable credential, and Math.random is predictable by construction. */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;
const GROUP = 4;

export type Certificate = CertificatesRow;

/** A grouped, human-transcribable code: SRN-XXXX-XXXX-XXXX. */
export function generateCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += GROUP) {
    groups.push(raw.slice(i, i + GROUP));
  }
  return `SRN-${groups.join("-")}`;
}

/**
 * Normalises what a visitor typed.
 *
 * People paste with stray spaces, type in lower case, and drop or add hyphens.
 * All of those are the same code, and refusing them would fail genuine
 * certificates for no security gain — the entropy is in the characters, not
 * their punctuation.
 */
export function normaliseCode(input: string): string {
  const bare = (input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^SRN/, "");
  if (bare.length !== CODE_LENGTH) return "";
  const groups: string[] = [];
  for (let i = 0; i < bare.length; i += GROUP) {
    groups.push(bare.slice(i, i + GROUP));
  }
  return `SRN-${groups.join("-")}`;
}

export type VerifyResult =
  | { status: "valid"; certificate: Certificate }
  | { status: "revoked"; certificate: Certificate }
  | { status: "unknown" };

/**
 * Check a code.
 *
 * A revoked certificate reports REVOKED, not unknown. An employer holding a
 * withdrawn credential deserves to be told it was withdrawn — collapsing that
 * into "no such certificate" would make a real award look like a forgery and
 * would hide the fact that SRN issued and then withdrew it.
 */
export async function verifyCode(input: string): Promise<VerifyResult> {
  const code = normaliseCode(input);
  if (!code) return { status: "unknown" };

  const { data } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!data) return { status: "unknown" };
  const certificate = data as Certificate;
  return certificate.revoked_at
    ? { status: "revoked", certificate }
    : { status: "valid", certificate };
}

export type Eligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * Has this enrolment earned a certificate?
 *
 * Two conditions, both plain: every published lesson finished, and every
 * published assessment passed. Assessments with no attempt count as not passed
 * — silence is not a pass.
 */
export async function checkEligibility(
  enrolmentId: string,
  cohort: { id: string; course_id: string; pacing: string },
): Promise<Eligibility> {
  const completed = await getCompletedLessonIds(enrolmentId);

  /* Eligibility is judged against the WHOLE course, so the lessons are read
     DIRECTLY rather than through getCurriculum().

     getCurriculum() deliberately returns an empty `lessons` array for a locked
     module — withholding titles from the browser is the whole point of drip.
     Counting through it would therefore mean a locked module contributes zero
     lessons, so a learner on day one of a dripped course would look "finished",
     and a course still fully locked would fall through to "no lessons yet" and
     refuse a certificate to someone who had in fact completed everything. Both
     failures were caught by the test below. */
  const modules = await getCurriculum(cohort, completed);
  const moduleIdList = modules.map((m) => m.id);

  const { data: allLessons } = moduleIdList.length
    ? await supabaseAdmin
        .from("lessons")
        .select("id")
        .in("module_id", moduleIdList)
        .eq("status", "published")
        .is("archived_at", null)
    : { data: [] };

  const lessons = (allLessons ?? []).map((row) => row.id);

  const outstanding = lessons.filter((id) => !completed.has(id));
  if (outstanding.length > 0) {
    /* Distinguish work AVAILABLE now from work still locked behind drip.
     *
     * Found in 6.9 by looking at the rendered page: the sidebar read "3 of 6
     * lessons done" while this panel read "11 lessons still to finish". Both
     * were correct — six released, fourteen in total — and together they made
     * the site look like it was contradicting itself. The count has to stay
     * whole-course, so the SENTENCE is what changes. */
    const released = new Set(
      modules.filter((m) => m.released).flatMap((m) => m.lessons.map((l) => l.id)),
    );
    const availableNow = outstanding.filter((id) => released.has(id)).length;
    const locked = outstanding.length - availableNow;

    if (availableNow === 0 && locked > 0) {
      return {
        eligible: false,
        reason:
          "You have finished everything that is open so far. The rest of the course unlocks as you go.",
      };
    }

    const head =
      availableNow === 1
        ? "There is one lesson left in the part of the course open to you"
        : `There are ${availableNow} lessons left in the part of the course open to you`;

    return {
      eligible: false,
      reason:
        locked > 0
          ? `${head}, and ${locked} more that unlock later.`
          : `${head}.`,
    };
  }

  if (moduleIdList.length > 0) {
    const { data: assessments } = await supabaseAdmin
      .from("assessments")
      .select("id, title")
      .in("module_id", moduleIdList)
      .eq("status", "published")
      .is("archived_at", null);

    const required = (assessments ?? []) as Array<{ id: string; title: string }>;
    if (required.length > 0) {
      const { data: passes } = await supabaseAdmin
        .from("submissions")
        .select("assessment_id")
        .eq("enrolment_id", enrolmentId)
        .eq("passed", true);

      const passed = new Set(
        (passes ?? []).map((row) => row.assessment_id),
      );
      const missing = required.filter((row) => !passed.has(row.id));
      if (missing.length > 0) {
        return {
          eligible: false,
          reason:
            missing.length === 1
              ? `You still need to pass ${missing[0].title}.`
              : `There are ${missing.length} assessments still to pass.`,
        };
      }
    }
  }

  if (lessons.length === 0) {
    return {
      eligible: false,
      reason: "This course has no lessons yet, so there is nothing to certify.",
    };
  }

  return { eligible: true };
}

/** The certificate for an enrolment, if one has been issued. */
export async function getCertificate(
  enrolmentId: string,
): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("enrolment_id", enrolmentId)
    .maybeSingle();
  return (data as Certificate) ?? null;
}

/**
 * Issue one, or return the existing one.
 *
 * Idempotent on purpose: a learner clicking twice, or a background job running
 * twice, must not mint a second code for the same enrolment. The unique index
 * is the backstop; this is the version that does not surface an error.
 */
export async function issueCertificate(
  enrolmentId: string,
  facts: {
    learner_name: string;
    course_title: string;
    cohort_label: string;
    cohort_dates: string | null;
  },
): Promise<Certificate | null> {
  const existing = await getCertificate(enrolmentId);
  if (existing) return existing;

  /* Retry on the vanishingly unlikely collision rather than failing the
     learner. Three attempts is far more than the odds require. */
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("certificates")
      .insert({
        enrolment_id: enrolmentId,
        code: generateCode(),
        learner_name: facts.learner_name,
        course_title: facts.course_title,
        cohort_label: facts.cohort_label,
        cohort_dates: facts.cohort_dates,
        completed_on: new Date().toISOString().slice(0, 10),
      } as never)
      .select("*")
      .single();

    if (!error) return data as Certificate;

    // 23505 on enrolment_id means a concurrent request won; return theirs.
    if ((error as { code?: string }).code === "23505") {
      const raced = await getCertificate(enrolmentId);
      if (raced) return raced;
      continue;
    }

    console.error("[certificates] issue failed:", error.message);
    return null;
  }

  return null;
}
