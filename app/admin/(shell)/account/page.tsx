import { requireStaff } from "@/lib/admin/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireStaff();

  return (
    <>
      <AdminPageHeader
        title="Your account"
        description={`Signed in as ${user.email}.`}
      />
      <ChangePasswordForm />
    </>
  );
}
