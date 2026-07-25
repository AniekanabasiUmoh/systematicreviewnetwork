"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Handshake,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Newspaper,
  Quote,
  UserCog,
  Users,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { signOut } from "@/lib/actions/admin-auth";
import type { StaffUser } from "@/lib/admin/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_GROUPS: ReadonlyArray<{ label: string; items: readonly NavItem[] }> =
  [
    {
      label: "Content",
      items: [
        { href: "/admin/homepage", label: "Homepage", icon: Home },
        { href: "/admin/events", label: "Events", icon: Calendar },
        { href: "/admin/news", label: "News", icon: Newspaper },
        { href: "/admin/resources", label: "Resources", icon: BookOpen },
        { href: "/admin/pages", label: "Site pages", icon: FileText },
      ],
    },
    {
      label: "People & community",
      items: [
        { href: "/admin/team", label: "Team", icon: Users },
        { href: "/admin/partners", label: "Partners", icon: Handshake },
        { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
      ],
    },
    {
      label: "Organisation",
      items: [
        { href: "/admin/impact", label: "Impact statistics", icon: BarChart3 },
        { href: "/admin/reach", label: "Countries reached", icon: MapPinned },
      ],
    },
    {
      label: "Library",
      items: [
        { href: "/admin/media", label: "Media library", icon: ImageIcon },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          href: "/admin/operations",
          label: "Registrations & submissions",
          icon: ClipboardList,
        },
      ],
    },
  ];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  compact = false,
}: {
  item: NavItem;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`text-small flex items-center gap-3 border-l-2 font-medium transition-colors ${
        compact ? "px-3 py-2 whitespace-nowrap" : "px-3 py-2.5"
      } ${
        active
          ? "border-evidence bg-paper/10 text-paper"
          : "text-paper/70 hover:bg-paper/5 hover:text-paper border-transparent"
      }`}
    >
      <Icon icon={item.icon} size="sm" color="current" />
      {item.label}
    </Link>
  );
}

function UserNav({ user }: { user: StaffUser }) {
  if (user.role !== "admin") return null;
  return (
    <NavLink
      item={{ href: "/admin/users", label: "Staff access", icon: UserCog }}
    />
  );
}

export function AdminSidebar({ user }: { user: StaffUser }) {
  return (
    <>
      <aside className="bg-ink hidden h-full w-64 shrink-0 flex-col lg:flex">
        <div className="px-6 py-6">
          <Link
            href="/admin"
            className="text-display-tight text-paper text-[1.25rem] tracking-[-0.02em]"
          >
            SRN Admin
          </Link>
          <p className="text-paper/55 mt-1 text-[0.75rem]">Content workspace</p>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-3">
            <NavLink
              item={{
                href: "/admin",
                label: "Overview",
                icon: LayoutDashboard,
                exact: true,
              }}
            />
          </div>
          {NAV_GROUPS.map((group) => (
            <section
              key={group.label}
              className="mb-5"
              aria-label={group.label}
            >
              <h2 className="text-paper/40 px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {group.label}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {user.role === "admin" ? (
            <section aria-label="Administration">
              <h2 className="text-paper/40 px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                Administration
              </h2>
              <UserNav user={user} />
            </section>
          ) : null}
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
      </aside>

      <header className="bg-ink lg:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" className="text-display-tight text-paper text-lg">
            SRN Admin
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-small text-paper/70">
              Sign out
            </button>
          </form>
        </div>
        <nav
          aria-label="Admin"
          className="border-paper/10 flex overflow-x-auto border-t px-2 pb-2"
        >
          <NavLink
            compact
            item={{
              href: "/admin",
              label: "Overview",
              icon: LayoutDashboard,
              exact: true,
            }}
          />
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
            <NavLink compact item={item} key={item.href} />
          ))}
          <UserNav user={user} />
        </nav>
      </header>
    </>
  );
}
