import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { getResource } from "@/lib/admin/resources";
import { listRows } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceList } from "@/components/admin/ResourceList";
import { SortableList } from "@/components/admin/SortableList";

export const dynamic = "force-dynamic";

export default async function AdminResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; status?: "draft" | "published" }>;
}) {
  await requireStaff();
  const { resource: key } = await params;
  const search = await searchParams;
  const resource = getResource(key);
  if (!resource || resource.singleton) notFound();
  const { rows } = await listRows(resource, {
    search: search.q,
    status: search.status,
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
      <form className="mb-5 flex gap-3">
        <input
          name="q"
          defaultValue={search.q}
          placeholder={`Search ${resource.labelPlural.toLowerCase()}`}
          className="border-hairline bg-paper text-ink text-small w-full max-w-md border px-3 py-2"
        />
        {resource.publishable ? (
          <select
            name="status"
            defaultValue={search.status ?? ""}
            className="border-hairline bg-paper text-ink text-small border px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        ) : null}
        <button className="border-ink text-ink text-small border px-4 py-2 font-semibold">
          Filter
        </button>
      </form>
      {body}
    </>
  );
}
