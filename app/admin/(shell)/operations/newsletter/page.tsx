import { requireStaff } from "@/lib/admin/auth";
import { getSubmission, listSubmissions } from "@/lib/admin/submissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OperationsTabs } from "@/components/admin/OperationsTabs";
import { SubmissionFilters } from "@/components/admin/SubmissionFilters";
import { SubmissionList } from "@/components/admin/SubmissionList";
import { Pagination } from "@/components/admin/Pagination";

export const dynamic = "force-dynamic";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireStaff();
  const search = await searchParams;
  const resource = getSubmission("newsletter")!;
  const page = Number(search.page) || 1;

  const { rows, count, pageSize } = await listSubmissions(resource, {
    search: search.q,
    from: search.from,
    to: search.to,
    page,
  });

  return (
    <>
      <AdminPageHeader
        title="Newsletter subscribers"
        description="Everyone who has subscribed from the site."
      />
      <OperationsTabs />
      <SubmissionFilters resource={resource} search={search} />
      <SubmissionList
        resource={resource}
        rows={rows}
        emptyBody="No one has subscribed yet. New subscribers appear here as soon as they sign up."
      />
      <Pagination page={page} pageSize={pageSize} count={count} searchParams={search} />
    </>
  );
}
