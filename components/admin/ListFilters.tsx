/* Sprint 5.9b — the search/status bar shared by the generic content list
 * ([resource]/page.tsx) and the operations submission screens
 * (SubmissionFilters), so both areas of admin behave identically. A change to
 * one no longer risks the other silently drifting. */

export function ListFilters({
  labelPlural,
  search,
  showStatus,
}: {
  labelPlural: string;
  search: { q?: string; status?: string };
  showStatus: boolean;
}) {
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
          placeholder={`Search ${labelPlural.toLowerCase()}`}
          className="border-hairline bg-paper text-ink text-small w-full max-w-xs border px-3 py-2"
        />
      </div>
      {showStatus ? (
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
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      ) : null}
      <button className="border-ink text-ink text-small border px-4 py-2 font-semibold">
        Filter
      </button>
    </form>
  );
}
