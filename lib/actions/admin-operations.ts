"use server";

import { revalidatePath } from "next/cache";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import {
  APPLICATION_TRANSITIONS,
  canTransition,
  transitionRefusal,
  type ApplicationStatus,
} from "@/lib/admin/applications";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { StaffMessage } from "@/lib/email/templates";

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const APPLICATION_STATUSES = Object.keys(
  APPLICATION_TRANSITIONS,
) as ApplicationStatus[];

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as string[]).includes(value);
}

/** Registration screen: manually close registration for an event ahead of its scheduled close time. */
export async function setRegistrationClosed(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const eventId = formValue(form, "eventId");
  const closed = formValue(form, "closed") === "true";
  if (!eventId)
    return { status: "error", formError: "That event could not be found." };

  const { error } = await supabaseAdmin
    .from("events")
    .update({ registration_closed_manually: closed })
    .eq("id", eventId);
  if (error)
    return {
      status: "error",
      formError: "We could not update registration for that event.",
    };

  revalidatePath("/admin/operations/registrations");
  void recordAudit(
    auth.user,
    "status_change",
    "operations",
    eventId,
    closed ? "Registration closed manually" : "Registration reopened",
  );
  return {
    status: "success",
    message: closed ? "Registration closed." : "Registration reopened.",
  };
}

/**
 * Application status transitions. The transition guard runs here, not just in
 * the UI — a crafted request naming an invalid transition is refused with the
 * same plain sentence a staffer would see.
 *
 * Outcome emails to the applicant are NOT sent here — that lands in Sprint
 * 5.11, where the message is reviewable before it goes. Do not add a
 * send-email call to this action; it would ship a fixed message with no
 * review step, which the design explicitly avoids.
 */
export async function setApplicationStatus(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const nextRaw = formValue(form, "status");
  if (!id || !isApplicationStatus(nextRaw))
    return { status: "error", formError: "That status is not valid." };

  const { data: current, error: fetchError } = await supabaseAdmin
    .from("applications")
    .select("status, full_name")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !current)
    return { status: "error", formError: "That application could not be found." };

  const from = current.status as ApplicationStatus;
  const to = nextRaw;
  if (from === to) return { status: "success", message: "No change made." };
  if (!canTransition(from, to))
    return { status: "error", formError: transitionRefusal(from, to) };

  const { error } = await supabaseAdmin
    .from("applications")
    .update({ status: to })
    .eq("id", id);
  if (error)
    return {
      status: "error",
      formError: "We could not update this application.",
    };

  revalidatePath(`/admin/operations/applications/${id}`);
  revalidatePath("/admin/operations/applications");
  void recordAudit(
    auth.user,
    "status_change",
    "applications",
    id,
    `${current.full_name}: ${from} → ${to}`,
  );
  return { status: "success", message: "Application updated." };
}

/**
 * Append-only note. Uses the append_application_note() RPC so two staff
 * noting the same application concurrently cannot lose one write to a
 * read-modify-write race. author_email is denormalised onto the note itself
 * so it stays attributable even after a staff account is later removed.
 */
export async function addApplicationNote(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const body = formValue(form, "note").trim();
  if (!id || !body)
    return { status: "error", formError: "Write a note before saving." };
  if (body.length > 4000)
    return { status: "error", formError: "That note is too long." };

  const note = {
    body,
    author_email: auth.user.email,
    at: new Date().toISOString(),
  };

  /* The types generator doesn't introspect stored functions (see
     lib/actions/guard.ts), so .rpc() names don't typecheck without this cast. */
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("append_application_note", {
    p_id: id,
    p_note: note,
  });
  if (error)
    return { status: "error", formError: "We could not save that note." };

  revalidatePath(`/admin/operations/applications/${id}`);
  void recordAudit(auth.user, "update", "applications", id, "Note added");
  return { status: "success", message: "Note added." };
}

/**
 * §5.11 — an application-outcome email. The message is a plain textarea the
 * staffer writes (or edits from a pre-filled default in the UI) and can see
 * exactly what it says before it sends — "reviewable before it goes" means
 * visible, not a templated message applied silently. Fire-and-forget: a
 * failed send must not roll back the status change that already happened.
 */
