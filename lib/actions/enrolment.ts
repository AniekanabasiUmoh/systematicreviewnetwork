"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireVerifiedLearnerAction } from "@/lib/academy/auth";
import { getCohort, getCohortSeatCounts } from "@/lib/academy/courses";
import { cohortState, canEnrol, formatCohortDates } from "@/lib/academy/cohorts";
import { sendEmail } from "@/lib/email/client";
import { EnrolmentConfirmation } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  isConfigured,
  newReference,
  initializeTransaction,
} from "@/lib/paystack";

/* Sprint 6.4 — enrolment.
 *
 * Two paths, one function, because the difference between them is a price and
 * nothing else. A free cohort (price_kobo = 0, decision 4) becomes an active
 * enrolment immediately. A paid one becomes a PENDING enrolment plus a Paystack
 * redirect, and only the webhook (§13.3) may turn it active — never the browser
 * coming back from checkout, which anyone can forge by visiting the callback
 * URL directly.
 *
 * Everything is re-checked server-side at the moment of the click: a cohort
 * that was open when the page rendered may be closed, full, or manually shut by
 * the time someone presses the button. */

const SIGNED_OUT: ActionState = {
  status: "error",
  formError: "Sign in to enrol, then try again.",
};

export type EnrolResult = ActionState & { redirectTo?: string };

