import { requireStaff } from "@/lib/admin/auth";
import { formResource, getResource } from "@/lib/admin/resources";
import { getRow } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";

export const dynamic = "force-dynamic";

export default async function HomepageAdminPage() {
  await requireStaff();
  const resource = getResource("homepage")!;
  const initial = await getRow(resource, "true");
  return (
    <>
      <AdminPageHeader
        title="Homepage"
        description="Update the homepage copy and hero image. Changes are visible on the public site after saving."
      />
      <ResourceForm resource={formResource(resource)} initial={initial} />
    </>
  );
}
