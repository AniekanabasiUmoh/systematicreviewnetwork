import { describe, expect, it } from "vitest";
import { lagosDateTime, slugify } from "@/lib/actions/admin-schemas";
import { escapePostgrestSearch } from "@/lib/admin/queries";
import { sanitizeRichText } from "@/lib/admin/richtext";

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
