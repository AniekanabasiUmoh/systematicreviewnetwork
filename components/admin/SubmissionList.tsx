import Link from "next/link";
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

function StatusCell({ value }: { value: unknown }) {
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
}: {
  resource: SubmissionResource;
  rows: Array<Record<string, unknown> & { id: string }>;
  emptyBody: string;
}) {
  const listColumns = resource.columns.filter((c) => c.inList !== false);

  if (!rows.length)
    return (
      <EmptyState
        title={`No ${resource.labelPlural.toLowerCase()} yet`}
        body={emptyBody}
      />
    );

  return (
    <div className="border-hairline bg-paper overflow-x-auto border">
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
                    <StatusCell value={row[col.name]} />
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
