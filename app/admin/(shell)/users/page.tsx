import { requireStaff } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ForbiddenNotice } from "@/components/admin/ForbiddenNotice";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { UserRowActions } from "@/components/admin/UserRowActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireStaff();
  if (user.role !== "admin") return <ForbiddenNotice />;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: true });
  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Manage staff access. Keep at least one administrator account at all times."
      />
      <InviteUserForm />
      <section className="border-hairline bg-paper mt-8 overflow-x-auto border">
        <table className="w-full text-left">
          <thead className="bg-mist text-slate text-small">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((profile) => (
              <tr key={profile.id} className="border-hairline border-t">
                <td className="text-ink text-small px-4 py-3">
                  {profile.full_name ?? "—"}
                </td>
                <td className="text-slate text-small px-4 py-3">
                  {profile.email ?? "—"}
                </td>
                <td className="text-slate text-small px-4 py-3 capitalize">
                  {profile.role}
                </td>
                <td className="px-4 py-3">
                  <UserRowActions
                    id={profile.id}
                    role={profile.role}
                    isSelf={profile.id === user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
