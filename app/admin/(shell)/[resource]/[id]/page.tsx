import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { formResource, getResource } from "@/lib/admin/resources";
import { getRow, auditForResource } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { PublishControl } from "@/components/admin/PublishControl";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { RetireButton } from "@/components/admin/RetireButton";
import { AuditList } from "@/components/admin/AuditList";

export const dynamic = "force-dynamic";

export default async function EditAdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  await requireStaff();
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource || resource.singleton) notFound();
  const row = await getRow(resource, id);
  if (!row) notFound();
  const history = await auditForResource(resource.key, id);
  const status =
    row.status === "draft" || row.status === "published" ? row.status : null;
  return (
    <>
      <AdminPageHeader
        title={`Edit ${resource.labelSingular}`}
        description="Changes are saved immediately to the draft copy. Publish only when the content is ready for the public site."
      />
      {resource.publishable && status ? (
        <PublishControl resource={resource.key} id={id} status={status} />
      ) : null}
      <ResourceForm resource={formResource(resource)} initial={row} />
      {resource.key === "programmes" ? (
        <RetireButton
          id={id}
          name={String(row.title ?? resource.labelSingular)}
          archived={Boolean(row.archived_at)}
        />
      ) : null}
      <DeleteButton
        resource={resource.key}
        id={id}
        name={String(row.title ?? row.name ?? resource.labelSingular)}
      />

      <div className="mt-8">
        <h2 className="text-ink text-small font-semibold">History</h2>
        <div className="mt-3">
          <AuditList
            rows={history}
            emptyText="No recorded changes yet."
          />
        </div>
      </div>
    </>
  );
}
