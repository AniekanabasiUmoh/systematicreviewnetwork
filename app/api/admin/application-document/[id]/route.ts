import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 7.1 — a reviewer opening an applicant's document.
 *
 * 401 when signed out rather than a redirect: a redirect returns an HTML
 * sign-in page dressed as a download, which is confusing and useless.
 *
 * Audited, like the 6.6 submission download. Opening somebody's CV is worth a
 * record — it is personal data, and the audit table has carried every other
 * admin action since 5.1. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Sign in to open this.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { id } = await ctx.params;
  const { data } = await supabaseAdmin
    .from("application_documents")
    .select("id, storage_path, file_name, application_id")
    .eq("id", id)
    .maybeSingle();

  const doc = data as {
    storage_path: string;
    file_name: string;
    application_id: string;
  } | null;
  if (!doc)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  const { data: signed, error } = await supabaseAdmin.storage
    .from("application-documents")
    .createSignedUrl(doc.storage_path, 300);
  if (error || !signed)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  void recordAudit(
    user,
    "export",
    "application_documents",
    id,
    `Opened ${doc.file_name}`,
  );

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
