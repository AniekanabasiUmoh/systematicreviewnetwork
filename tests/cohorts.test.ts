import { describe, it, expect } from "vitest";
import {
  cohortState,
  cohortLabel,
  canEnrol,
  formatCohortDates,
  type CohortLike,
} from "@/lib/academy/cohorts";
import { cohortSchema, courseSchema } from "@/lib/actions/admin-schemas";

/* Sprint 6.2 — cohort state, pacing, and the admin schemas.
 *
 * The cases that matter are the ones where a cohort must NOT behave like an
 * event: a self-paced cohort never becomes "past", and a cohort-paced one must
 * stay open through the whole of its final day rather than closing at the
 * midnight that starts it. */

const base: CohortLike = {
  starts_on: null,
  ends_on: null,
  enrolment_opens: null,
  enrolment_closes: null,
  enrolment_closed_manually: false,
  capacity: null,
  pacing: "cohort_paced",
};

const at = (iso: string) => new Date(iso);

describe("cohortState — cohort-paced", () => {
  it("is open with no dates and no capacity", () => {
    expect(cohortState({ ...base }, 0, at("2026-07-26T09:00:00Z"))).toBe("open");
  });

  it("is past once the end date has fully elapsed in Lagos", () => {
    const cohort = { ...base, starts_on: "2026-03-02", ends_on: "2026-03-06" };
    // 23:30 Lagos on the final day = 22:30Z. The course is still running.
    expect(cohortState(cohort, 0, at("2026-03-06T22:30:00Z"))).toBe("open");
    // 00:30 Lagos the next day = 23:30Z on the 6th. Now it has finished.
    expect(cohortState(cohort, 0, at("2026-03-06T23:30:00Z"))).toBe("past");
  });

  it("treats the whole start day as live for a single-day cohort", () => {
    const cohort = { ...base, starts_on: "2026-03-02", ends_on: "2026-03-02" };
    expect(cohortState(cohort, 0, at("2026-03-02T15:00:00Z"))).toBe("open");
  });

  it("is not past when no dates have been announced", () => {
    // Regression: deriving the end from a missing start put every undated
    // cohort in 1970 and reported it as finished.
    expect(cohortState({ ...base }, 0, at("2026-07-26T09:00:00Z"))).toBe("open");
  });

  it("is not past when it started but has no announced end", () => {
    // An open-ended run that began last week is running, not finished. Only an
    // explicit ends_on can put a cohort in the past.
    const cohort = { ...base, starts_on: "2026-07-01", ends_on: null };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe("open");
  });

  it("is not_yet_open before the enrolment window", () => {
    const cohort = { ...base, enrolment_opens: "2026-08-01T00:00:00Z" };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe(
      "not_yet_open",
    );
  });

  it("is closed after the enrolment window", () => {
    const cohort = { ...base, enrolment_closes: "2026-07-20T00:00:00Z" };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe("closed");
  });

  it("is full when seats are taken", () => {
    const cohort = { ...base, capacity: 20 };
    expect(cohortState(cohort, 19, at("2026-07-26T09:00:00Z"))).toBe("open");
    expect(cohortState(cohort, 20, at("2026-07-26T09:00:00Z"))).toBe("full");
    expect(cohortState(cohort, 25, at("2026-07-26T09:00:00Z"))).toBe("full");
  });

  it("lets a manual close beat an otherwise-open window", () => {
    const cohort = {
      ...base,
      enrolment_closed_manually: true,
      enrolment_opens: "2026-01-01T00:00:00Z",
      enrolment_closes: "2026-12-31T00:00:00Z",
    };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe("closed");
  });

  it("reports past before closed — a finished cohort is not merely closed", () => {
    const cohort = {
      ...base,
      starts_on: "2026-01-01",
      ends_on: "2026-01-10",
      enrolment_closed_manually: true,
    };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe("past");
  });
});

describe("cohortState — self-paced (decision 1)", () => {
  const selfPaced: CohortLike = { ...base, pacing: "self_paced" };

  it("never becomes past, however old its nominal dates are", () => {
    const cohort = {
      ...selfPaced,
      starts_on: "2020-01-01",
      ends_on: "2020-02-01",
    };
    expect(cohortState(cohort, 0, at("2026-07-26T09:00:00Z"))).toBe("open");
  });

  it("still honours a manual close", () => {
    expect(
      cohortState(
        { ...selfPaced, enrolment_closed_manually: true },
        0,
        at("2026-07-26T09:00:00Z"),
      ),
    ).toBe("closed");
  });

  it("still honours an explicit enrolment window", () => {
    expect(
      cohortState(
        { ...selfPaced, enrolment_closes: "2026-07-01T00:00:00Z" },
        0,
        at("2026-07-26T09:00:00Z"),
      ),
    ).toBe("closed");
    expect(
      cohortState(
        { ...selfPaced, enrolment_opens: "2026-09-01T00:00:00Z" },
        0,
        at("2026-07-26T09:00:00Z"),
      ),
    ).toBe("not_yet_open");
  });

  it("still fills up", () => {
    expect(
      cohortState({ ...selfPaced, capacity: 5 }, 5, at("2026-07-26T09:00:00Z")),
    ).toBe("full");
  });
});

