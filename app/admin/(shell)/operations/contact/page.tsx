import { requireStaff } from "@/lib/admin/auth";
import { getSubmission, listSubmissions } from "@/lib/admin/submissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OperationsTabs } from "@/components/admin/OperationsTabs";
import { SubmissionFilters } from "@/components/admin/SubmissionFilters";
import { SubmissionList } from "@/components/admin/SubmissionList";
import { Pagination } from "@/components/admin/Pagination";

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireStaff();
  const search = await searchParams;
  const resource = getSubmission("contact")!;
  const page = Number(search.page) || 1;

  const { rows, count, pageSize } = await listSubmissions(resource, {
    search: search.q,
    status: search.status,
    from: search.from,
    to: search.to,
    page,
  });

  return (
    <>
      <AdminPageHeader
        title="Contact messages"
        description="Messages sent through the contact and partnership forms."
      />
      <OperationsTabs />
      <SubmissionFilters resource={resource} search={search} />
      <SubmissionList
        resource={resource}
        rows={rows}
        emptyBody="No messages yet. Messages sent through the contact form appear here."
      />
      <Pagination page={page} pageSize={pageSize} count={count} searchParams={search} />
    </>
  );
}
