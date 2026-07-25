import type { SubmissionResource } from "@/lib/admin/submissions";

export function SubmissionFilters({
  resource,
  search,
}: {
  resource: SubmissionResource;
  search: { q?: string; status?: string; from?: string; to?: string };
}) {
  const exportParams = new URLSearchParams();
  if (search.q) exportParams.set("search", search.q);
  if (search.status) exportParams.set("status", search.status);
  if (search.from) exportParams.set("from", search.from);
  if (search.to) exportParams.set("to", search.to);
  const exportHref = `/api/admin/export/${resource.key}${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <form className="mb-5 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className="text-slate text-[0.75rem] font-medium">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={search.q}
          placeholder={`Search ${resource.labelPlural.toLowerCase()}`}
          className="border-hairline bg-paper text-ink text-small w-full max-w-xs border px-3 py-2"
        />
      </div>
      {resource.statusColumn ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-slate text-[0.75rem] font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={search.status ?? ""}
            className="border-hairline bg-paper text-ink text-small border px-3 py-2"
          >
            <option value="">All statuses</option>
            {resource.statusOptions?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="from" className="text-slate text-[0.75rem] font-medium">
          From
        </label>
        <input
          id="from"
          type="date"
          name="from"
          defaultValue={search.from}
          className="border-hairline bg-paper text-ink text-small border px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="to" className="text-slate text-[0.75rem] font-medium">
          To
        </label>
        <input
          id="to"
          type="date"
          name="to"
          defaultValue={search.to}
          className="border-hairline bg-paper text-ink text-small border px-3 py-2"
        />
      </div>
      <button className="border-ink text-ink text-small border px-4 py-2 font-semibold">
        Filter
      </button>
      <a
        href={exportHref}
        className="bg-evidence text-paper text-small ml-auto px-4 py-2 font-semibold"
      >
        Export CSV
      </a>
    </form>
  );
}
