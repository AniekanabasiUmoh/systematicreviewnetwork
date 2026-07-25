import Link from "next/link";
import type { ReactNode } from "react";
import type { SubmissionResource } from "@/lib/admin/submissions";
import { StatusBadge } from "@/components/ui/Tag";
import { EmptyState } from "./EmptyState";

function formatCell(
  value: unknown,
  kind: SubmissionResource["columns"][number]["kind"],
) {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "datetime") {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(String(value)));
  }
  if (kind === "money") {
    const kobo = Number(value);
    if (!kobo) return "Free";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(kobo / 100);
  }
  if (kind === "longtext") {
    const str = String(value);
    return str.length > 60 ? `${str.slice(0, 60)}…` : str;
  }
  return String(value);
}

const STATUS_KEYS = new Set([
  "received",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
  "paid",
  "pending",
  "failed",
  "expired",
  "refunded",
  "not_required",
  "draft",
  "published",
]);

function StatusCell({ column, value }: { column: string; value: unknown }) {
  /* unsubscribed_at isn't a status enum — it's a timestamp or null. The
     screen must still show unsubscribed rows (badged) even though the export
     never includes them (SubmissionResource.exportExclude). */
  if (column === "unsubscribed_at") {
    return value ? (
      <StatusBadge status="rejected" label="Unsubscribed" />
    ) : (
      <StatusBadge status="published" label="Subscribed" />
    );
  }
  const status = String(value ?? "");
  if (!STATUS_KEYS.has(status)) return <span className="text-slate">{status || "—"}</span>;
  return (
    <StatusBadge
      status={status as never}
      label={status.replaceAll("_", " ")}
    />
  );
}

export function SubmissionList({
  resource,
  rows,
  emptyBody,
  rowActions,
}: {
  resource: SubmissionResource;
  rows: Array<Record<string, unknown> & { id: string }>;
  emptyBody: string;
  /* Sprint 5.11 — optional per-row controls (registrations' attendance/cancel
     buttons). Kept generic rather than adding a registrations-only variant,
     so every screen keeps the same formatting, empty state, and mobile
     stacked-card layout. */
  rowActions?: (row: Record<string, unknown> & { id: string }) => ReactNode;
}) {
  const listColumns = resource.columns.filter((c) => c.inList !== false);

  if (!rows.length)
    return (
      <EmptyState
        title={`No ${resource.labelPlural.toLowerCase()} yet`}
        body={emptyBody}
      />
    );

  const CardBody = ({ row }: { row: Record<string, unknown> & { id: string } }) => (
    <>
      {listColumns.map((col, i) => (
        <p
          key={col.name}
          className={
            i === 0 ? "text-ink text-small truncate font-medium" : "text-slate text-small truncate"
          }
        >
          {col.kind === "status" ? (
            <StatusCell column={col.name} value={row[col.name]} />
          ) : (
            formatCell(row[col.name], col.kind)
          )}
        </p>
      ))}
    </>
  );

  return (
    <>
      {/* Below sm: stacked cards. A reflowed table at 360px reads badly —
          duplicated markup is the honest fix (Design.md §8/§9.9b). */}
      <ul className="border-hairline bg-paper divide-hairline divide-y border sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="p-4">
            {resource.detailHref ? (
              <Link href={resource.detailHref(row.id)} className="block">
                <CardBody row={row} />
              </Link>
            ) : (
              <CardBody row={row} />
            )}
            {rowActions ? <div className="mt-2">{rowActions(row)}</div> : null}
          </li>
        ))}
      </ul>

      <div className="border-hairline bg-paper hidden overflow-x-auto border sm:block">
        <table className="w-full min-w-150 text-left">
          <thead className="bg-mist text-slate text-small">
            <tr>
              {listColumns.map((col) => (
                <th key={col.name} className="px-4 py-3 font-medium">
                  {col.label}
                </th>
              ))}
              {resource.detailHref ? (
                <th className="px-4 py-3">
                  <span className="sr-only">Open</span>
                </th>
              ) : null}
              {rowActions ? (
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-hairline border-t">
                {listColumns.map((col, i) => (
                  <td
                    key={col.name}
                    title={col.kind === "longtext" ? String(row[col.name] ?? "") : undefined}
                    className={`text-small px-4 py-3 ${
                      i === 0 ? "text-ink font-medium" : "text-slate"
                    }`}
                  >
                    {col.kind === "status" ? (
                      <StatusCell column={col.name} value={row[col.name]} />
                    ) : (
                      formatCell(row[col.name], col.kind)
                    )}
                  </td>
                ))}
                {resource.detailHref ? (
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={resource.detailHref(row.id)}
                      className="text-ink text-small font-semibold underline underline-offset-2"
                    >
                      Open
                    </Link>
                  </td>
                ) : null}
                {rowActions ? (
                  <td className="px-4 py-3 text-right">{rowActions(row)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
