import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { formResource, getResource } from "@/lib/admin/resources";
import { getRow } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { PublishControl } from "@/components/admin/PublishControl";
import { DeleteButton } from "@/components/admin/DeleteButton";

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
      <DeleteButton
        resource={resource.key}
        id={id}
        name={String(row.title ?? row.name ?? resource.labelSingular)}
      />
    </>
  );
}
