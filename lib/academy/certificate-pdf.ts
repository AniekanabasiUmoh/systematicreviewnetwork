import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Certificate } from "@/lib/academy/certificates";

/* Sprint 6.7 — the certificate PDF.
 *
 * pdf-lib rather than HTML-to-PDF (settled decision): no headless browser, no
 * ~50MB dependency, reliable on serverless. The cost is that every position is
 * computed by hand, so the design is deliberately simple and typographic —
 * which is also what the site's own design language asks for.
 *
 * Brand rules from §0.1 apply here as everywhere: no gold, green is a rule and
 * a seal mark only and never text, plain white, sharp corners. The exact hexes
 * are lifted from app/globals.css so the certificate cannot drift from the
 * site's palette.
 *
 * INTER IS EMBEDDED RATHER THAN USING A STANDARD PDF FONT, and that is not a
 * design preference. pdf-lib's built-in fonts are WinAnsi-encoded, which cannot
 * represent "ọ" or "ẹ" — it THROWS rather than substituting. For an
 * organisation whose learners are largely Nigerian, that would mean certificate
 * generation crashing on a correctly spelled Yoruba name. Verified against
 * "Adébáyọ̀ Ọlámidé" before this file was written. Subsetting keeps the output
 * around 6 KB. */

const INK = rgb(0x16 / 255, 0x18 / 255, 0x2b / 255); // --color-ink
const SLATE = rgb(0x49 / 255, 0x4c / 255, 0x63 / 255); // --color-slate
const EVIDENCE = rgb(0x1f / 255, 0x6f / 255, 0x5c / 255); // --color-evidence
const HAIRLINE = rgb(0.85, 0.85, 0.87);

// A4 landscape, in points.
const WIDTH = 841.89;
const HEIGHT = 595.28;
const MARGIN = 56;

function centre(
  font: PDFFont,
  text: string,
  size: number,
): number {
  return (WIDTH - font.widthOfTextAtSize(text, size)) / 2;
}

/** Letter-spacing for uppercase labels — pdf-lib has no option for it. */
function tracked(text: string): string {
  return text.split("").join(" ");
}

/**
 * Shrinks a size until the text fits the available width.
 *
 * Names vary enormously in length — "Ada Ali" and a full Nigerian name with
 * four parts cannot share a fixed point size without one of them overflowing
 * the page. Measuring and stepping down is what keeps every certificate
 * looking deliberate.
 */
