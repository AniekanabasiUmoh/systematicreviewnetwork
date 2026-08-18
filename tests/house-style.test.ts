import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* House style, enforced.
 *
 * The client asked us to remove the em dashes from the public site (2026-08
 * corrections, "AS A GENERAL SUGGESTION, Please lets remove or limit the erm
 * dashes"). Fifty-four instances of prose were rewritten to earn their
 * punctuation instead — commas, full stops, or a restructured sentence.
 *
 * Without a test this decays: the next person writing copy reaches for the
 * dash, and nothing stops them. So the sweep is a property, not a one-off.
 *
 * Scope is public prose only. Code comments keep their dashes — they are
 * invisible to readers and carry the §-section provenance that makes this
 * codebase navigable. Admin and learner-area screens are staff-facing and out
 * of scope for the client's brief.
 *
 * ALLOWED lists the places an em dash is structural rather than prose: a
 * separator joining two data values in a heading, or a screen-reader label.
 * Those read correctly and are not what the client was objecting to. Add to it
 * only for genuine separators, never to excuse a sentence. */

/* Matched against the line's text, not its line number: an edit further up the
   file must not silently un-allow an entry, nor quietly re-allow a new one. */
const ALLOWED: RegExp[] = [
  // Heading separators joining two data values, e.g. "Apply — Mentorship".
  /lede=\{`\$\{course\.title\} — \$\{cohort\.label\}\.`\}/,
  /lede=\{`\$\{cohort\.label\} — \$\{formatCohortDates\(/,
  /`Apply — \$\{programme\.title\}`/,
  /`Certificate verified — \$\{result\.certificate\.course_title\}`/,
  // Page <title> in a route handler's inline HTML.
  /<title>Unsubscribed — Systematic Reviews Network<\/title>/,
  // Screen-reader-only suffix on the masthead link.
  /<span className="sr-only"> — Systematic Reviews Network, home<\/span>/,
];

const EM_DASH = "—";

/** Public prose files, straight from git so untracked scratch files can't trip it. */
function publicSourceFiles(): string[] {
  return execSync('git ls-files "app/(site)" components/site components/ui', {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((f) => /\.(tsx|ts)$/.test(f));
}

/* Strips comments well enough for this purpose: line comments, JSX comment
   blocks, and multi-line block comments. It only needs to decide whether a
   given LINE is comment or prose, not to parse TypeScript. */
function proseHits(src: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = [];
  let inBlock = false;

  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    const opens = (line.match(/\/\*/g) ?? []).length;
    const closes = (line.match(/\*\//g) ?? []).length;
    const startedInsideBlock = inBlock;
    if (opens > closes) inBlock = true;
    else if (closes > opens) inBlock = false;

    if (!line.includes(EM_DASH)) return;
    const isComment =
      startedInsideBlock ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("{/*");
    if (isComment) return;

    /* A trailing comment on a code line (`foo(); // note — here`) is still a
       comment. Only flag the dash if one survives with the trailing comment
       removed. Naive, but it cannot misfire: a "//" inside a string literal
       just truncates early and we under-report rather than false-positive. */
    const beforeComment = line.split("//")[0];
    if (!beforeComment.includes(EM_DASH)) return;

    hits.push({ line: i + 1, text: trimmed });
  });

  return hits;
}

describe("public prose contains no em dashes", () => {
  it("finds none outside the allow-list", () => {
    const offenders: string[] = [];

    for (const file of publicSourceFiles()) {
      for (const hit of proseHits(readFileSync(file, "utf8"))) {
        if (ALLOWED.some((pattern) => pattern.test(hit.text))) continue;
        offenders.push(`${file}:${hit.line}  ${hit.text.slice(0, 90)}`);
      }
    }

    expect(
      offenders,
      `Em dash in public prose. Rewrite the sentence — a comma, a full stop, ` +
        `or a restructure — rather than swapping in a semicolon:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("has no stale allow-list entries", () => {
    /* An entry that no longer matches anything is dead weight that quietly
       widens the exemption surface. If one fails here, the line it covered was
       rewritten — delete the entry rather than leaving it. */
    const lines = publicSourceFiles().flatMap((file) =>
      proseHits(readFileSync(file, "utf8")).map((hit) => hit.text),
    );
    const unused = ALLOWED.filter(
      (pattern) => !lines.some((line) => pattern.test(line)),
    );
    expect(unused.map(String)).toEqual([]);
  });

  it("still detects a dash that is not on the allow-list", () => {
    /* Guards the guard: if proseHits ever silently stops matching, the test
       above would pass vacuously and the rule would rot unnoticed. */
    const hits = proseHits(`const a = "one ${EM_DASH} two";`);
    expect(hits).toHaveLength(1);
  });

  it("ignores dashes inside comments", () => {
    expect(proseHits(`// a comment ${EM_DASH} with a dash`)).toEqual([]);
    expect(proseHits(`/*\n * block ${EM_DASH} dash\n */`)).toEqual([]);
    expect(proseHits(`{/* jsx ${EM_DASH} dash */}`)).toEqual([]);
    expect(proseHits(`const a = 1; // trailing ${EM_DASH} note`)).toEqual([]);
  });

  it("still flags prose on a line that also carries a comment", () => {
    const hits = proseHits(`const a = "one ${EM_DASH} two"; // fine`);
    expect(hits).toHaveLength(1);
  });
});
