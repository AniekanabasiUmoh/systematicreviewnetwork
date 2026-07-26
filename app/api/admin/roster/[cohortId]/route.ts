import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/admin/auth";
import { listRoster, getCohortRow } from "@/lib/admin/academy";
import { toCsv, csvFilename } from "@/lib/admin/csv";
import { recordAudit } from "@/lib/admin/audit";

/* Sprint 6.4 — roster CSV.
 *
 * 401, never a redirect: a redirect returns an HTML sign-in page with a .csv
 * filename, which opens in Excel as a corrupt file and tells the staffer
 * nothing about what went wrong (the §5.6 rule).
 *
 * Refunded and withdrawn rows are INCLUDED and labelled. Filtering them out
 * would break finance reconciliation — the whole point of the export is to
 * match it against Paystack, which still holds those transactions. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ cohortId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Sign in to download this.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { cohortId } = await ctx.params;
  const cohort = await getCohortRow(cohortId);
  if (!cohort) return new NextResponse("Not found", { status: 404 });

  const rows = await listRoster(cohortId);

  const csv = toCsv(
    [
      "Name",
      "Email",
      "State",
      "Payment",
      "Amount",
      "Currency",
      "Enrolled",
      "Paid",
      "Cancelled",
      "Paystack reference",
    ],
    rows.map((row) => [
      row.full_name,
      row.email,
      row.state,
      row.payment_status,
      // Major units, so the column sums correctly in a spreadsheet.
      (row.amount_kobo / 100).toFixed(2),
      row.currency,
      row.enrolled_at,
      row.paid_at ?? "",
      row.cancelled_at ?? "",
      row.paystack_reference ?? "",
    ]),
  );

  void recordAudit(
    user,
    "export",
    "enrolments",
    cohortId,
    `Exported the roster for ${cohort.label} (${rows.length} rows)`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`roster-${cohort.slug}`)}"`,
      "Cache-Control": "no-store",
    },
  });
}
