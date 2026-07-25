import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSearchBox } from "./AdminSearchBox";
import type { StaffUser } from "@/lib/admin/auth";

export function AdminShell({
  user,
  children,
}: {
  user: StaffUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full lg:flex">
      <AdminSidebar user={user} />
      <div className="min-w-0 flex-1">
        <div className="border-hairline bg-paper hidden justify-end border-b px-8 py-3 lg:flex">
          <AdminSearchBox />
        </div>
        <main className="px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
