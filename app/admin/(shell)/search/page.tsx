import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { searchAllContent } from "@/lib/admin/search";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const results = q ? await searchAllContent(q) : [];

  return (
    <>
      <AdminPageHeader
        title="Search"
        description={q ? `Results for "${q}"` : "Search across every content type."}
      />
      {!q ? (
        <p className="text-slate text-small">
          Enter a search term above to find events, news, resources,
          programmes, team members, testimonials, and partners.
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          title="No matches"
          body={`Nothing in the admin matched "${q}". Check the spelling, or try a shorter term.`}
        />
      ) : (
        <ul className="border-hairline bg-paper divide-hairline divide-y border">
          {results.map((result) => (
            <li key={`${result.resourceKey}-${result.id}`}>
              <Link
                href={`/admin/${result.resourceKey}/${result.id}`}
                className="hover:bg-mist flex items-center justify-between gap-4 px-4 py-3 transition-colors"
              >
                <span className="text-ink text-small font-medium">
                  {result.title}
                </span>
                <span className="text-slate text-[0.75rem]">
                  {result.labelSingular}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
