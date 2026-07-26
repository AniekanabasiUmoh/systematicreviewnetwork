"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { getCohortRow } from "@/lib/admin/academy";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.4 — the roster controls.
 *
 * Manual enrolment exists because SRN runs institutional cohorts that are paid
 * for by invoice, not by card. Those learners are `not_required` rather than
 * `paid`: the money is real but it never went through Paystack, and labelling
 * it `paid` would put rows in the finance reconciliation that Paystack has no
 * record of.
 *
 * Removal is a WITHDRAWAL, not a delete. The row stays, so a refund and a
 * reconciliation still have something to point at. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const manualEnrolSchema = z.object({
  cohort_id: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .min(1, "Enter the learner's email address.")
    .email("Enter a valid email address."),
});

export async function manualEnrol(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = manualEnrolSchema.safeParse({
    cohort_id: formValue(form, "cohort_id"),
    email: formValue(form, "email"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const cohort = await getCohortRow(parsed.data.cohort_id);
  if (!cohort)
    return { status: "error", formError: "That cohort no longer exists." };

  const email = parsed.data.email.toLowerCase();
  const { data: learner } = await supabaseAdmin
    .from("learners")
    .select("id, full_name, email, verified_at")
    .ilike("email", email)
    .maybeSingle();

  /* No account, no enrolment. Creating one here would mean a learner who never
     chose a password and cannot sign in to reach the course we just gave them.
     Say what to do instead. */
  if (!learner) {
    return {
      status: "error",
      formError: `Nobody has signed up with ${email} yet. Ask them to create an account first, then add them here — otherwise they would have no way to sign in and reach the course.`,
    };
  }

  const { error } = await supabaseAdmin.from("enrolments").upsert(
    {
      learner_id: learner.id,
      cohort_id: cohort.id,
      state: "active",
      // Invoiced or comped: real money, but not a Paystack transaction.
      payment_status: "not_required",
      amount_kobo: 0,
      currency: cohort.currency,
      enrolled_at: new Date().toISOString(),
      withdrawn_at: null,
      cancelled_at: null,
      learner_name_at_enrolment: learner.full_name,
      learner_email_at_enrolment: learner.email,
    } as never,
    { onConflict: "learner_id,cohort_id" },
  );
  if (error) {
    console.error("[roster] manual enrol failed:", error.message);
    return { status: "error", formError: "We could not add that learner." };
  }

  revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  void recordAudit(
    auth.user,
    "create",
    "enrolments",
    cohort.id,
    `Manually enrolled ${learner.email} in ${cohort.label}`,
  );
  return {
    status: "success",
    message: `${learner.email} is enrolled. They can open the course now.`,
  };
}

export async function withdrawEnrolment(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: row } = await supabaseAdmin
    .from("enrolments")
    .select("id, cohort_id, learner_email_at_enrolment, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!row)
    return { status: "error", formError: "That enrolment no longer exists." };

  const { error } = await supabaseAdmin
    .from("enrolments")
    .update({
      state: "withdrawn",
      withdrawn_at: new Date().toISOString(),
      cancelled_at: new Date().toISOString(),
    } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not remove that learner." };

  const cohort = await getCohortRow(row.cohort_id);
  if (cohort)
    revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  void recordAudit(
    auth.user,
    "update",
    "enrolments",
    id,
    `Withdrew ${row.learner_email_at_enrolment ?? "a learner"}`,
  );
  return {
    status: "success",
    message:
      row.payment_status === "paid"
        ? "Removed, and their seat is free. They paid by card — if you owe them a refund, make it in Paystack, then log it here."
        : "Removed, and their seat is free.",
  };
}

export async function recordRefund(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: row } = await supabaseAdmin
    .from("enrolments")
    .select("id, cohort_id, payment_status, learner_email_at_enrolment")
    .eq("id", id)
    .maybeSingle();
  if (!row)
    return { status: "error", formError: "That enrolment no longer exists." };

  if (row.payment_status !== "paid") {
    return {
      status: "error",
      formError:
        "There is no card payment on this enrolment, so there is nothing to refund.",
    };
  }

  /* Recording only (§5.12). The money moves in Paystack; this never calls their
     refund API, and the UI says so before the click. */
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("enrolments")
    .update({
      payment_status: "refunded",
      refunded_at: now,
      cancelled_at: now,
      state: "withdrawn",
      withdrawn_at: now,
    } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not record that refund." };

  const cohort = await getCohortRow(row.cohort_id);
  if (cohort)
    revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  void recordAudit(
    auth.user,
    "update",
    "enrolments",
    id,
    `Recorded refund for ${row.learner_email_at_enrolment ?? "a learner"}`,
  );
  return {
    status: "success",
    message:
      "Logged. Their seat is free. Remember this only records the refund — Paystack is where the money actually moves.",
  };
}

export async function offerWaitlistSeat(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { error } = await supabaseAdmin
    .from("cohort_waitlist")
    .update({ offered_at: new Date().toISOString() } as never)
    .eq("id", id)
    .is("offered_at", null);
  if (error)
    return { status: "error", formError: "We could not record that offer." };

  void recordAudit(auth.user, "update", "cohort_waitlist", id, "Offered a seat");
  return {
    status: "success",
    message:
      "Noted that you have offered them a place. Email them the enrol link — they sign up and pay in the normal way, so nothing is held for them until they do.",
  };
}
