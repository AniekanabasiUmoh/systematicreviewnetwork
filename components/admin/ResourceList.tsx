import Link from "next/link";
import Image from "next/image";
import type { AdminResource } from "@/lib/admin/resources";
import type { AdminRow } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/ui/Tag";
import { EmptyState } from "./EmptyState";

const STATUS_KEYS = new Set(["draft", "published"]);

function formatCell(
  value: unknown,
  kind: "text" | "datetime" | "status" | "thumbnail" | undefined,
) {
  if (kind === "datetime") {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(String(value)));
  }
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

function Cell({
  value,
  bold,
  kind,
}: {
  value: unknown;
  bold: boolean;
  kind?: "text" | "datetime" | "status" | "thumbnail";
}) {
  if (kind === "thumbnail") {
    return (
      <td className="px-4 py-3">
        {typeof value === "string" && value ? (
          <Image
            src={value}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-cover"
          />
        ) : (
          <div className="bg-mist h-10 w-10" aria-hidden />
        )}
      </td>
    );
  }
  if (kind === "status") {
    const status = String(value ?? "");
    return (
      <td className="px-4 py-3">
        {STATUS_KEYS.has(status) ? (
          <StatusBadge status={status as "draft" | "published"} label={status} />
        ) : (
          <span className="text-slate text-small">{status || "—"}</span>
        )}
      </td>
    );
  }
  return (
    <td
      className={`text-small px-4 py-4 ${bold ? "text-ink font-medium" : "text-slate"}`}
    >
      {formatCell(value, kind)}
    </td>
  );
}

export function ResourceList({
  resource,
  rows,
}: {
  resource: AdminResource;
  rows: AdminRow[];
}) {
  if (!rows.length)
    return (
      <EmptyState
        title={`No ${resource.labelPlural.toLowerCase()} yet`}
        body={`New ${resource.labelPlural.toLowerCase()} you add will appear here. Create the first ${resource.labelSingular.toLowerCase()} when it is ready.`}
        href={`/admin/${resource.key}/new`}
        action={`Add ${resource.labelSingular}`}
      />
    );

  const firstTextColumn = resource.listColumns.find(
    (col) => resource.listColumnKinds?.[col] !== "thumbnail",
  );
  const thumbnailColumn = resource.listColumns.find(
    (col) => resource.listColumnKinds?.[col] === "thumbnail",
  );
  const cardColumns = resource.listColumns.filter(
    (col) => col !== thumbnailColumn,
  );

  return (
    <>
      {/* Below sm: stacked cards. A reflowed table at 360px reads badly —
          duplicated markup is the honest fix (Design.md §8/§9.9b). */}
      <ul className="border-hairline bg-paper divide-hairline divide-y border sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 p-4">
            {thumbnailColumn ? (
              <Cell
                value={row[thumbnailColumn]}
                bold={false}
                kind="thumbnail"
              />
            ) : null}
            <Link
              href={`/admin/${resource.key}/${row.id}`}
              className="min-w-0 flex-1"
            >
              {cardColumns.map((column) => (
                <p
                  key={column}
                  className={
                    column === firstTextColumn
                      ? "text-ink text-small truncate font-medium"
                      : "text-slate text-small truncate"
                  }
                >
                  {resource.listColumnKinds?.[column] === "status" ? (
                    <StatusBadge
                      status={String(row[column] ?? "") as "draft" | "published"}
                      label={String(row[column] ?? "—")}
                    />
                  ) : (
                    formatCell(row[column], resource.listColumnKinds?.[column])
                  )}
                </p>
              ))}
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-hairline bg-paper hidden overflow-x-auto border sm:block">
        <table className="w-full min-w-150 text-left">
          <thead className="bg-mist text-slate text-small">
            <tr>
              {resource.listColumns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {resource.listColumnKinds?.[column] === "thumbnail"
                    ? ""
                    : column.replaceAll("_", " ")}
                </th>
              ))}
              <th className="px-4 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-hairline border-t">
                {resource.listColumns.map((column) => (
                  <Cell
                    key={column}
                    value={row[column]}
                    bold={column === firstTextColumn}
                    kind={resource.listColumnKinds?.[column]}
                  />
                ))}
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/${resource.key}/${row.id}`}
                    className="text-ink text-small font-semibold underline underline-offset-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
