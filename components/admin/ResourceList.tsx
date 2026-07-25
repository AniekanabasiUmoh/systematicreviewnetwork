import Link from "next/link";
import type { AdminResource } from "@/lib/admin/resources";
import type { AdminRow } from "@/lib/admin/queries";
import { EmptyState } from "./EmptyState";

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
        body={`Create the first ${resource.labelSingular.toLowerCase()} when it is ready to publish.`}
        href={`/admin/${resource.key}/new`}
        action={`Add ${resource.labelSingular}`}
      />
    );
  return (
    <div className="border-hairline bg-paper overflow-x-auto border">
      <table className="w-full min-w-150 text-left">
        <thead className="bg-mist text-slate text-small">
          <tr>
            {resource.listColumns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column.replaceAll("_", " ")}
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
              <td className="text-ink text-small px-4 py-4 font-medium">
                {String(row[resource.listColumns[0]] ?? "—")}
              </td>
              {resource.listColumns.slice(1).map((column) => (
                <td key={column} className="text-slate text-small px-4 py-4">
                  {String(row[column] ?? "—")}
                </td>
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
  );
}
