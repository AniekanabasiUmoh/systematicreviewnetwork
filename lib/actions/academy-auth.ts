"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLearner, requireLearnerAction } from "@/lib/academy/auth";
import {
  learnerSignUpSchema,
  learnerSignInSchema,
  learnerProfileSchema,
} from "./academy-schemas";
import { fieldErrorsFrom, forgotPasswordSchema } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* Learner sign-up / sign-in / profile (Design.md §9 Sprint 6.1).
 *
 * Same shape as every other write on this site (§1): honeypot → zod → rate
 * limit → service-role write. The browser never writes to Supabase directly,
 * and `learners` has no insert/update policy at all, so these actions are the
 * only path that can create or change a learner row.
 *
 * The security-critical function in this file is linkRegistrationsToLearner(),
 * called ONLY from the verification path. See its comment.
 */

const INVALID_CREDENTIALS =
  "That email and password don't match an account. Check both and try again.";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}

/** Learner-side redirect target validator — the mirror of admin's safeNext. */
function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/account";
  // Must be a site-relative path, and must not be protocol-relative ("//evil")
  // which the browser would treat as an absolute URL to another host.
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  // Never bounce a learner into the staff area.
  if (value.startsWith("/admin")) return "/account";
  return value;
}

/**
 * Link a newly VERIFIED learner to registrations previously made with the same
 * address (Phase 6 decision 5).
 *
 * This function is the reason verification exists, and calling it from anywhere
 * other than a proven-verification path would be a real vulnerability: the
 * public event form accepts any typed address with no verification step, so
 * matching on an unverified address would let anyone type a stranger's email
 * and inherit their entire registration history.
 *
 * Two further constraints, both deliberate:
 *   - Matching is case-insensitive, because `registrations` stores whatever was
 *     typed and `learners_email_unique` is on lower(email).
 *   - `registrations.email` is NOT rewritten. It is a snapshot of what was
 *     submitted, exactly as `applications.programme` is (§5.7).
 *
 * Only ever claims rows that are still unclaimed (`learner_id is null`), so a
 * registration already linked to someone else can never be stolen by a later
 * signup on a similar address.
 */
async function linkRegistrationsToLearner(
  learnerId: string,
  verifiedEmail: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("registrations")
    .update({ learner_id: learnerId } as never)
    .ilike("email", verifiedEmail)
    .is("learner_id", null)
    .select("id");

  if (error) {
    // Never fail verification because the backfill failed — the account is
    // verified either way, and an unlinked registration is recoverable.
    console.error("[academy] registration backfill failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Sync a learner's verified state from Supabase Auth.
 *
 * Auth owns email confirmation; `learners.verified_at` mirrors it so that RLS
 * and is_verified_learner() have something to check without reaching into
 * auth.users (which is not reachable over PostgREST at all).
 *
 * Called after sign-in and on the verification landing page. Idempotent: an
 * already-verified learner is left alone, so the backfill runs exactly once.
 */
export async function syncLearnerVerification(): Promise<
  { verified: boolean; linkedRegistrations: number }
> {
  const db = await createSessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { verified: false, linkedRegistrations: 0 };

  // Supabase sets email_confirmed_at when the emailed link is followed. This
  // is the proof; nothing the client sends is trusted here.
  const confirmedAt = auth.user.email_confirmed_at;
  if (!confirmedAt) return { verified: false, linkedRegistrations: 0 };

  const { data: learner } = await supabaseAdmin
    .from("learners")
    .select("id, email, verified_at")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!learner) return { verified: false, linkedRegistrations: 0 };
  if (learner.verified_at) return { verified: true, linkedRegistrations: 0 };

  await supabaseAdmin
    .from("learners")
    .update({ verified_at: confirmedAt } as never)
    .eq("id", learner.id);

  const linked = await linkRegistrationsToLearner(learner.id, learner.email);
  return { verified: true, linkedRegistrations: linked };
}

const SIGNUP_PENDING_MESSAGE =
  "Check your email — we've sent you a link to confirm your address. It expires in an hour.";

export async function signUpLearner(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: SIGNUP_PENDING_MESSAGE };
  }

  const parsed = learnerSignUpSchema.safeParse({
    full_name: form.get("full_name"),
    email: form.get("email"),
    password: form.get("password"),
    country: form.get("country"),
    institution: form.get("institution") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("academy-signup", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  const input = parsed.data;

  /* An address already held by STAFF cannot become a learner — the database
     trigger refuses it anyway (20260727000001), but catching it here means a
     plain sentence instead of a constraint error. Deliberately does NOT say
     whether the address is staff: that would disclose who works at SRN. */
  const { data: existingStaff } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", input.email)
    .maybeSingle();

  if (existingStaff) {
    return {
      status: "error",
      formError:
        "That email address can't be used to create a learner account. If you think this is a mistake, email us and we'll sort it out.",
    };
  }

  const db = await createSessionClient();
  const { data: signUp, error: signUpError } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: `${siteUrl()}/academy/verify` },
  });

  /* Account enumeration: Supabase returns a user object with an empty
     identities array when the address is already registered, rather than an
     error. Either way we return the SAME pending message — telling a stranger
     "that email already has an account" turns this form into a way to test
     which addresses are registered. The real account holder gets an email
     from Supabase telling them someone tried. */
  if (signUpError) {
    // A genuine failure (weak password, provider outage). Report only what is
    // actionable, without confirming whether the address exists.
    if (signUpError.message.toLowerCase().includes("password")) {
      return {
        status: "error",
        fieldErrors: { password: "Choose a stronger password." },
      };
    }
    console.error("[academy] signUp failed:", signUpError.message);
    return { status: "success", message: SIGNUP_PENDING_MESSAGE };
  }

  const userId = signUp.user?.id;
  const alreadyRegistered = (signUp.user?.identities?.length ?? 0) === 0;
  if (!userId || alreadyRegistered) {
    return { status: "success", message: SIGNUP_PENDING_MESSAGE };
  }

  /* Create the learner row. verified_at stays NULL — Phase 6 decision 5's
     trust boundary. It is set only by syncLearnerVerification(), and only
     from Supabase's own email_confirmed_at. */
  const { error: insertError } = await supabaseAdmin.from("learners").insert({
    id: userId,
    email: input.email,
    full_name: input.full_name,
    country: input.country,
    institution: input.institution ?? null,
  } as never);

  if (insertError) {
    console.error("[academy] learner insert failed:", insertError.message);
    return {
      status: "error",
      formError:
        "Something went wrong creating your account. Please try again in a moment.",
    };
  }

  return { status: "success", message: SIGNUP_PENDING_MESSAGE };
}

