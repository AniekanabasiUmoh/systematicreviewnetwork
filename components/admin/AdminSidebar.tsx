"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Newspaper,
  Users,
  BookOpen,
  BarChart3,
  Quote,
  Handshake,
  Home,
  FileText,
  Inbox,
  Image as ImageIcon,
  UserCog,
  LogOut,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { signOut } from "@/lib/actions/admin-auth";
import type { StaffUser } from "@/lib/admin/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/resources", label: "Resources", icon: BookOpen },
  { href: "/admin/impact", label: "Impact", icon: BarChart3 },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
] as const;

export function AdminSidebar({ user }: { user: StaffUser }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="bg-ink flex h-full w-60 shrink-0 flex-col">
      <div className="px-6 py-6">
        <Link
          href="/admin"
          className="text-display-tight text-paper text-[1.25rem] tracking-[-0.02em]"
        >
          SRN Admin
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href, "exact" in item && item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-small flex items-center gap-3 border-l-2 px-3 py-2.5 font-medium transition-colors ${
                    active
                      ? "border-evidence bg-paper/10 text-paper"
                      : "text-paper/70 hover:bg-paper/5 hover:text-paper border-transparent"
                  }`}
                >
                  <Icon icon={item.icon} size="sm" color="current" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {user.role === "admin" ? (
            <li>
              <Link
                href="/admin/users"
                aria-current={isActive("/admin/users") ? "page" : undefined}
                className={`text-small flex items-center gap-3 border-l-2 px-3 py-2.5 font-medium transition-colors ${
                  isActive("/admin/users")
                    ? "border-evidence bg-paper/10 text-paper"
                    : "text-paper/70 hover:bg-paper/5 hover:text-paper border-transparent"
                }`}
              >
                <Icon icon={UserCog} size="sm" color="current" />
                Users
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="border-paper/10 border-t px-3 py-4">
        <div className="px-3 pb-3">
          <p className="text-paper text-small truncate font-medium">
            {user.full_name || user.email}
          </p>
          <p className="text-paper/50 text-[0.8125rem] capitalize">
            {user.role}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-small text-paper/70 hover:bg-paper/5 hover:text-paper flex w-full items-center gap-3 px-3 py-2 font-medium transition-colors"
          >
            <Icon icon={LogOut} size="sm" color="current" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
