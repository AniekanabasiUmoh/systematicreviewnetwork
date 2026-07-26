import type { CohortsRow } from "@/lib/database.types";
import { registrationState, type RegistrationState } from "@/lib/events";

/* Sprint 6.2 — cohort state and labelling.
 *
 * Design.md §6.2 is explicit: "Reuse the existing state machine in
 * lib/events.ts for cohort open/closed/full rather than writing a second one."
 * So this module does not decide anything about time or capacity. It adapts a
 * cohort into the shape `registrationState` already understands and delegates.
 *
 * That matters beyond tidiness. The two rules that are easy to get wrong —
 * abandoned checkouts must not hold seats, and a manual close must beat an open
 * window — are already written and already tested in one place. A second copy
 * would be a second thing to keep correct. */

export type CohortState = RegistrationState;

/** A self-paced cohort is open on its own terms. */
export type CohortLike = Pick<
  CohortsRow,
  | "starts_on"
  | "ends_on"
  | "enrolment_opens"
  | "enrolment_closes"
  | "enrolment_closed_manually"
  | "capacity"
  | "pacing"
>;

/**
 * Resolves whether a cohort is taking enrolments.
 *
 * `seatsTaken` is the number of seats actually held — for a paid cohort that is
 * confirmed payments only, matching §13.2 and the `getSeatCounts` posture, so a
 * pending enrolment never consumes capacity.
 *
 * **Pacing is checked first** (decision 1). A self-paced cohort has no start
 * date and no end date in any meaningful sense: someone enrolling in month
 * eight is not late, and the run never becomes "past". Feeding it through the
 * date branches would close it the moment its nominal `ends_on` passed, which
 * is precisely the behaviour decision 1 exists to prevent. So a self-paced
 * cohort can only be `open`, `closed` (manually or by an explicit enrolment
 * window) or `full`.
 */
export function cohortState(
  cohort: CohortLike,
  seatsTaken = 0,
  now: Date = new Date(),
): CohortState {
  if (cohort.pacing === "self_paced") {
    const t = now.getTime();
    if (cohort.enrolment_closed_manually) return "closed";
    if (
      cohort.enrolment_opens &&
      new Date(cohort.enrolment_opens).getTime() > t
    ) {
      return "not_yet_open";
    }
    if (
      cohort.enrolment_closes &&
      new Date(cohort.enrolment_closes).getTime() < t
    ) {
      return "closed";
    }
    if (cohort.capacity !== null && seatsTaken >= cohort.capacity) return "full";
    return "open";
  }

  /* Cohort-paced: delegate wholesale. `starts_on`/`ends_on` are calendar dates
     (no time), so a cohort ending on the 6th must stay live THROUGH the 6th —
     hence end-of-day Lagos, not midnight, or the last day of every course
     would read as "passed" while it was still running.

     `registrationState` derives `ends = ends_at ?? starts_at`, which is right
     for an event — an event always has a start, and a one-day event ends on the
     day it begins. A cohort is different: its dates are announced when they are
     known, and an open-ended run has no end at all. Falling back to the start
     would report both an undated cohort and an open-ended one as finished. Only
     an explicit `ends_on` may put a cohort in the past, so anything else passes
     a far-future sentinel. */
  return registrationState(
    {
      starts_at: dayStartUtc(cohort.starts_on),
      ends_at: cohort.ends_on ? dayEndUtc(cohort.ends_on) : FAR_FUTURE,
      registration_opens: cohort.enrolment_opens,
      registration_closes: cohort.enrolment_closes,
      capacity: cohort.capacity,
      registration_closed_manually: cohort.enrolment_closed_manually,
    },
    seatsTaken,
    now,
  );
}

/* A sentinel meaning "no end has been announced", not "ends in the year 9999".
   Only ever compared against, never displayed. */
const FAR_FUTURE = "9999-12-31T00:00:00.000Z";

/** Lagos is UTC+01:00 year-round with no DST, so the offset is a constant. */
function dayStartUtc(day: string | null): string {
  if (!day) return new Date(0).toISOString();
  return new Date(`${day}T00:00:00+01:00`).toISOString();
}

function dayEndUtc(day: string): string {
  return new Date(`${day}T23:59:59+01:00`).toISOString();
}

/** Plain-language labels per the §4 writing rules — never vague, never an apology. */
export const cohortLabel: Record<CohortState, string> = {
  open: "Enrolment open",
  not_yet_open: "Enrolment opens soon",
  closed: "Enrolment closed",
  full: "Fully booked",
  past: "This cohort has finished",
};

/** True when a learner may act on this cohort right now. */
export function canEnrol(state: CohortState): boolean {
  return state === "open";
}

/** §2.6 — store as a calendar date, display in Africa/Lagos. */
export function formatCohortDates(
  starts_on: string | null,
  ends_on: string | null,
  pacing: string = "cohort_paced",
): string {
  if (pacing === "self_paced") return "Start any time, study at your own pace";
  if (!starts_on) return "Dates to be announced";

  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const start = new Date(`${starts_on}T12:00:00Z`);
  if (!ends_on) return `Starts ${start.toLocaleDateString("en-GB", opts)}`;

  const end = new Date(`${ends_on}T12:00:00Z`);
  if (starts_on === ends_on) return start.toLocaleDateString("en-GB", opts);

  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth) {
    const d1 = start.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      day: "numeric",
    });
    return `${d1}–${end.toLocaleDateString("en-GB", opts)}`;
  }
  return `${start.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long" })} – ${end.toLocaleDateString("en-GB", opts)}`;
}

export const LEVEL_LABELS: Record<string, string> = {
  introductory: "Introductory",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const DELIVERY_LABELS: Record<string, string> = {
  online: "Online",
  in_person: "In person",
  blended: "Blended",
};

export const PACING_LABELS: Record<string, string> = {
  self_paced: "Self-paced",
  cohort_paced: "Cohort-paced",
};