export async function signInLearner(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  const parsed = learnerSignInSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    next: form.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  const limit = await checkRateLimit("academy-signin", await clientIp());
  if (!limit.ok) {
    return {
      status: "error",
      formError:
        "Too many sign-in attempts. Please wait a while and try again.",
    };
  }

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { status: "error", formError: INVALID_CREDENTIALS };

  /* An auth user without a `learners` row is not a learner — most likely a
     staff account, which must sign in at /admin instead. Sign them straight
     back out rather than leaving a half-authenticated session lying around. */
  const learner = await getLearner();
  if (!learner) {
    await db.auth.signOut();
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  // Catches up verified_at (and runs the one-time backfill) for anyone who
  // confirmed their address but never landed on /academy/verify.
  await syncLearnerVerification();

  redirect(safeNext(parsed.data.next));
}

export async function signOutLearner(): Promise<void> {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/");
}

const RESET_REQUESTED_MESSAGE =
  "If that email has an account, we've sent a link to reset the password. It expires in an hour.";

/** Identical-response password reset, for the same enumeration reason as §5.10. */
export async function requestLearnerPasswordReset(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) {
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const limit = await checkRateLimit("academy-forgot", await clientIp());
  if (!limit.ok) {
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const db = await createSessionClient();
  await db.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/academy/reset`,
  });

  return { status: "success", message: RESET_REQUESTED_MESSAGE };
}

/** Resend the confirmation email to a signed-in but unverified learner. */
export async function resendLearnerVerification(): Promise<ActionState> {
  const auth = await requireLearnerAction();
  if (!auth.ok) return auth.state;
  if (auth.learner.verified_at) {
    return { status: "success", message: "Your email is already confirmed." };
  }

  const limit = await checkRateLimit("academy-resend", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  const db = await createSessionClient();
  const { error } = await db.auth.resend({
    type: "signup",
    email: auth.learner.email,
    options: { emailRedirectTo: `${siteUrl()}/academy/verify` },
  });
  if (error) {
    return {
      status: "error",
      formError: "We couldn't resend that just now. Please try again shortly.",
    };
  }
  return {
    status: "success",
    message: "Sent — check your email for the confirmation link.",
  };
}

/**
 * Edit your own profile.
 *
 * Note what is NOT here: email and verified_at. The former is a
 * re-verification flow rather than a text field; the latter is the trust
 * boundary and is never client-settable. Because the payload is built field by
 * field from the parsed schema (never spread from FormData), no extra column
 * can be smuggled in — the same mass-assignment defence saveResource uses.
 */
export async function updateLearnerProfile(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireLearnerAction();
  if (!auth.ok) return auth.state;

  const parsed = learnerProfileSchema.safeParse({
    full_name: form.get("full_name"),
    country: form.get("country"),
    institution: form.get("institution") ?? undefined,
    orcid: form.get("orcid") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { error } = await supabaseAdmin
    .from("learners")
    .update({
      full_name: parsed.data.full_name,
      country: parsed.data.country,
      institution: parsed.data.institution ?? null,
      orcid: parsed.data.orcid ?? null,
    } as never)
    .eq("id", auth.learner.id);

  if (error) {
    console.error("[academy] profile update failed:", error.message);
    return {
      status: "error",
      formError: "We couldn't save those changes. Please try again.",
    };
  }

  return { status: "success", message: "Profile saved." };
}
