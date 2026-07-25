import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import type { StaffUser } from "@/lib/admin/auth";

export function AdminShell({
  user,
  children,
}: {
  user: StaffUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <AdminSidebar user={user} />
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
