import { describe, expect, it } from "vitest";
import { csvCell, csvRow, toCsv, csvFilename } from "@/lib/admin/csv";

describe("csvCell", () => {
  it("passes plain values through untouched", () => {
    expect(csvCell("Adébáyọ̀ Ọlámidé")).toBe("Adébáyọ̀ Ọlámidé");
    expect(csvCell(1500)).toBe("1500");
  });

  it("quotes cells containing a comma, quote, or newline (RFC 4180)", () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null/undefined as an empty cell", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("neutralises CSV formula injection with a leading apostrophe", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell("@import")).toBe("'@import");
    expect(csvCell("\tx")).toBe("'\tx");
    // \r also matches the RFC 4180 "needs quoting" rule, so the injection
    // prefix is applied first and the whole cell is then quoted.
    expect(csvCell("\rx")).toBe('"\'\rx"');
  });

  it("does not treat ordinary content starting with a hyphen-like character as a formula unless it matches the leading set", () => {
    expect(csvCell("Adébáyọ̀")).toBe("Adébáyọ̀");
    expect(csvCell(1500)).toBe("1500");
  });
});

describe("toCsv", () => {
  it("prefixes the output with a UTF-8 BOM at byte 0", () => {
    const csv = toCsv(["a"], [["1"]]);
    expect(csv.codePointAt(0)).toBe(0xfeff);
  });

  it("round-trips diacritics byte-identically", () => {
    const csv = toCsv(["name"], [["Adébáyọ̀ Ọlámidé"]]);
    expect(csv).toContain("Adébáyọ̀ Ọlámidé");
  });

  it("uses CRLF line terminators", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    expect(csv).toContain("a,b\r\n1,2\r\n");
  });
});

describe("csvRow", () => {
  it("joins cells with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });
});

describe("csvFilename", () => {
  it("shapes the filename as srn-<table>-<yyyy-mm-dd>.csv", () => {
    expect(csvFilename("registrations", new Date("2026-07-25T12:00:00Z"))).toBe(
      "srn-registrations-2026-07-25.csv",
    );
  });
});
