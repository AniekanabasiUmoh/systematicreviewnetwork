import { describe, it, expect } from "vitest";
import {
  collectAnswers,
  questionOptions,
  labelledAnswers,
  missingMessage,
  fieldName,
  type EventQuestion,
} from "@/lib/events/questions";
import { checkEventEligibility } from "@/lib/events/certificates";
import {
  applicantStatusLabel,
  applicantNextStep,
  stepIndex,
} from "@/lib/academy/applications";

/* Phase 7 — the pure logic behind the member area.
 *
 * The cases that matter are the ones where a form post cannot be trusted: a
 * crafted answer to a question that belongs to another event, a select value
 * nobody offered, and an unchecked box that must record "No" rather than
 * nothing at all. */

const q = (over: Partial<EventQuestion> = {}): EventQuestion =>
  ({
    id: "11111111-1111-4111-8111-111111111111",
    event_id: "e",
    label: "What is your review topic?",
    help_text: null,
    field_type: "short_text",
    options: [],
    required: false,
    sort_order: 0,
    archived_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  }) as EventQuestion;

describe("collectAnswers", () => {
  it("keeps a plain answer", () => {
    const question = q();
    const { answers, missing } = collectAnswers([question], () => "Maternal health");
    expect(answers[question.id]).toBe("Maternal health");
    expect(missing).toHaveLength(0);
  });

  it("records an unchecked box as No, not as nothing", () => {
    /* A blank could mean "they said no" or "we never asked". An export that
       cannot tell those apart is worse than one that is longer. */
    const question = q({ field_type: "checkbox" });
    const { answers } = collectAnswers([question], () => null);
    expect(answers[question.id]).toBe("No");
  });

  it("records a checked box as Yes", () => {
    const question = q({ field_type: "checkbox" });
    const { answers } = collectAnswers([question], () => "on");
    expect(answers[question.id]).toBe("Yes");
  });

  it("refuses a select value that was never offered", () => {
    const question = q({
      field_type: "select",
      options: ["Yes", "No"] as never,
      required: true,
    });
    const { answers, missing } = collectAnswers([question], () => "Maybe");
    expect(answers[question.id]).toBeUndefined();
    expect(missing).toHaveLength(1);
  });

  it("accepts a select value that was offered", () => {
    const question = q({ field_type: "select", options: ["Yes", "No"] as never });
    const { answers } = collectAnswers([question], () => "No");
    expect(answers[question.id]).toBe("No");
  });

  it("reports every missing required answer at once", () => {
    const a = q({ id: "a", label: "First", required: true });
    const b = q({ id: "b", label: "Second", required: true });
    const { missing } = collectAnswers([a, b], () => "");
    expect(missing).toHaveLength(2);
    expect(missingMessage(missing)).toContain("First");
    expect(missingMessage(missing)).toContain("Second");
  });

  it("does not flag a blank optional answer", () => {
    const { missing } = collectAnswers([q({ required: false })], () => "");
    expect(missing).toHaveLength(0);
  });

  it("only reads its own field name", () => {
    const question = q({ id: "abc" });
    const read = (name: string) => (name === fieldName("abc") ? "mine" : "theirs");
    const { answers } = collectAnswers([question], read);
    expect(answers["abc"]).toBe("mine");
  });

  it("caps a long answer so one post cannot bloat the row", () => {
    const question = q({ field_type: "long_text" });
    const { answers } = collectAnswers([question], () => "x".repeat(5000));
    expect(answers[question.id]!.length).toBe(2000);
  });

  it("caps a short answer harder than a long one", () => {
    const question = q({ field_type: "short_text" });
    const { answers } = collectAnswers([question], () => "x".repeat(5000));
    expect(answers[question.id]!.length).toBe(500);
  });
});

describe("questionOptions", () => {
  it("returns strings only, never junk from a hand-edited row", () => {
    expect(
      questionOptions({ options: ["a", 3, null, "b"] as never }),
    ).toEqual(["a", "b"]);
  });

  it("survives a non-array", () => {
    expect(questionOptions({ options: "nope" as never })).toEqual([]);
  });
});

describe("labelledAnswers", () => {
  it("pairs answers with their question label", () => {
    const question = q({ id: "x", label: "Topic" });
    const rows = labelledAnswers([question], { x: "Maternal health" });
    expect(rows).toEqual([{ label: "Topic", value: "Maternal health" }]);
  });

  it("drops questions nobody answered", () => {
    expect(labelledAnswers([q({ id: "x" })], {})).toEqual([]);
  });

  it("survives a null answers column", () => {
    expect(labelledAnswers([q()], null)).toEqual([]);
  });
});

describe("checkEventEligibility — §7.3", () => {
  const base = {
    attended_at: "2026-08-05T10:00:00Z",
    cancelled_at: null,
    payment_status: "not_required",
  };

  it("allows someone who attended a free event", () => {
    expect(checkEventEligibility(base).eligible).toBe(true);
  });

  it("allows someone who attended a paid event", () => {
    expect(
      checkEventEligibility({ ...base, payment_status: "paid" }).eligible,
    ).toBe(true);
  });

  it("refuses a no-show — the certificate says they attended", () => {
    const result = checkEventEligibility({ ...base, attended_at: null });
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("Attendance");
  });

  it("refuses a cancelled registration", () => {
    const result = checkEventEligibility({
      ...base,
      cancelled_at: "2026-08-01T00:00:00Z",
    });
    expect(result.eligible).toBe(false);
  });

  it("refuses an abandoned checkout — they never held a place", () => {
    const result = checkEventEligibility({ ...base, payment_status: "pending" });
    expect(result.eligible).toBe(false);
  });

  it("gives every refusal a plain sentence with no jargon", () => {
    for (const patch of [
      { attended_at: null },
      { cancelled_at: "2026-01-01T00:00:00Z" },
      { payment_status: "pending" },
    ]) {
      const result = checkEventEligibility({ ...base, ...patch });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason.length).toBeGreaterThan(0);
        expect(result.reason).not.toContain("_");
        expect(result.reason.toLowerCase()).not.toContain("sorry");
      }
    }
  });
});

describe("applicant-facing status — §7.1", () => {
  it("never shows a raw database value", () => {
    for (const status of [
      "received",
      "under_review",
      "accepted",
      "waitlisted",
      "rejected",
    ]) {
      const label = applicantStatusLabel(status);
      expect(label).not.toContain("_");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("says something useful at every stage", () => {
    for (const status of [
      "received",
      "under_review",
      "accepted",
      "waitlisted",
      "rejected",
    ]) {
      const next = applicantNextStep(status);
      expect(next).toBeTruthy();
      expect(next!.toLowerCase()).not.toContain("sorry");
    }
  });

  it("is not unkind about a rejection", () => {
    expect(applicantStatusLabel("rejected")).toBe("Not this time");
    expect(applicantNextStep("rejected")).toContain("apply again");
  });

  it("walks the stepper forward and stops at the decision", () => {
    expect(stepIndex("received")).toBe(0);
    expect(stepIndex("under_review")).toBe(1);
    for (const decided of ["accepted", "waitlisted", "rejected"]) {
      expect(stepIndex(decided)).toBe(2);
    }
  });
});
