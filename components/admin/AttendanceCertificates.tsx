"use client";

import {
  issueAttendanceCertificate,
  issueAllAttendanceCertificates,
} from "@/lib/actions/admin-event-certificates";
import { ActionForm } from "./AcademyActions";

/* Sprint 7.3 — issuing attendance certificates from the event's roster.
 *
 * Attendance is marked in §5.11's registration list; this is the step after.
 * The bulk control names the number it will act on before the click, so
 * "Issue to everyone who attended" is never a leap of faith. */

export type Attendee = {
  id: string;
  full_name: string;
  email: string;
  attended_at: string | null;
  cancelled_at: string | null;
  payment_status: string;
  certificateCode: string | null;
  certificateRevoked: boolean;
};

export function AttendanceCertificates({
  eventId,
  eventTitle,
  attendees,
}: {
  eventId: string;
  eventTitle: string;
  attendees: Attendee[];
}) {
  const attended = attendees.filter(
    (a) => a.attended_at && !a.cancelled_at,
  );
  const withCertificate = attended.filter((a) => a.certificateCode).length;
  const outstanding = attended.length - withCertificate;

  if (attendees.length === 0) {
    return (
      <p className="text-slate text-small">
        Nobody has registered for this event yet.
      </p>
    );
  }

  return (
    <div>
      <p className="text-slate text-small mb-5">
        {attended.length === 0
          ? "Nobody is marked as having attended yet. Mark attendance on the registrations list first, then come back."
          : `${attended.length} ${attended.length === 1 ? "person" : "people"} attended · ${withCertificate} already have a certificate`}
      </p>

      {outstanding > 0 ? (
        <div className="mb-6">
          <ActionForm
            action={issueAllAttendanceCertificates}
            fields={{ event_id: eventId }}
            label={`Issue to the ${outstanding} who need one`}
            pendingLabel="Issuing…"
            variant="primary"
            confirm={`Issue attendance certificates for ${eventTitle} to ${outstanding} ${outstanding === 1 ? "person" : "people"}?\n\nEach one is emailed their code straight away. Anyone who already has a certificate is skipped.`}
          />
        </div>
      ) : null}

      <ul className="space-y-2">
        {attendees.map((person) => {
          const eligible = Boolean(person.attended_at) && !person.cancelled_at;
          return (
            <li
              key={person.id}
              className="border-hairline bg-paper flex flex-wrap items-center justify-between gap-3 border p-4"
            >
              <div className="min-w-0">
                <p className="text-ink text-small font-semibold">
                  {person.full_name}
                </p>
                <p className="text-slate text-small mt-0.5">
                  {person.email}
                  {person.cancelled_at
                    ? " · cancelled"
                    : person.attended_at
                      ? " · attended"
                      : " · not marked present"}
                </p>
                {person.certificateCode ? (
                  <p className="text-slate text-small mt-1">
                    {person.certificateRevoked ? "Withdrawn — " : ""}
                    <a
                      href={`/verify/${person.certificateCode}`}
                      className="underline underline-offset-2"
                    >
                      {person.certificateCode}
                    </a>
                  </p>
                ) : null}
              </div>

              {!person.certificateCode && eligible ? (
                <ActionForm
                  action={issueAttendanceCertificate}
                  fields={{ id: person.id }}
                  label="Issue certificate"
                  pendingLabel="Issuing…"
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