export async function enrol(
  _prev: ActionState = idle,
  form: FormData,
): Promise<EnrolResult> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;
  const learner = auth.learner;

  const courseSlug = String(form.get("course") ?? "");
  const cohortSlug = String(form.get("cohort") ?? "");
  if (!courseSlug || !cohortSlug) return SIGNED_OUT;

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found)
    return {
      status: "error",
      formError: "That cohort is no longer available.",
    };
  const { course, cohort } = found;

  /* Already enrolled? Say so plainly and send them to the course rather than
     charging twice. The unique index would refuse the insert anyway; this is
     the version of that refusal a person can act on. */
  const { data: existing } = await supabaseAdmin
    .from("enrolments")
    .select("id, state, payment_status")
    .eq("learner_id", learner.id)
    .eq("cohort_id", cohort.id)
    .maybeSingle();

  if (existing && existing.state !== "withdrawn") {
    if (existing.payment_status === "pending") {
      return {
        status: "error",
        formError:
          "You already started paying for this cohort. If you closed the payment window before it finished, wait two minutes and try again — nothing has been charged.",
      };
    }
    return {
      status: "success",
      message: "You are already enrolled in this cohort.",
      redirectTo: `/academy/learn/${course.slug}/${cohort.slug}`,
    };
  }

  // Re-check the gate at click time, not render time.
  const seats = await getCohortSeatCounts([cohort.id]);
  const taken = seats[cohort.id] ?? 0;
  const state = cohortState(cohort, taken);

  if (!canEnrol(state)) {
    if (state === "full") {
      return {
        status: "error",
        formError:
          "This cohort filled up. You can join the waiting list and we will offer you a seat if one frees up.",
      };
    }
    return {
      status: "error",
      formError: "This cohort is not taking enrolments.",
    };
  }

  const free = cohort.price_kobo === 0;

  /* The free path. No Paystack, no pending state — enrolled and paid-up the
     moment they click, which is what decision 4 means by "0 is the free tier".
     This is also the path that works with no payment keys configured at all. */
  if (free) {
    const { error } = await supabaseAdmin.from("enrolments").upsert(
      {
        learner_id: learner.id,
        cohort_id: cohort.id,
        state: "active",
        payment_status: "not_required",
        amount_kobo: 0,
        currency: cohort.currency,
        enrolled_at: new Date().toISOString(),
        withdrawn_at: null,
        learner_name_at_enrolment: learner.full_name,
        learner_email_at_enrolment: learner.email,
      } as never,
      { onConflict: "learner_id,cohort_id" },
    );
    if (error) {
      console.error("[enrol] free enrolment failed:", error.message);
      return {
        status: "error",
        formError: "We could not complete your enrolment. Please try again.",
      };
    }

    /* Fire-and-forget: a failed email must never undo a completed enrolment.
       The paid path's equivalent lives in the webhook, because a payment is
       only real once Paystack confirms it. */
    void sendEmail({
      to: learner.email,
      subject: `You're enrolled — ${course.title}`,
      react: EnrolmentConfirmation({
        fullName: learner.full_name ?? "there",
        courseTitle: course.title,
        cohortLabel: cohort.label,
        datesLabel: formatCohortDates(
          cohort.starts_on,
          cohort.ends_on,
          cohort.pacing,
        ),
        courseUrl: `${siteUrl()}/academy/learn/${course.slug}/${cohort.slug}`,
      }),
    });

    revalidatePath(`/academy/${course.slug}`);
    return {
      status: "success",
      message: `You are enrolled in ${cohort.label}.`,
      redirectTo: `/academy/learn/${course.slug}/${cohort.slug}`,
    };
  }

  /* The paid path. Written to the live Paystack contract and gated on
     isConfigured(), so it works the moment keys land — and until then says so
     honestly rather than presenting a checkout button that goes nowhere. */
  if (!isConfigured()) {
    return {
      status: "error",
      formError:
        "Card payment is not switched on yet, so this cohort cannot be booked online today. Send us a message and we will arrange your place directly.",
    };
  }

  const reference = newReference("srn_enrol");

  /* The pending row is written BEFORE the redirect so the reference exists in
     our database before it exists at Paystack. If the redirect fails, or the
     learner abandons checkout, we have a row to reconcile rather than a
     payment with nothing to match it to. It holds no seat and unlocks nothing
     (getCohortSeatCounts and the 6.3 access gate both require paid-up). */
  const { error: pendingError } = await supabaseAdmin.from("enrolments").upsert(
    {
      learner_id: learner.id,
      cohort_id: cohort.id,
      state: "pending",
      payment_status: "pending",
      amount_kobo: cohort.price_kobo,
      currency: cohort.currency,
      paystack_reference: reference,
      enrolled_at: new Date().toISOString(),
      withdrawn_at: null,
      learner_name_at_enrolment: learner.full_name,
      learner_email_at_enrolment: learner.email,
    } as never,
    { onConflict: "learner_id,cohort_id" },
  );
  if (pendingError) {
    console.error("[enrol] pending enrolment failed:", pendingError.message);
    return {
      status: "error",
      formError: "We could not start your payment. Please try again.",
    };
  }

  const init = await initializeTransaction({
    email: learner.email,
    amount: cohort.price_kobo,
    currency: cohort.currency as "NGN" | "USD",
    reference,
    callbackUrl: `${siteUrl()}/academy/enrol/${course.slug}/${cohort.slug}/complete`,
    metadata: {
      kind: "enrolment",
      cohort_id: cohort.id,
      course_slug: course.slug,
      cohort_slug: cohort.slug,
      learner_id: learner.id,
    },
  });

  if (!init.ok) {
    /* Roll the pending row back to withdrawn so a failed handoff does not leave
       a phantom "payment in progress" blocking their next attempt. */
    await supabaseAdmin
      .from("enrolments")
      .update({ state: "withdrawn", payment_status: "failed" } as never)
      .eq("paystack_reference", reference);
    console.error("[enrol] paystack init failed:", init.error);
    return {
      status: "error",
      formError:
        "We could not reach the payment provider. Please try again in a moment.",
    };
  }

  return {
    status: "success",
    message: "Taking you to the payment page…",
    redirectTo: init.authorizationUrl,
  };
}

/* -------------------------------------------------------------------------- */
/* Waitlist                                                                    */
/* -------------------------------------------------------------------------- */

export async function joinWaitlist(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireVerifiedLearnerAction();
  if (!auth.ok) return auth.state;

  const courseSlug = String(form.get("course") ?? "");
  const cohortSlug = String(form.get("cohort") ?? "");
  const found = await getCohort(courseSlug, cohortSlug);
  if (!found)
    return { status: "error", formError: "That cohort is no longer available." };

  const { error } = await supabaseAdmin.from("cohort_waitlist").upsert(
    {
      cohort_id: found.cohort.id,
      learner_id: auth.learner.id,
    } as never,
    { onConflict: "cohort_id,learner_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[waitlist] join failed:", error.message);
    return {
      status: "error",
      formError: "We could not add you to the waiting list. Please try again.",
    };
  }

  return {
    status: "success",
    message:
      "You are on the waiting list. We will email you if a seat frees up, and you will not be charged unless you take it.",
  };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}
