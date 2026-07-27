import { describe, it, expect } from "vitest";
import { generateCode, normaliseCode } from "@/lib/academy/certificates";

/* Sprint 6.7 — the verification code.
 *
 * The code is the credential. Two properties matter and are tested here rather
 * than assumed: it must not be guessable, and it must survive being read off a
 * printed page and typed back in by someone who did not create it. */

describe("generateCode", () => {
  it("has the shape printed on the certificate", () => {
    expect(generateCode()).toMatch(/^SRN(-[A-Z0-9]{4}){3}$/);
  });

  it("never uses a glyph that can be misread", () => {
    /* 0/O and 1/I/L are the classic transcription failures. A genuine
       certificate refused because someone typed O for 0 is the worst outcome
       this feature has, so those characters are simply not in the alphabet. */
    for (let i = 0; i < 400; i += 1) {
      const body = generateCode().replace(/^SRN-/, "").replace(/-/g, "");
      expect(body).not.toMatch(/[OIL01]/);
      expect(body).toHaveLength(12);
    }
  });

  it("does not repeat across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i += 1) seen.add(generateCode());
    expect(seen.size).toBe(5000);
  });

  it("uses a wide spread of the alphabet, not a narrow one", () => {
    /* A weak generator can produce well-formed codes with almost no entropy.
       Sampling the character distribution catches that; a correct one touches
       nearly all 31 symbols within a few hundred draws. */
    const chars = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      for (const ch of generateCode().replace(/^SRN-/, "").replace(/-/g, "")) {
        chars.add(ch);
      }
    }
    expect(chars.size).toBeGreaterThanOrEqual(28);
  });
});

describe("normaliseCode", () => {
  const canonical = "SRN-ABCD-EFGH-JKMN";

  it("accepts the code exactly as printed", () => {
    expect(normaliseCode(canonical)).toBe(canonical);
  });

  it("accepts lower case", () => {
    expect(normaliseCode("srn-abcd-efgh-jkmn")).toBe(canonical);
  });

  it("accepts it without hyphens", () => {
    expect(normaliseCode("SRNABCDEFGHJKMN")).toBe(canonical);
  });

  it("accepts it without the SRN prefix", () => {
    expect(normaliseCode("ABCD-EFGH-JKMN")).toBe(canonical);
  });

  it("accepts stray whitespace from a copy and paste", () => {
    expect(normaliseCode("  SRN-ABCD EFGH JKMN \n")).toBe(canonical);
  });

  it("accepts odd punctuation someone typed by hand", () => {
    expect(normaliseCode("SRN—ABCD_EFGH/JKMN")).toBe(canonical);
  });

  it("rejects a code of the wrong length", () => {
    expect(normaliseCode("SRN-ABCD-EFGH")).toBe("");
    expect(normaliseCode("SRN-ABCD-EFGH-JKMN-PQRS")).toBe("");
  });

  it("rejects empty and junk input without throwing", () => {
    expect(normaliseCode("")).toBe("");
    expect(normaliseCode("   ")).toBe("");
    expect(normaliseCode("hello")).toBe("");
  });

  it("round-trips anything the generator produces", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateCode();
      expect(normaliseCode(code)).toBe(code);
      expect(normaliseCode(code.toLowerCase())).toBe(code);
      expect(normaliseCode(code.replace(/-/g, ""))).toBe(code);
    }
  });
});
