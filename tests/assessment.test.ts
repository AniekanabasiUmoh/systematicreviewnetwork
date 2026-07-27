import { describe, it, expect } from "vitest";
import {
  isLate,
  showsDeadline,
  canAttempt,
  attemptsRemaining,
} from "@/lib/academy/assessment";

/* Sprint 6.6 — the attempt policy and the deadline rule.
 *
 * Decision 1 gets the most attention: a self-paced learner must never be late
 * and must never be shown a deadline, whatever due_at holds. */

const at = (iso: string) => new Date(iso);
const NOW = at("2026-09-15T12:00:00Z");

describe("isLate — decision 1 first", () => {
  it("is never late in a self-paced cohort, however old the due date", () => {
    expect(
      isLate({ due_at: "2020-01-01T00:00:00Z" }, "self_paced", NOW),
    ).toBe(false);
  });

  it("is not late before the deadline in a cohort-paced cohort", () => {
    expect(
      isLate({ due_at: "2026-10-01T00:00:00Z" }, "cohort_paced", NOW),
    ).toBe(false);
  });

  it("is late after the deadline in a cohort-paced cohort", () => {
    expect(
      isLate({ due_at: "2026-09-01T00:00:00Z" }, "cohort_paced", NOW),
    ).toBe(true);
  });

  it("is never late when no deadline is set", () => {
    expect(isLate({ due_at: null }, "cohort_paced", NOW)).toBe(false);
  });
});

describe("showsDeadline", () => {
  it("hides a deadline from a self-paced learner", () => {
    expect(
      showsDeadline({ due_at: "2026-10-01T00:00:00Z" }, "self_paced"),
    ).toBe(false);
  });

  it("shows one to a cohort-paced learner", () => {
    expect(
      showsDeadline({ due_at: "2026-10-01T00:00:00Z" }, "cohort_paced"),
    ).toBe(true);
  });

  it("shows nothing when there is no deadline", () => {
    expect(showsDeadline({ due_at: null }, "cohort_paced")).toBe(false);
  });
});

describe("canAttempt", () => {
  const unlimited = { max_attempts: null };
  const once = { max_attempts: 1 };
  const twice = { max_attempts: 2 };

  it("allows a first attempt", () => {
    const result = canAttempt(unlimited, []);
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.attempt).toBe(1);
  });

  it("numbers attempts upward", () => {
    const result = canAttempt(unlimited, [
      { attempt: 1, passed: false, state: "returned" },
      { attempt: 2, passed: false, state: "returned" },
    ]);
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.attempt).toBe(3);
  });

  it("stops once someone has passed", () => {
    const result = canAttempt(unlimited, [
      { attempt: 1, passed: true, state: "returned" },
    ]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("already passed");
  });

  it("stops while an attempt is still being marked", () => {
    const result = canAttempt(unlimited, [
      { attempt: 1, passed: null, state: "submitted" },
    ]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("still being marked");
  });

  it("enforces a single-attempt limit", () => {
    const result = canAttempt(once, [
      { attempt: 1, passed: false, state: "returned" },
    ]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("one attempt");
  });

  it("enforces a multi-attempt limit and counts it correctly", () => {
    expect(
      canAttempt(twice, [{ attempt: 1, passed: false, state: "returned" }])
        .allowed,
    ).toBe(true);
    const spent = canAttempt(twice, [
      { attempt: 1, passed: false, state: "returned" },
      { attempt: 2, passed: false, state: "returned" },
    ]);
    expect(spent.allowed).toBe(false);
    if (!spent.allowed) expect(spent.reason).toContain("all 2");
  });

  it("prefers the pass message over the limit message", () => {
    // Someone who passed on their last permitted attempt should be told they
    // passed, not that they are out of tries.
    const result = canAttempt(once, [
      { attempt: 1, passed: true, state: "returned" },
    ]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("passed");
  });

  it("gives every refusal a plain sentence with no apology or jargon", () => {
    const refusals = [
      canAttempt(unlimited, [{ attempt: 1, passed: true, state: "returned" }]),
      canAttempt(unlimited, [{ attempt: 1, passed: null, state: "submitted" }]),
      canAttempt(once, [{ attempt: 1, passed: false, state: "returned" }]),
    ];
    for (const refusal of refusals) {
      expect(refusal.allowed).toBe(false);
      if (!refusal.allowed) {
        expect(refusal.reason.length).toBeGreaterThan(0);
        expect(refusal.reason.toLowerCase()).not.toContain("sorry");
        expect(refusal.reason).not.toContain("[");
        expect(refusal.reason).not.toContain("_");
      }
    }
  });
});

describe("attemptsRemaining", () => {
  it("says nothing when attempts are unlimited", () => {
    expect(attemptsRemaining({ max_attempts: null }, 3)).toBeNull();
  });

  it("counts down and uses the singular correctly", () => {
    expect(attemptsRemaining({ max_attempts: 3 }, 0)).toBe("3 attempts left");
    expect(attemptsRemaining({ max_attempts: 3 }, 2)).toBe("1 attempt left");
  });

  it("says none left rather than a negative number", () => {
    expect(attemptsRemaining({ max_attempts: 2 }, 2)).toBe("No attempts left");
    expect(attemptsRemaining({ max_attempts: 2 }, 5)).toBe("No attempts left");
  });
});
