import { describe, it, expect } from "vitest";
import { moduleReleased } from "@/lib/academy/curriculum";
import { moduleSchema, lessonSchema } from "@/lib/actions/admin-schemas";

/* Sprint 6.3 — drip release and the curriculum schemas.
 *
 * The case that matters most is decision 1: a self-paced learner must NEVER hit
 * a locked module, whatever release_rule says and whatever date is stored. That
 * is asserted against every rule, not just the convenient one. */

const at = (iso: string) => new Date(iso);
const NOW = at("2026-07-26T09:00:00Z");

describe("moduleReleased — self-paced (decision 1)", () => {
  it("opens a future-dated module anyway", () => {
    const result = moduleReleased(
      { release_rule: "on_date", release_on: "2027-01-01T00:00:00Z" },
      "self_paced",
      false,
      NOW,
    );
    expect(result.released).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("opens an after_previous module even when the previous is incomplete", () => {
    expect(
      moduleReleased(
        { release_rule: "after_previous", release_on: null },
        "self_paced",
        false,
        NOW,
      ).released,
    ).toBe(true);
  });

  it("never locks a self-paced module under any rule", () => {
    for (const rule of ["immediate", "on_date", "after_previous"] as const) {
      const result = moduleReleased(
        { release_rule: rule, release_on: "2099-01-01T00:00:00Z" },
        "self_paced",
        false,
        NOW,
      );
      expect(result.released).toBe(true);
    }
  });
});

describe("moduleReleased — cohort-paced", () => {
  it("opens an immediate module", () => {
    expect(
      moduleReleased(
        { release_rule: "immediate", release_on: null },
        "cohort_paced",
        false,
        NOW,
      ).released,
    ).toBe(true);
  });

  it("locks a module whose date has not arrived, and says when", () => {
    const result = moduleReleased(
      { release_rule: "on_date", release_on: "2026-09-01T00:00:00Z" },
      "cohort_paced",
      true,
      NOW,
    );
    expect(result.released).toBe(false);
    expect(result.reason).toContain("September");
    expect(result.reason).not.toContain("[");
  });

  it("opens a module once its date has passed", () => {
    expect(
      moduleReleased(
        { release_rule: "on_date", release_on: "2026-07-01T00:00:00Z" },
        "cohort_paced",
        true,
        NOW,
      ).released,
    ).toBe(true);
  });

  it("does not lock an on_date module with no date set", () => {
    // The database refuses this combination, but a rule change could leave a
    // row behind. Failing open on a MISSING date is right: the alternative
    // locks paid learners out of material with no way to say when it opens.
    expect(
      moduleReleased(
        { release_rule: "on_date", release_on: null },
        "cohort_paced",
        true,
        NOW,
      ).released,
    ).toBe(true);
  });

  it("locks after_previous until the previous module is complete", () => {
    const locked = moduleReleased(
      { release_rule: "after_previous", release_on: null },
      "cohort_paced",
      false,
      NOW,
    );
    expect(locked.released).toBe(false);
    expect(locked.reason).toBe("Finish the previous module to open this one.");

    expect(
      moduleReleased(
        { release_rule: "after_previous", release_on: null },
        "cohort_paced",
        true,
        NOW,
      ).released,
    ).toBe(true);
  });

  it("gives every locked reason a plain sentence with no apology", () => {
    const reasons = [
      moduleReleased(
        { release_rule: "on_date", release_on: "2026-09-01T00:00:00Z" },
        "cohort_paced",
        true,
        NOW,
      ).reason,
      moduleReleased(
        { release_rule: "after_previous", release_on: null },
        "cohort_paced",
        false,
        NOW,
      ).reason,
    ];
    for (const reason of reasons) {
      expect(reason).toBeTruthy();
      expect(reason!.toLowerCase()).not.toContain("sorry");
      expect(reason).not.toContain("[");
    }
  });
});

describe("moduleSchema", () => {
  const valid = {
    course_id: "8f1b0f7e-0000-4000-8000-000000000000",
    cohort_id: "",
    title: "Framing a question",
    summary: "",
    release_rule: "immediate",
    release_on: "",
  };

  it("accepts a course-scoped module", () => {
    expect(moduleSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a cohort-scoped module", () => {
    const parsed = moduleSchema.safeParse({
      ...valid,
      course_id: "",
      cohort_id: "8f1b0f7e-0000-4000-8000-000000000001",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a module with both parents", () => {
    expect(
      moduleSchema.safeParse({
        ...valid,
        cohort_id: "8f1b0f7e-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("rejects a module with no parent", () => {
    expect(
      moduleSchema.safeParse({ ...valid, course_id: "", cohort_id: "" }).success,
    ).toBe(false);
  });

  it("rejects an on_date rule with no date — it would publish early", () => {
    expect(
      moduleSchema.safeParse({ ...valid, release_rule: "on_date" }).success,
    ).toBe(false);
  });

  it("accepts an on_date rule with a date", () => {
    expect(
      moduleSchema.safeParse({
        ...valid,
        release_rule: "on_date",
        release_on: "2026-09-01T09:00",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown release rule", () => {
    expect(
      moduleSchema.safeParse({ ...valid, release_rule: "whenever" }).success,
    ).toBe(false);
  });

  it("requires a title", () => {
    expect(moduleSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });
});

describe("lessonSchema", () => {
  const valid = {
    module_id: "8f1b0f7e-0000-4000-8000-000000000000",
    title: "What a systematic review is",
    summary: "",
    body_rich: "",
    estimated_minutes: "",
  };

  it("accepts a minimal lesson", () => {
    expect(lessonSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a module", () => {
    expect(lessonSchema.safeParse({ ...valid, module_id: "" }).success).toBe(
      false,
    );
  });

  it("rejects zero or negative minutes but allows blank", () => {
    expect(
      lessonSchema.safeParse({ ...valid, estimated_minutes: "0" }).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse({ ...valid, estimated_minutes: "-5" }).success,
    ).toBe(false);
    expect(
      lessonSchema.safeParse({ ...valid, estimated_minutes: "45" }).success,
    ).toBe(true);
    expect(lessonSchema.safeParse(valid).success).toBe(true);
  });
});
