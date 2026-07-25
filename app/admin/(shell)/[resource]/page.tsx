import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { getResource } from "@/lib/admin/resources";
import { listRows } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceList } from "@/components/admin/ResourceList";
import { SortableList } from "@/components/admin/SortableList";
import { ListFilters } from "@/components/admin/ListFilters";
import { Pagination } from "@/components/admin/Pagination";

export const dynamic = "force-dynamic";

export default async function AdminResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{
    q?: string;
    status?: "draft" | "published";
    page?: string;
  }>;
}) {
  await requireStaff();
  const { resource: key } = await params;
  const search = await searchParams;
  const resource = getResource(key);
  if (!resource || resource.singleton) notFound();
  const page = Number(search.page) || 1;
  const { rows, count, pageSize } = await listRows(resource, {
    search: search.q,
    status: search.status,
    page,
  });
  const body = resource.sortColumn ? (
    <SortableList
      resource={resource.key}
      initialItems={rows.map((row) => ({
        id: row.id,
        label: String(row.name ?? row.label ?? row.value ?? "Untitled"),
      }))}
    />
  ) : (
    <ResourceList resource={resource} rows={rows} />
  );
  return (
    <>
      <AdminPageHeader
        title={resource.labelPlural}
        description={`Manage published and draft ${resource.labelPlural.toLowerCase()}.`}
        action={{
          href: `/admin/${resource.key}/new`,
          label: `Add ${resource.labelSingular}`,
        }}
      />
      <ListFilters
        labelPlural={resource.labelPlural}
        search={search}
        showStatus={Boolean(resource.publishable)}
      />
      {body}
      {!resource.sortColumn ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          count={count}
          searchParams={search}
        />
      ) : null}
    </>
  );
}
