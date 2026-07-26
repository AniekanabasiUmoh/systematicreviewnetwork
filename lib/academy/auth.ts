import "server-only";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";

/* Learner identity (Design.md §9 Sprint 6.1).
 *
 * The public-side counterpart to lib/admin/auth.ts, deliberately kept as a
 * SEPARATE module rather than a mode on the staff one. They answer different
 * questions about different tables, and merging them would mean one function
 * where a bug leaks staff privileges to a learner or vice versa.
 *
 * The same rule as the staff module applies and is the reason both exist:
 * identity comes from the JWT-verified session, but everything that grants
 * access is read on the SERVICE ROLE client using that verified id. A role or
 * a verified flag is never taken from a cookie, a token claim, or the client.
 *
 * The distinction that carries this whole phase (Phase 6 decision 5):
 *
 *   getLearner()          — someone signed in with a learner row. May be
 *                           UNVERIFIED, i.e. an address that was typed into
 *                           the public event form and never proven.
 *   requireVerifiedLearner() — the real gate. Course enrolment, lesson access,
 *                           submissions and certificates all sit behind this.
 *
 * Anything that grants access must use the verified variant. An unverified
 * learner is "a label on a submission", not "a person who is signed in".
 */

export type Learner = {
  id: string;
  email: string;
  full_name: string | null;
  country: string | null;
  institution: string | null;
  orcid: string | null;
  /** Null means the address was never proven. This is the trust boundary. */
  verified_at: string | null;
};

export const LEARNER_SIGNED_OUT_MESSAGE =
  "You need to be signed in to do that. Sign in and try again.";
export const LEARNER_UNVERIFIED_MESSAGE =
  "Confirm your email address first — we sent you a link when you signed up. We can send it again if you need it.";

/**
 * Who is signed in as a learner, verified or not — or null. Never throws,
 * never redirects. Use where "signed out" is a renderable state, such as the
 * site header.
 */
export async function getLearner(): Promise<Learner | null> {
  const db = await createSessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  /* Read on the service role, keyed by the id the verified JWT gave us. The
     learner's own RLS policy would also allow this read, but going through the
     service role keeps one rule true everywhere on this site: authorization
     data is never fetched with the caller's own credentials. */
  const { data } = await supabaseAdmin
    .from("learners")
    .select("id, email, full_name, country, institution, orcid, verified_at")
    .eq("id", auth.user.id)
    .maybeSingle();

  /* Authenticated but not a learner — most likely a staff member, whose
     account lives in `profiles`. Treated as "no learner here", the mirror of
     how lib/admin/auth.ts treats a learner hitting /admin. */
  if (!data) return null;

  return data;
}

/** True only for a learner who has proven their email address. */
export function isVerified(learner: Learner | null): learner is Learner {
  return Boolean(learner?.verified_at);
}

/**
 * Signed in as a learner, verified or not. Redirects to sign-in when absent.
 *
 * This is NOT an access gate on its own — it answers "is someone here", which
 * is enough for pages that must render for an unverified learner, such as the
 * "check your email" screen and the account page that offers to resend it.
 */
export async function requireLearner(): Promise<Learner> {
  const learner = await getLearner();
  if (!learner) redirect("/academy/sign-in");
  return learner;
}

/**
 * The real gate: a learner who has proven their email address.
 *
 * Every course-side capability sits behind this — enrolment, lesson access,
 * materials, submissions, certificates. An unverified learner is sent to the
 * verification notice rather than the sign-in page, because they ARE signed
 * in; telling them to sign in again would be a dead end.
 */
export async function requireVerifiedLearner(): Promise<Learner> {
  const learner = await requireLearner();
  if (!learner.verified_at) redirect("/academy/verify");
  return learner;
}

/**
 * Non-redirecting variant for server actions, which must return an ActionState
 * rather than throw a redirect into a form submission. Mirrors
 * requireStaffAction() in lib/admin/auth.ts.
 */
export async function requireLearnerAction(): Promise<
  { ok: true; learner: Learner } | { ok: false; state: ActionState }
> {
  const learner = await getLearner();
  if (!learner) {
    return {
      ok: false,
      state: { status: "error", formError: LEARNER_SIGNED_OUT_MESSAGE },
    };
  }
  return { ok: true, learner };
}

/** Action-side counterpart to requireVerifiedLearner(). */
export async function requireVerifiedLearnerAction(): Promise<
  { ok: true; learner: Learner } | { ok: false; state: ActionState }
> {
  const result = await requireLearnerAction();
  if (!result.ok) return result;
  if (!result.learner.verified_at) {
    return {
      ok: false,
      state: { status: "error", formError: LEARNER_UNVERIFIED_MESSAGE },
    };
  }
  return result;
}
