"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  checkEventEligibility,
  issueEventCertificate,
} from "@/lib/events/certificates";
import { formatEventDateTime } from "@/lib/events";
import { sendEmail } from "@/lib/email/client";
import { CertificateIssued } from "@/lib/email/templates";

/* Sprint 7.3 — issuing attendance certificates.
 *
 * Two entry points, one code path: issue for one person, or for everyone who
 * attended. The bulk action deliberately reuses the single one rather than
 * writing a faster batch insert — issuing is rare, the loop is short, and one
 * implementation cannot disagree with itself about who is eligible. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}

type Registration = {
  id: string;
  full_name: string;
  email: string;
  attended_at: string | null;
  cancelled_at: string | null;
  payment_status: string;
  events: { title: string; starts_at: string; ends_at: string | null } | null;
};

async function issueFor(
  registration: Registration,
): Promise<{ ok: true; code: string } | { ok: false; reason: string }> {
  const eligible = checkEventEligibility(registration);
  if (!eligible.eligible) return { ok: false, reason: eligible.reason };

  const event = registration.events;
  if (!event) return { ok: false, reason: "That event no longer exists." };

  const certificate = await issueEventCertificate(registration.id, {
    learner_name: registration.full_name,
    event_title: event.title,
    event_date: formatEventDateTime(event.starts_at, event.ends_at),
    /* Dated the day they attended, not the day a staffer got round to
       issuing it. A certificate that claims the wrong date is wrong. */
    completed_on: (registration.attended_at ?? new Date().toISOString()).slice(
      0,
      10,
    ),
  });

  if (!certificate) return { ok: false, reason: "We could not issue it." };

  void sendEmail({
    to: registration.email,
    subject: `Your certificate — ${event.title}`,
    react: CertificateIssued({
      fullName: registration.full_name,
      courseTitle: event.title,
      code: certificate.code,
      certificateUrl: `${siteUrl()}/api/academy/certificate/${certificate.code}`,
      verifyUrl: `${siteUrl()}/verify/${certificate.code}`,
    }),
  });

  return { ok: true, code: certificate.code };
}

const SELECT =
  "id, full_name, email, attended_at, cancelled_at, payment_status, events (title, starts_at, ends_at)";

export async function issueAttendanceCertificate(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data } = await supabaseAdmin
    .from("registrations")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  const registration = data as unknown as Registration | null;
  if (!registration)
    return { status: "error", formError: "That registration no longer exists." };

  const result = await issueFor(registration);
  if (!result.ok) return { status: "error", formError: result.reason };

  revalidatePath("/admin/operations/registrations");
  void recordAudit(
    auth.user,
    "create",
    "certificates",
    id,
    `Issued attendance certificate ${result.code} to ${registration.email}`,
  );
  return {
    status: "success",
    message: `Issued. ${registration.full_name} has been emailed their code, ${result.code}.`,
  };
}

export async function issueAllAttendanceCertificates(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const eventId = formValue(form, "event_id");
  const { data } = await supabaseAdmin
    .from("registrations")
    .select(SELECT)
    .eq("event_id", eventId)
    .not("attended_at", "is", null)
    .is("cancelled_at", null);

  const registrations = (data ?? []) as unknown as Registration[];
  if (registrations.length === 0)
    return {
      status: "error",
      formError:
        "Nobody is marked as having attended this event yet. Mark attendance first.",
    };

  let issued = 0;
  let already = 0;
  const failures: string[] = [];

  for (const registration of registrations) {
    /* Already holding one is not a failure — issueEventCertificate is
       idempotent, so this counts rather than complains. */
    const existing = await supabaseAdmin
      .from("certificates")
      .select("id", { head: true, count: "exact" })
      .eq("registration_id", registration.id);
    if ((existing.count ?? 0) > 0) {
      already += 1;
      continue;
    }

    const result = await issueFor(registration);
    if (result.ok) issued += 1;
    else failures.push(`${registration.full_name}: ${result.reason}`);
  }

  revalidatePath("/admin/operations/registrations");
  void recordAudit(
    auth.user,
    "create",
    "certificates",
    eventId,
    `Issued ${issued} attendance certificates in bulk`,
  );

  const parts = [
    issued > 0
      ? `${issued} ${issued === 1 ? "certificate" : "certificates"} issued and emailed.`
      : "No new certificates were needed.",
    already > 0 ? `${already} already had one.` : "",
    failures.length > 0
      ? `${failures.length} could not be issued: ${failures.slice(0, 3).join("; ")}`
      : "",
  ].filter(Boolean);

  return {
    status: failures.length > 0 && issued === 0 ? "error" : "success",
    ...(failures.length > 0 && issued === 0
      ? { formError: parts.join(" ") }
      : { message: parts.join(" ") }),
  } as ActionState;
}
