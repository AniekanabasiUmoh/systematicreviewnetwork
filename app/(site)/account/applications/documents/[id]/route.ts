import { NextResponse } from "next/server";

import { getLearner } from "@/lib/academy/auth";
import { getDocumentUrl } from "@/lib/academy/applications";

/* Sprint 7.1 — downloading your own supporting document.
 *
 * The only way bytes leave the private `application-documents` bucket for an
 * applicant. Same posture as the 6.3 material route: check ownership, mint a
 * short-lived signed URL, redirect, never expose the storage path.
 *
 * Every refusal is a 404. A 403 would confirm "this document exists and is not
 * yours", which is enough to learn that a particular person applied. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  new NextResponse("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const learner = await getLearner();
  if (!learner?.verified_at) return NOT_FOUND();

  const url = await getDocumentUrl(learner, id);
  if (!url) return NOT_FOUND();

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
