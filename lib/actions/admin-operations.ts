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
