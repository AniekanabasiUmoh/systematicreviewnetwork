import { NextResponse } from "next/server";

import { verifyCode } from "@/lib/academy/certificates";
import { buildCertificatePdf } from "@/lib/academy/certificate-pdf";

/* Sprint 6.7 — the certificate PDF download.
 *
 * DELIBERATELY PUBLIC, keyed only on the code. Someone holding a certificate
 * needs to send it to an employer, and an employer checking one needs to see
 * the document. Requiring a sign-in would break the credential's whole purpose.
 *
 * That is safe precisely because the code is unguessable: 12 characters over a
 * 31-symbol alphabet from a CSPRNG. The PDF contains nothing the holder did not
 * already have, and the code is the thing they choose to share.
 *
 * A revoked certificate still renders — someone may have downloaded it before
 * it was withdrawn — but carries a REVOKED stamp, so a printed copy cannot be
 * passed off as current. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const result = await verifyCode(code);

  if (result.status === "unknown") {
    return new NextResponse("No certificate has that code.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const certificate = result.certificate;
  const pdf = await buildCertificatePdf(certificate, verifyUrl(certificate.code));

  const safeName = certificate.course_title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="srn-certificate-${safeName || "course"}.pdf"`,
      // Revocation must take effect immediately, so this is never cached.
      "Cache-Control": "no-store",
    },
  });
}

function verifyUrl(code: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org";
  return `${base}/verify/${code}`;
}
