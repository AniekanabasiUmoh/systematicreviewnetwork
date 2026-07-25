import type { AuditRow } from "@/lib/admin/queries";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function AuditList({
  rows,
  emptyText,
}: {
  rows: AuditRow[];
  emptyText: string;
}) {
  if (!rows.length) return <p className="text-slate text-small">{emptyText}</p>;
  return (
    <ul className="border-hairline divide-hairline divide-y border">
      {rows.map((row) => (
        <li key={row.id} className="px-4 py-3">
          <p className="text-ink text-small">{row.summary}</p>
          <p className="text-slate mt-1 text-[0.75rem]">
            {row.actor_email} · {formatWhen(row.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