function fitted(
  font: PDFFont,
  text: string,
  ideal: number,
  maxWidth: number,
  floor = 12,
): number {
  let size = ideal;
  while (size > floor && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

export async function buildCertificatePdf(
  certificate: Certificate,
  verifyUrl: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  pdf.setTitle(`SRN certificate — ${certificate.course_title}`);
  pdf.setAuthor("Systematic Reviews Network");
  pdf.setSubject(`Certificate of completion for ${certificate.learner_name}`);
  pdf.setProducer("systematicreviewsnetwork.org");

  const page = pdf.addPage([WIDTH, HEIGHT]);

  pdf.registerFontkit(fontkit);
  /* One face. pdf-lib takes a variable font's default instance and offers no
     way to select another, so hierarchy on this page comes from size and colour
     rather than weight — which suits the site's typographic restraint anyway. */
  const face = await pdf.embedFont(readFileSync(fontPath()), { subset: true });

  /* A hairline rule inset from the trim, not a decorative border. Sharp
     corners, one weight — the same restraint as the site. */
  page.drawRectangle({
    x: MARGIN / 2,
    y: MARGIN / 2,
    width: WIDTH - MARGIN,
    height: HEIGHT - MARGIN,
    borderColor: HAIRLINE,
    borderWidth: 0.75,
  });

  let y = HEIGHT - MARGIN - 40;

  /* Issuer. pdf-lib has no letter-spacing option, so the tracking that the
     site's uppercase labels carry is produced by spacing the characters —
     measured the same way, so centring still works. */
  const issuer = tracked("SYSTEMATIC REVIEWS NETWORK");
  page.drawText(issuer, {
    x: centre(face, issuer, 11),
    y,
    size: 11,
    font: face,
    color: INK,
  });

  y -= 58;

  const lede = "This is to certify that";
  page.drawText(lede, {
    x: centre(face, lede, 14),
    y,
    size: 14,
    font: face,
    color: SLATE,
  });

  y -= 52;

  // The name — the largest thing on the page, and the reason it exists.
  const nameSize = fitted(
    face,
    certificate.learner_name,
    36,
    WIDTH - MARGIN * 3,
    18,
  );
  page.drawText(certificate.learner_name, {
    x: centre(face, certificate.learner_name, nameSize),
    y,
    size: nameSize,
    font: face,
    color: INK,
  });

  y -= 20;

  // A short rule under the name, in the action colour. A mark, never text.
  const ruleWidth = Math.min(
    260,
    face.widthOfTextAtSize(certificate.learner_name, nameSize) + 40,
  );
  page.drawLine({
    start: { x: (WIDTH - ruleWidth) / 2, y },
    end: { x: (WIDTH + ruleWidth) / 2, y },
    thickness: 1.5,
    color: EVIDENCE,
  });

  y -= 40;

  /* Sprint 7.3 — one PDF, two kinds of thing being certified. You COMPLETE a
     course; you ATTEND a workshop, and claiming otherwise on a document whose
     whole value is accuracy would be a small lie in a conspicuous place.
     `cohort_label` is "Attendance" only for event certificates, which is what
     issueEventCertificate writes. */
  const isAttendance = certificate.cohort_label === "Attendance";
  const completed = isAttendance ? "attended" : "has completed";
  page.drawText(completed, {
    x: centre(face, completed, 14),
    y,
    size: 14,
    font: face,
    color: SLATE,
  });

  y -= 40;

  const titleSize = fitted(
    face,
    certificate.course_title,
    24,
    WIDTH - MARGIN * 3,
    14,
  );
  page.drawText(certificate.course_title, {
    x: centre(face, certificate.course_title, titleSize),
    y,
    size: titleSize,
    font: face,
    color: INK,
  });

  y -= 26;

  /* For an event the label is the literal word "Attendance", which adds
     nothing beside a date — the line above already says "attended". */
  const cohortLine = isAttendance
    ? (certificate.cohort_dates ?? "")
    : certificate.cohort_dates
      ? `${certificate.cohort_label} · ${certificate.cohort_dates}`
      : certificate.cohort_label;
  const cohortSize = fitted(face, cohortLine, 12, WIDTH - MARGIN * 3, 9);
  page.drawText(cohortLine, {
    x: centre(face, cohortLine, cohortSize),
    y,
    size: cohortSize,
    font: face,
    color: SLATE,
  });

  /* Footer: the date on the left, the verification code and URL on the right.
     The code is the load-bearing part of the whole document — it is what makes
     this checkable rather than merely printable — so it is set larger than the
     lines around it and given room. */
  const footerY = MARGIN + 6;

  page.drawLine({
    start: { x: MARGIN, y: footerY + 46 },
    end: { x: WIDTH - MARGIN, y: footerY + 46 },
    thickness: 0.75,
    color: HAIRLINE,
  });

  const awarded = `Awarded ${formatDate(certificate.completed_on)}`;
  page.drawText(awarded, {
    x: MARGIN,
    y: footerY + 24,
    size: 10,
    font: face,
    color: SLATE,
  });

  page.drawText("Systematic Reviews Network", {
    x: MARGIN,
    y: footerY + 8,
    size: 10,
    font: face,
    color: INK,
  });

  const codeLabel = "Verify this certificate";
  const codeLabelWidth = face.widthOfTextAtSize(codeLabel, 9);
  page.drawText(codeLabel, {
    x: WIDTH - MARGIN - codeLabelWidth,
    y: footerY + 32,
    size: 9,
    font: face,
    color: SLATE,
  });

  const codeWidth = face.widthOfTextAtSize(certificate.code, 13);
  page.drawText(certificate.code, {
    x: WIDTH - MARGIN - codeWidth,
    y: footerY + 16,
    size: 13,
    font: face,
    color: INK,
  });

  const urlWidth = face.widthOfTextAtSize(verifyUrl, 8.5);
  page.drawText(verifyUrl, {
    x: WIDTH - MARGIN - urlWidth,
    y: footerY + 2,
    size: 8.5,
    font: face,
    color: SLATE,
  });

  /* Revoked certificates still render — someone may have downloaded one before
     it was withdrawn — but say so unmistakably, so a printed copy cannot be
     passed off as current. */
  if (certificate.revoked_at) {
    const stamp = tracked("REVOKED");
    page.drawText(stamp, {
      x: centre(face, stamp, 64),
      y: HEIGHT / 2 - 24,
      size: 64,
      font: face,
      color: rgb(0.72, 0.24, 0.16),
      opacity: 0.28,
    });
  }

  return pdf.save();
}

/**
 * Where the font file lives at runtime.
 *
 * `process.cwd()` is the project root both locally and in a Vercel serverless
 * function, but the file is only present in the bundle because
 * `outputFileTracingIncludes` in next.config.ts names it — a plain import would
 * not pull a .ttf in, and the route would fail at runtime rather than at build.
 */
function fontPath(): string {
  return join(process.cwd(), "assets", "fonts", "Inter.ttf");
}

/** Africa/Lagos, matching every other date on the site (§2.6). */
function formatDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
