import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCode, type Certificate } from "@/lib/academy/certificates";

/* Sprint 7.3 — attendance certificates for one-off events.
 *
 * §7.3 is explicit: "Sprint 6.7 owns course certificates including issuing,
 * public verification and revocation — build that first and extend it to
 * events, rather than a second certificate system."
 *
 * So this module writes into the SAME `certificates` table, with the same code
 * alphabet, the same /verify page and the same revocation flow. What differs is
 * only the parent: a course certificate points at an enrolment, an event one
 * points at a registration, and a CHECK constraint enforces exactly one.
 *
 * ELIGIBILITY IS ATTENDANCE, and attendance is a staff judgement. §5.11 already
 * built the present/absent toggle that writes `attended_at`; this reads it
 * rather than inventing a second notion of "was there". Someone who registered
 * and did not turn up gets nothing, which is the entire point of a certificate
 * of attendance.
 */

export type EventEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export function checkEventEligibility(registration: {
  attended_at: string | null;
  cancelled_at: string | null;
  payment_status: string;
}): EventEligibility {
  if (registration.cancelled_at) {
    return {
      eligible: false,
      reason: "This registration was cancelled.",
    };
  }
  if (!registration.attended_at) {
    return {
      eligible: false,
      reason:
        "Attendance has not been recorded for this person. Mark them present first.",
    };
  }
  /* A pending payment means an abandoned checkout — they never held a place.
     `not_required` covers free events and invoiced places, both of which are
     genuine attendance. */
  if (!["paid", "not_required"].includes(registration.payment_status)) {
    return {
      eligible: false,
      reason: "This place was never paid for, so there is nothing to certify.",
    };
  }
  return { eligible: true };
}

/** The certificate for a registration, if one has been issued. */
export async function getEventCertificate(
  registrationId: string,
): Promise<Certificate | null> {
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("registration_id", registrationId)
    .maybeSingle();
  return (data as Certificate) ?? null;
}

/**
 * Issue one, or return the existing one.
 *
 * Idempotent for the same reason 6.7's is: a staffer clicking twice, or a bulk
 * issue running twice, must not mint a second code for the same person.
 *
 * Facts are FROZEN here exactly as they are for a course. An event renamed
 * after the fact must not rewrite a certificate already awarded — the whole
 * value of the document is that it says what was true on the day.
 */
export async function issueEventCertificate(
  registrationId: string,
  facts: {
    learner_name: string;
    event_title: string;
    event_date: string;
    completed_on: string;
  },
): Promise<Certificate | null> {
  const existing = await getEventCertificate(registrationId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("certificates")
      .insert({
        registration_id: registrationId,
        enrolment_id: null,
        code: generateCode(),
        learner_name: facts.learner_name,
        /* The event's title goes in the course_title column. One table, one
           verification page — a column named for the commoner case rather than
           two nullable columns that would both need checking everywhere. */
        course_title: facts.event_title,
        cohort_label: "Attendance",
        cohort_dates: facts.event_date,
        completed_on: facts.completed_on,
      } as never)
      .select("*")
      .single();

    if (!error) return data as Certificate;

    if ((error as { code?: string }).code === "23505") {
      const raced = await getEventCertificate(registrationId);
      if (raced) return raced;
      continue;
    }

    console.error("[event certificates] issue failed:", error.message);
    return null;
  }

  return null;
}

/** Every attendee of an event, with whether they already hold a certificate. */
export async function listAttendees(eventId: string): Promise<
  Array<{
    id: string;
    full_name: string;
    email: string;
    attended_at: string | null;
    cancelled_at: string | null;
    payment_status: string;
    certificateCode: string | null;
    certificateRevoked: boolean;
  }>
> {
  const { data } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, full_name, email, attended_at, cancelled_at, payment_status, certificates (code, revoked_at)",
    )
    .eq("event_id", eventId)
    .order("full_name", { ascending: true });

  return ((data ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    attended_at: string | null;
    cancelled_at: string | null;
    payment_status: string;
    certificates: Array<{ code: string; revoked_at: string | null }> | null;
  }>).map((row) => {
    const cert = row.certificates?.[0] ?? null;
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      attended_at: row.attended_at,
      cancelled_at: row.cancelled_at,
      payment_status: row.payment_status,
      certificateCode: cert?.code ?? null,
      certificateRevoked: Boolean(cert?.revoked_at),
    };
  });
}
