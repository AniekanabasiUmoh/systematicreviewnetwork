import { describe, it, expect } from "vitest";
import { summarise, nextLessonId } from "@/lib/academy/progress";
import { isJoinable } from "@/lib/academy/sessions";

/* Sprint 6.5 — progress arithmetic and the join window.
 *
 * Pure functions, so they are tested across the whole range rather than at one
 * convenient point. The percentage is the number a learner stares at; getting
 * it wrong by rounding is a small bug that feels like a broken product. */

describe("summarise", () => {
  const lessons = ["a", "b", "c", "d"];

  it("is 0% with nothing done", () => {
    const result = summarise(new Set(), lessons);
    expect(result.completedCount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("is 100% when everything visible is done", () => {
    const result = summarise(new Set(lessons), lessons);
    expect(result.completedCount).toBe(4);
    expect(result.percent).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(summarise(new Set(["a"]), ["a", "b", "c"]).percent).toBe(33);
    expect(summarise(new Set(["a", "b"]), ["a", "b", "c"]).percent).toBe(67);
  });

  it("is 0%, never NaN, when there is nothing to complete", () => {
    const result = summarise(new Set(), []);
    expect(result.percent).toBe(0);
    expect(Number.isNaN(result.percent)).toBe(false);
  });

  it("ignores completions for lessons that are not visible", () => {
    /* A learner who finished a module that has since been unpublished must not
       show 125%. The denominator is what they can see now. */
    const result = summarise(new Set(["a", "b", "gone"]), ["a", "b"]);
    expect(result.completedCount).toBe(2);
    expect(result.percent).toBe(100);
  });

  it("never exceeds 100%", () => {
    const result = summarise(new Set(["a", "x", "y", "z"]), ["a"]);
    expect(result.percent).toBeLessThanOrEqual(100);
  });
});

describe("nextLessonId — resume where you left off", () => {
  const lessons = ["a", "b", "c"];

  it("starts at the first lesson when nothing is done", () => {
    expect(nextLessonId(new Set(), lessons)).toBe("a");
  });

  it("skips what is finished", () => {
    expect(nextLessonId(new Set(["a"]), lessons)).toBe("b");
    expect(nextLessonId(new Set(["a", "b"]), lessons)).toBe("c");
  });

  it("returns the first GAP, not the furthest point", () => {
    // Someone who jumped ahead and did lesson 3 should be sent back to 2,
    // which is the one they have not done.
    expect(nextLessonId(new Set(["a", "c"]), lessons)).toBe("b");
  });

  it("returns null when everything is done", () => {
    expect(nextLessonId(new Set(lessons), lessons)).toBeNull();
  });

  it("returns null when there is nothing to do", () => {
    expect(nextLessonId(new Set(), [])).toBeNull();
  });
});

describe("isJoinable — when a live link is worth showing", () => {
  const session = {
    starts_at: "2026-09-01T14:00:00Z",
    duration_minutes: 60,
  };
  const at = (iso: string) => new Date(iso);

  it("is closed well before the session", () => {
    expect(isJoinable(session, at("2026-09-01T10:00:00Z"))).toBe(false);
  });

  it("is closed sixteen minutes before", () => {
    expect(isJoinable(session, at("2026-09-01T13:44:00Z"))).toBe(false);
  });

  it("opens fifteen minutes before", () => {
    expect(isJoinable(session, at("2026-09-01T13:45:00Z"))).toBe(true);
  });

  it("is open during the session", () => {
    expect(isJoinable(session, at("2026-09-01T14:30:00Z"))).toBe(true);
  });

  it("is open at the last minute", () => {
    expect(isJoinable(session, at("2026-09-01T15:00:00Z"))).toBe(true);
  });

  it("closes once the session has ended", () => {
    expect(isJoinable(session, at("2026-09-01T15:01:00Z"))).toBe(false);
  });

  it("respects a longer session's duration", () => {
    const long = { starts_at: "2026-09-01T14:00:00Z", duration_minutes: 180 };
    expect(isJoinable(long, at("2026-09-01T16:30:00Z"))).toBe(true);
    expect(isJoinable(long, at("2026-09-01T17:30:00Z"))).toBe(false);
  });
});
