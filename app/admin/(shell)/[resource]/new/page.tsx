import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { formResource, getResource } from "@/lib/admin/resources";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";

export const dynamic = "force-dynamic";

export default async function NewAdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  await requireStaff();
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource || resource.singleton) notFound();
  return (
    <>
      <AdminPageHeader
        title={`New ${resource.labelSingular}`}
        description={`Create a new ${resource.labelSingular.toLowerCase()} and save it as a draft when it is ready for review.`}
      />
      <ResourceForm resource={formResource(resource)} />
    </>
  );
}
