/* Sprint 6.4 — what a roster row is CALLED.
 *
 * Deliberately its own module rather than a helper inside Roster.tsx, so it can
 * be unit-tested. These strings are the ones a staffer reads to decide whether
 * someone owes money, holds a seat, or needs chasing — getting them wrong is a
 * real error even though nothing crashes.
 *
 * The rule: never surface a column value. `not_required` is what the database
 * calls an invoice or a free place; a staffer should never have to learn that.
 *
 * No `server-only`: pure strings, imported by a client component and by tests.
 */

export type RosterStatusInput = {
  state: string;
  payment_status: string;
  amount_kobo: number;
};

export function rosterStatusLabel(row: RosterStatusInput): string {
  if (row.payment_status === "refunded") return "Refunded — seat freed";
  if (row.state === "withdrawn") return "Left the cohort — seat freed";
  if (row.payment_status === "pending")
    return "Started paying, not finished — no seat held";
  if (row.state === "completed") return "Finished the course";
  if (row.payment_status === "not_required")
    return row.amount_kobo > 0 ? "Paid by invoice" : "Free place";
  return "Paid by card";
}

/** True when this row occupies one of the cohort's seats. Mirrors the three
    rules in getCohortSeatCounts — kept in step by the test that asserts both. */
export function holdsSeat(row: {
  state: string;
  payment_status: string;
  cancelled_at: string | null;
}): boolean {
  return (
    row.cancelled_at === null &&
    ["active", "completed"].includes(row.state) &&
    ["paid", "not_required"].includes(row.payment_status)
  );
}