describe("labels", () => {
  it("gives every state a plain sentence with no apology", () => {
    for (const label of Object.values(cohortLabel)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label.toLowerCase()).not.toContain("sorry");
      expect(label).not.toContain("[");
    }
  });

  it("only lets an open cohort be enrolled in", () => {
    expect(canEnrol("open")).toBe(true);
    for (const state of ["not_yet_open", "closed", "full", "past"] as const) {
      expect(canEnrol(state)).toBe(false);
    }
  });

  it("describes a self-paced cohort without dates", () => {
    expect(formatCohortDates("2026-03-02", "2026-04-02", "self_paced")).toBe(
      "Start any time, study at your own pace",
    );
  });

  it("does not shift a date across a timezone boundary", () => {
    // The classic bug: a course starting on the 2nd advertised as the 1st.
    expect(formatCohortDates("2026-03-02", null)).toContain("2 March 2026");
  });

  it("says so plainly when dates are not set", () => {
    expect(formatCohortDates(null, null)).toBe("Dates to be announced");
  });
});

describe("cohortSchema", () => {
  const valid = {
    course_id: "8f1b0f7e-0000-4000-8000-000000000000",
    label: "Spring 2026",
    slug: "spring-2026",
    starts_on: "",
    ends_on: "",
    enrolment_opens: "",
    enrolment_closes: "",
    capacity: "",
    price_naira: "0",
    currency: "NGN",
    pacing: "cohort_paced",
  };

  it("accepts a free cohort and stores 0 kobo (decision 4)", () => {
    const parsed = cohortSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price_kobo).toBe(0);
  });

  it("converts naira to kobo without floating-point drift", () => {
    const parsed = cohortSchema.safeParse({ ...valid, price_naira: "15000" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price_kobo).toBe(1_500_000);
  });

  it("rejects a negative price", () => {
    expect(cohortSchema.safeParse({ ...valid, price_naira: "-1" }).success).toBe(
      false,
    );
  });

  it("rejects an end date before the start date", () => {
    const parsed = cohortSchema.safeParse({
      ...valid,
      starts_on: "2026-04-01",
      ends_on: "2026-03-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects enrolment closing before it opens", () => {
    const parsed = cohortSchema.safeParse({
      ...valid,
      enrolment_opens: "2026-04-01T09:00",
      enrolment_closes: "2026-03-01T09:00",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a capacity of zero — blank means unlimited, 0 means nobody", () => {
    expect(cohortSchema.safeParse({ ...valid, capacity: "0" }).success).toBe(
      false,
    );
    expect(cohortSchema.safeParse({ ...valid, capacity: "" }).success).toBe(true);
  });

  it("rejects an unknown pacing value", () => {
    expect(
      cohortSchema.safeParse({ ...valid, pacing: "whenever" }).success,
    ).toBe(false);
  });

  it("keeps a date as a bare calendar day, not an instant", () => {
    const parsed = cohortSchema.safeParse({ ...valid, starts_on: "2026-03-02" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.starts_on).toBe("2026-03-02");
  });

  it("requires a course", () => {
    expect(
      cohortSchema.safeParse({ ...valid, course_id: "" }).success,
    ).toBe(false);
  });
});

describe("courseSchema", () => {
  const valid = {
    title: "Introduction to Systematic Reviews",
    slug: "introduction-to-systematic-reviews",
    programme_id: "",
    summary: "",
    level: "introductory",
    delivery: "online",
    duration_label: "",
    learning_outcomes: "",
    prerequisites: "",
    featured_image_url: "",
    body_rich: "",
  };

  it("accepts a minimal course", () => {
    expect(courseSchema.safeParse(valid).success).toBe(true);
  });

  it("splits one-per-line outcomes and drops blank lines", () => {
    const parsed = courseSchema.safeParse({
      ...valid,
      learning_outcomes: "Frame a question\n\n  Search systematically  \n",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data.learning_outcomes).toEqual([
        "Frame a question",
        "Search systematically",
      ]);
  });

  it("rejects an invalid slug", () => {
    expect(
      courseSchema.safeParse({ ...valid, slug: "Not A Slug" }).success,
    ).toBe(false);
  });

  it("rejects an unknown level", () => {
    expect(courseSchema.safeParse({ ...valid, level: "expert" }).success).toBe(
      false,
    );
  });

  it("treats a blank programme as no programme rather than an empty id", () => {
    const parsed = courseSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.programme_id).toBeUndefined();
  });
});
