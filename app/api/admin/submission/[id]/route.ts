import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/admin/auth";
import { submissionFileUrl } from "@/lib/admin/grading";
import { supabaseAdmin } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/admin/audit";

/* Sprint 6.6 — downloading a learner's submitted file.
 *
 * A learner's work is at least as sensitive as a reading list, so it lives in
 * the same private bucket and is reached the same way: a short-lived signed URL
 * minted after the check, never a stored public link.
 *
 * 401 when signed out rather than a redirect — a redirect would hand back an
 * HTML sign-in page dressed as a download. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Sign in to download this.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { id } = await ctx.params;
  const { data } = await supabaseAdmin
    .from("submissions")
    .select("id, storage_path, file_name")
    .eq("id", id)
    .maybeSingle();

  const row = data as { storage_path: string | null; file_name: string | null } | null;
  if (!row?.storage_path)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  const url = await submissionFileUrl(row.storage_path);
  if (!url)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  /* Audited: reading someone's submitted work is worth a record, and the audit
     table has been carrying every other admin action since 5.1. */
  void recordAudit(
    user,
    "export",
    "submissions",
    id,
    `Downloaded ${row.file_name ?? "a submitted file"}`,
  );

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
