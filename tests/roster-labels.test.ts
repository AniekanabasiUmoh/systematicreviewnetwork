import { describe, it, expect } from "vitest";
import { rosterStatusLabel, holdsSeat } from "@/lib/admin/roster-labels";

/* Sprint 6.4 — the words on the roster.
 *
 * These are not cosmetic. A staffer reads them to decide whether someone owes
 * money, holds a seat, or needs chasing, so a wrong or jargon label is a real
 * error even though nothing crashes. The last test is the guard that matters:
 * no database value may ever reach the screen. */

const base = { state: "active", payment_status: "paid", amount_kobo: 1_500_000 };

describe("rosterStatusLabel", () => {
  it("names a card payment plainly", () => {
    expect(rosterStatusLabel(base)).toBe("Paid by card");
  });

  it("distinguishes an invoice from a free place", () => {
    expect(
      rosterStatusLabel({ ...base, payment_status: "not_required" }),
    ).toBe("Paid by invoice");
    expect(
      rosterStatusLabel({
        ...base,
        payment_status: "not_required",
        amount_kobo: 0,
      }),
    ).toBe("Free place");
  });

  it("says an unfinished payment holds no seat", () => {
    const label = rosterStatusLabel({ ...base, payment_status: "pending" });
    expect(label).toContain("no seat");
  });

  it("says a refund freed the seat", () => {
    expect(rosterStatusLabel({ ...base, payment_status: "refunded" })).toContain(
      "seat freed",
    );
  });

  it("reports a refund even when the row also reads as withdrawn", () => {
    // Order matters: recordRefund() sets BOTH, and "Refunded" is the more
    // useful of the two facts for someone reconciling payments.
    expect(
      rosterStatusLabel({
        ...base,
        state: "withdrawn",
        payment_status: "refunded",
      }),
    ).toContain("Refunded");
  });

  it("never leaks a database value onto the screen", () => {
    const jargon = [
      "not_required",
      "payment_status",
      "paystack",
      "enrolment_state",
      "kobo",
      "null",
      "undefined",
    ];
    for (const state of ["pending", "active", "completed", "withdrawn"]) {
      for (const payment of [
        "not_required",
        "pending",
        "paid",
        "refunded",
        "failed",
      ]) {
        for (const amount of [0, 1_500_000]) {
          const label = rosterStatusLabel({
            state,
            payment_status: payment,
            amount_kobo: amount,
          });
          expect(label.length, `${state}/${payment}`).toBeGreaterThan(0);
          expect(label).not.toContain("[");
          expect(label).not.toContain("_");
          for (const word of jargon) {
            expect(
              label.toLowerCase(),
              `${state}/${payment} leaked "${word}"`,
            ).not.toContain(word);
          }
        }
      }
    }
  });
});

describe("holdsSeat — must agree with getCohortSeatCounts", () => {
  const seat = {
    state: "active",
    payment_status: "paid",
    cancelled_at: null as string | null,
  };

  it("counts a paid active enrolment", () => {
    expect(holdsSeat(seat)).toBe(true);
  });

  it("counts an invoiced or free place", () => {
    expect(holdsSeat({ ...seat, payment_status: "not_required" })).toBe(true);
  });

  it("counts someone who finished the course", () => {
    expect(holdsSeat({ ...seat, state: "completed" })).toBe(true);
  });

  it("does not count an unfinished payment", () => {
    expect(
      holdsSeat({ ...seat, state: "pending", payment_status: "pending" }),
    ).toBe(false);
  });

  it("does not count someone who withdrew", () => {
    expect(holdsSeat({ ...seat, state: "withdrawn" })).toBe(false);
  });

  it("does not count a cancelled or refunded row", () => {
    expect(holdsSeat({ ...seat, cancelled_at: "2026-07-26T00:00:00Z" })).toBe(
      false,
    );
    expect(holdsSeat({ ...seat, payment_status: "refunded" })).toBe(false);
  });
});
