import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  count,
  searchParams,
}: {
  page: number;
  pageSize: number;
  count: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(Math.ceil(count / pageSize), 1);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-slate text-small">
        Showing {from}–{to} of {count}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="border-hairline text-ink text-small border px-3 py-1.5 font-medium"
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            className="border-hairline text-ink text-small border px-3 py-1.5 font-medium"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
