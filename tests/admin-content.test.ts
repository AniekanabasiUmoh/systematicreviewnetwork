import { describe, expect, it } from "vitest";
import { lagosDateTime, slugify } from "@/lib/actions/admin-schemas";
import { escapePostgrestSearch } from "@/lib/admin/queries";
import { sanitizeRichText } from "@/lib/admin/richtext";
import { parseEmbedUrl } from "@/lib/admin/embeds";
import {
  APPLICATION_TRANSITIONS,
  canTransition,
  transitionRefusal,
} from "@/lib/admin/applications";
import {
  exclusiveUpperBound,
  inclusiveLowerBound,
  getSubmission,
} from "@/lib/admin/submissions";
import { getResource } from "@/lib/admin/resources";
import {
  programmeIcon,
  PROGRAMME_ICONS,
  PROGRAMME_ICON_OPTIONS,
} from "@/lib/admin/programme-icons";

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

describe("programme icons", () => {
  it("resolves every allowlisted name to its own component", () => {
    for (const name of Object.keys(PROGRAMME_ICONS)) {
      // Lucide icons are forwardRef objects, not plain functions.
      expect(programmeIcon(name)).toBe(
        PROGRAMME_ICONS[name as keyof typeof PROGRAMME_ICONS],
      );
    }
  });

  /* A stored icon name is data. A typo, a hand-edited row, or an icon removed
     from the allowlist must degrade to the default — never crash the public
     programmes hub. */
  it("falls back to the default for an unknown, null, or hostile name", () => {
    expect(programmeIcon("EvilComponent")).toBe(PROGRAMME_ICONS.GraduationCap);
    expect(programmeIcon(null)).toBe(PROGRAMME_ICONS.GraduationCap);
    expect(programmeIcon(undefined)).toBe(PROGRAMME_ICONS.GraduationCap);
    expect(programmeIcon("")).toBe(PROGRAMME_ICONS.GraduationCap);
    expect(programmeIcon("constructor")).toBe(PROGRAMME_ICONS.GraduationCap);
    expect(programmeIcon("__proto__")).toBe(PROGRAMME_ICONS.GraduationCap);
  });

  it("offers only allowlisted names in the admin select", () => {
    for (const option of PROGRAMME_ICON_OPTIONS) {
      expect(Object.keys(PROGRAMME_ICONS)).toContain(option.value);
    }
  });
});

describe("registry lookups reject prototype-chain keys", () => {
  /* getResource takes its key from FormData and getSubmission takes its key
     from a URL path segment — both attacker-controlled. A plain `in` check
     would resolve "constructor" to Object and hand it to code that then reads
     .table / .schema off it. */
  for (const hostile of ["constructor", "__proto__", "toString", "valueOf"]) {
    it(`getResource(${JSON.stringify(hostile)}) is null`, () => {
      expect(getResource(hostile)).toBeNull();
    });
    it(`getSubmission(${JSON.stringify(hostile)}) is null`, () => {
      expect(getSubmission(hostile)).toBeNull();
    });
  }

  it("still resolves genuine keys", () => {
    expect(getResource("events")?.table).toBe("events");
    expect(getSubmission("registrations")?.table).toBe("registrations");
  });
});

describe("parseEmbedUrl", () => {
  it("accepts a plain YouTube watch link", () => {
    const result = parseEmbedUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "A talk",
    );
    expect(result).toMatchObject({
      ok: true,
      provider: "youtube",
      id: "dQw4w9WgXcQ",
      inline: true,
    });
  });

  it("accepts a youtu.be short link", () => {
    const result = parseEmbedUrl("https://youtu.be/dQw4w9WgXcQ", "A talk");
    expect(result).toMatchObject({ ok: true, provider: "youtube", id: "dQw4w9WgXcQ" });
  });

  it("rejects a lookalike host (never a substring match)", () => {
    const result = parseEmbedUrl(
      "https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ",
      "A talk",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a pasted iframe rather than treating it as a link", () => {
    const result = parseEmbedUrl(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
      "A talk",
    );
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("embed code"),
    });
  });

  it("rejects a Zoom link carrying a meeting password", () => {
    const result = parseEmbedUrl(
      "https://zoom.us/j/123456789?pwd=secret",
      "Live session",
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a Zoom join link but marks it non-inline (never framed)", () => {
    const result = parseEmbedUrl("https://zoom.us/j/123456789", "Live session");
    expect(result).toMatchObject({
      ok: true,
      provider: "zoom_live",
      inline: false,
    });
  });

  it("rejects a missing title", () => {
    const result = parseEmbedUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a non-https link", () => {
    const result = parseEmbedUrl(
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "A talk",
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a Vimeo link", () => {
    const result = parseEmbedUrl("https://vimeo.com/76979871", "A talk");
    expect(result).toMatchObject({ ok: true, provider: "vimeo", id: "76979871" });
  });

  it("rejects an unrecognised provider", () => {
    const result = parseEmbedUrl("https://example.com/video/1", "A talk");
    expect(result.ok).toBe(false);
  });
});

describe("sanitizeRichText — embed nodes", () => {
  it("keeps a valid embed node and re-normalises its attrs", () => {
    const result = sanitizeRichText({
      type: "doc",
      content: [
        {
          type: "embed",
          attrs: {
            provider: "youtube",
            id: "dQw4w9WgXcQ",
            title: "A talk",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            inline: true,
          },
        },
      ],
    }) as { content: Array<{ type: string; attrs?: Record<string, unknown> }> };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].attrs?.provider).toBe("youtube");
  });

  it("drops an embed node whose stored URL no longer validates", () => {
    const result = sanitizeRichText({
      type: "doc",
      content: [
        {
          type: "embed",
          attrs: {
            provider: "youtube",
            id: "dQw4w9WgXcQ",
            title: "A talk",
            url: "https://evil.example/embed/dQw4w9WgXcQ",
            inline: true,
          },
        },
      ],
    }) as { content: unknown[] };
    expect(result.content).toHaveLength(0);
  });

  it("drops an embed node with a password in its stored URL", () => {
    const result = sanitizeRichText({
      type: "doc",
      content: [
        {
          type: "embed",
          attrs: {
            provider: "zoom_live",
            id: "https://zoom.us/j/123?pwd=secret",
            title: "Live session",
            url: "https://zoom.us/j/123?pwd=secret",
            inline: false,
          },
        },
      ],
    }) as { content: unknown[] };
    expect(result.content).toHaveLength(0);
  });
});
