import { describe, expect, it } from "vitest";
import { lagosDateTime, slugify } from "@/lib/actions/admin-schemas";
import { escapePostgrestSearch } from "@/lib/admin/queries";
import { sanitizeRichText } from "@/lib/admin/richtext";
import {
  APPLICATION_TRANSITIONS,
  canTransition,
  transitionRefusal,
} from "@/lib/admin/applications";
import {
  exclusiveUpperBound,
  inclusiveLowerBound,
} from "@/lib/admin/submissions";

const mediaBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;

describe("admin content helpers", () => {
  it("creates stable slugs from diacritics and punctuation", () => {
    expect(slugify("  Adébáyọ̀’s Evidence — 101! ")).toBe(
      "adebayos-evidence-101",
    );
  });

  it("converts Lagos wall time to UTC", () => {
    expect(lagosDateTime.parse("2026-08-01T09:00")).toBe(
      "2026-08-01T08:00:00.000Z",
    );
  });

  it("rejects malformed local dates", () => {
    expect(lagosDateTime.safeParse("2026-08-01 09:00").success).toBe(false);
  });

  it("strips javascript links, unsupported headings, and unknown nodes", () => {
    const result = sanitizeRichText({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "No" }],
        },
        { type: "script", content: [{ type: "text", text: "No" }] },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Safe",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    }) as {
      content: Array<{ type: string; content?: Array<{ marks?: unknown[] }> }>;
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].content?.[0].marks).toBeUndefined();
  });

  it("keeps only same-bucket rich-text images", () => {
    const result = sanitizeRichText({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://evil.example/image.jpg" } },
        { type: "image", attrs: { src: `${mediaBase}2026/08/evidence.jpg` } },
      ],
    }) as { content: Array<{ attrs?: { src?: string } }> };
    expect(result.content).toEqual([
      { type: "image", attrs: { src: `${mediaBase}2026/08/evidence.jpg` } },
    ]);
  });

  it("escapes PostgREST search grammar characters", () => {
    expect(escapePostgrestSearch("alpha, beta.(%_)")).toBe("alpha beta\\%\\_");
  });
});

describe("application status transitions", () => {
  it("allows every declared forward transition", () => {
    for (const [from, targets] of Object.entries(APPLICATION_TRANSITIONS)) {
      for (const to of targets) {
        expect(canTransition(from as never, to)).toBe(true);
      }
    }
  });

  it("refuses a transition that skips backward", () => {
    expect(canTransition("accepted", "received")).toBe(false);
    expect(canTransition("rejected", "accepted")).toBe(false);
  });

  it("refuses any transition out of a final status", () => {
    expect(canTransition("rejected", "accepted")).toBe(false);
    expect(canTransition("rejected", "under_review")).toBe(false);
  });

  it("gives a plain-language refusal sentence", () => {
    expect(transitionRefusal("accepted", "received")).toMatch(
      /cannot move directly to received/,
    );
  });
});

describe("submission date-range boundary (Lagos, UTC+01:00, no DST)", () => {
  it("computes an inclusive lower bound at Lagos midnight", () => {
    expect(inclusiveLowerBound("2026-07-25")).toBe(
      "2026-07-24T23:00:00.000Z",
    );
  });

  it("computes an exclusive upper bound at the NEXT day's Lagos midnight", () => {
    expect(exclusiveUpperBound("2026-07-25")).toBe(
      "2026-07-25T23:00:00.000Z",
    );
  });

  it("includes a timestamp late in the Lagos day (22:30 Lagos = 21:30Z)", () => {
    const lower = inclusiveLowerBound("2026-07-25")!;
    const upper = exclusiveUpperBound("2026-07-25")!;
    const lateInDay = new Date("2026-07-25T21:30:00.000Z").toISOString();
    expect(lateInDay >= lower && lateInDay < upper).toBe(true);
  });

  it("excludes a timestamp that has rolled into the next Lagos day", () => {
    const upper = exclusiveUpperBound("2026-07-25")!;
    const nextDay = new Date("2026-07-25T23:30:00.000Z").toISOString();
    expect(nextDay < upper).toBe(false);
  });

  it("returns null for a missing or malformed date", () => {
    expect(inclusiveLowerBound(undefined)).toBeNull();
    expect(exclusiveUpperBound("not-a-date")).toBeNull();
  });
});
