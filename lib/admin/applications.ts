/* Sprint 5.6 — application status transition rules. Pure and unit-testable:
 * no I/O, so tests/admin-content.test.ts can exercise every edge without a
 * database. The server action (lib/actions/admin-operations.ts) is the actual
 * gate — hiding invalid buttons in the UI is a convenience, not the boundary. */

export type ApplicationStatus =
  | "received"
  | "under_review"
  | "accepted"
  | "waitlisted"
  | "rejected";

export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ReadonlyArray<ApplicationStatus>
> = {
  received: ["under_review", "accepted", "waitlisted", "rejected"],
  under_review: ["accepted", "waitlisted", "rejected"],
  waitlisted: ["accepted", "rejected"],
  accepted: ["rejected"],
  rejected: [],
};

/* Which side of the Mentorship Programme an applicant is offering. Mirrors the
 * `applicant_role` enum. Lives here, next to the status labels, so the public
 * form, the internal notification email and the admin screen all read the same
 * wording from one place rather than each spelling it out. */
export type ApplicantRole = "mentee" | "mentor" | "librarian";

export const APPLICANT_ROLES: ReadonlyArray<ApplicantRole> = [
  "mentee",
  "mentor",
  "librarian",
];

export const ROLE_LABELS: Record<ApplicantRole, string> = {
  mentee: "Mentee — I have a review and want guidance",
  mentor: "Mentor — I can supervise someone else's review",
  librarian: "Librarian — I can support search strategy",
};

/** Short form for tables and exports, where the explanation is just noise. */
export const ROLE_LABELS_SHORT: Record<ApplicantRole, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  librarian: "Librarian",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: "Received",
  under_review: "Under review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionRefusal(
  from: ApplicationStatus,
  to: ApplicationStatus,
): string {
  return `An application that is ${STATUS_LABELS[from].toLowerCase()} cannot move directly to ${STATUS_LABELS[to].toLowerCase()}.`;
}