export async function sendApplicationOutcomeEmail(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const subject = formValue(form, "subject").trim();
  const body = formValue(form, "body").trim();
  if (!id || !subject || !body)
    return { status: "error", formError: "Write a subject and message before sending." };

  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("full_name, email")
    .eq("id", id)
    .maybeSingle();
  if (!application)
    return { status: "error", formError: "That application could not be found." };

  const result = await sendEmail({
    to: application.email,
    subject,
    react: StaffMessage({ fullName: application.full_name, heading: subject, body }),
  });
  if (!result.ok)
    return { status: "error", formError: "We could not send that email. Please try again." };

  void recordAudit(
    auth.user,
    "update",
    "applications",
    id,
    `Outcome email sent: ${subject}`,
  );
  return { status: "success", message: "Email sent." };
}

/**
 * §5.11 — compose-and-send to a filtered set of registrants. One sendEmail
 * call PER recipient, never a shared `to:` list — a shared list would leak
 * every attendee's address to every other attendee. Chunked at 50 for Resend
 * limits.
 */
export async function sendRegistrantMessage(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const subject = formValue(form, "subject").trim();
  const body = formValue(form, "body").trim();
  const recipientsRaw = formValue(form, "recipients");
  if (!subject || !body)
    return { status: "error", formError: "Write a subject and message before sending." };

  let recipients: Array<{ full_name: string; email: string }>;
  try {
    recipients = JSON.parse(recipientsRaw);
  } catch {
    return { status: "error", formError: "The recipient list was not valid." };
  }
  if (!Array.isArray(recipients) || recipients.length === 0)
    return { status: "error", formError: "There is no one to send this to." };

  const CHUNK = 50;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((r) =>
        sendEmail({
          to: r.email,
          subject,
          react: StaffMessage({ fullName: r.full_name, heading: subject, body }),
        }),
      ),
    );
    sent += results.filter((r) => r.ok).length;
  }

  void recordAudit(
    auth.user,
    "update",
    "operations",
    null,
    `Sent "${subject}" to ${sent} of ${recipients.length} registrants`,
  );
  return {
    status: "success",
    message: `Sent to ${sent} of ${recipients.length} registrants.`,
  };
}

/**
 * §5.11/§5.12 — cancel a registration. Recording only: the money moves in
 * Paystack, this action never calls their API. A refunded row is kept
 * (labelled) rather than deleted, for finance reconciliation, and cancelling
 * frees the seat because getSeatCounts (lib/queries.ts) filters cancelled_at
 * is null — there is exactly one seat-counting function, so this is the only
 * place that has to know that.
 */
export async function cancelRegistration(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const refunded = formValue(form, "refunded") === "true";
  if (!id)
    return { status: "error", formError: "That registration could not be found." };

  const { error } = await supabaseAdmin
    .from("registrations")
    .update({
      cancelled_at: new Date().toISOString(),
      ...(refunded ? { payment_status: "refunded" } : {}),
    })
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not cancel this registration." };

  revalidatePath("/admin/operations/registrations");
  void recordAudit(
    auth.user,
    "status_change",
    "registrations",
    id,
    refunded ? "Cancelled and marked refunded" : "Cancelled",
  );
  return { status: "success", message: "Registration cancelled." };
}

/**
 * §5.11 — present/absent attendance toggle.
 */
export async function setAttendance(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const attended = formValue(form, "attended") === "true";
  if (!id)
    return { status: "error", formError: "That registration could not be found." };

  const { error } = await supabaseAdmin
    .from("registrations")
    .update({ attended_at: attended ? new Date().toISOString() : null })
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not update attendance." };

  revalidatePath("/admin/operations/registrations");
  void recordAudit(
    auth.user,
    "status_change",
    "registrations",
    id,
    attended ? "Marked attended" : "Marked not attended",
  );
  return { status: "success", message: "Attendance updated." };
}
