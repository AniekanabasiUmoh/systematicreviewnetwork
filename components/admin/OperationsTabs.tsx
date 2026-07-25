"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/operations/registrations", label: "Registrations" },
  { href: "/admin/operations/applications", label: "Applications" },
  { href: "/admin/operations/newsletter", label: "Newsletter" },
  { href: "/admin/operations/contact", label: "Messages" },
  { href: "/admin/operations/donations", label: "Donations" },
] as const;

export function OperationsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Operations" className="border-hairline mb-6 flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`text-small shrink-0 border-b-2 px-4 py-2.5 font-medium transition-colors ${
              active
                ? "border-evidence text-ink"
                : "text-slate hover:text-ink border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
