import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import {
  getSubmission,
  applySubmissionFilters,
  type SubmissionFilters,
} from "@/lib/admin/submissions";
import { toCsv, csvFilename } from "@/lib/admin/csv";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Sprint 5.6 — CSV export for the operations screens.
 *
 * A signed-out request returns 401 JSON, never a redirect: a redirect
 * response is HTML, and a browser or script following the download link
 * would silently save a corrupt "CSV" containing a login page. */

export async function GET(
  request: Request,
  ctx: { params: Promise<{ table: string }> },
) {
  const { table } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const resource = getSubmission(table);
  if (!resource)
    return NextResponse.json({ error: "Unknown export." }, { status: 404 });

  const url = new URL(request.url);
  const filters: SubmissionFilters = {
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  };

  const selectList = resource.columns.map((c) => c.name).join(",");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin.from(resource.table).select(selectList);
  query = applySubmissionFilters(query, resource, filters);
  if (resource.exportExclude) query = resource.exportExclude(query);
  query = query
    .order(resource.orderBy.column, {
      ascending: resource.orderBy.ascending ?? true,
    })
    .limit(10_000);

  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { error: "Could not build that export." },
      { status: 500 },
    );

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const exportColumns = resource.columns.filter((c) => c.inExport !== false);
  const csv = toCsv(
    exportColumns.map((c) => c.label),
    rows.map((row) => exportColumns.map((c) => row[c.name])),
  );

  void recordAudit(
    user,
    "export",
    resource.key,
    null,
    `Exported ${rows.length} ${resource.labelPlural.toLowerCase()}`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(resource.table)}"`,
      "Cache-Control": "no-store",
    },
  });
}
