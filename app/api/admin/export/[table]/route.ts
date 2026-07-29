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

  /* Sprint 7.2 — flatten per-event answers into real columns.
   *
   * §7.2: "CSV export must flatten the jsonb into columns — otherwise the
   * export is unusable, which is the whole point of Sprint 5.3." A column of
   * raw JSON is not an export, it is a puzzle.
   *
   * ARCHIVED questions are included. Someone answered them; dropping the
   * column would silently misrepresent the data, and archiving exists
   * precisely so those answers survive. */
  const extra: Array<{ id: string; label: string }> = [];
  if (resource.table === "registrations") {
    const eventIds = [
      ...new Set(
        rows
          .map((r) => r.event_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    if (eventIds.length > 0) {
      const { data: questionRows } = await supabaseAdmin
        .from("event_questions")
        .select("id, label, sort_order")
        .in("event_id", eventIds)
        .order("sort_order", { ascending: true });

      for (const q of (questionRows ?? []) as Array<{
        id: string;
        label: string;
      }>) {
        // Two events can ask the same question; one column, not two.
        if (!extra.some((e) => e.label === q.label)) extra.push(q);
        else {
          const existing = extra.find((e) => e.label === q.label)!;
          // Remember both ids so either event's answer lands in the column.
          existing.id = `${existing.id},${q.id}`;
        }
      }
    }
  }

  const answerFor = (row: Record<string, unknown>, ids: string) => {
    const answers = row.answers;
    if (!answers || typeof answers !== "object") return "";
    const map = answers as Record<string, unknown>;
    for (const id of ids.split(",")) {
      const value = map[id];
      if (typeof value === "string" && value !== "") return value;
    }
    return "";
  };

  const csv = toCsv(
    [...exportColumns.map((c) => c.label), ...extra.map((e) => e.label)],
    rows.map((row) => [
      ...exportColumns.map((c) => row[c.name]),
      ...extra.map((e) => answerFor(row, e.id)),
    ]),
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
