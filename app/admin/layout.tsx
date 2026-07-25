import type { Metadata } from "next";

/* Admin root layout. No public chrome — the sidebar shell lives in
 * app/admin/(shell)/layout.tsx as a route group, so /admin/login sits outside
 * it. `robots: noindex` is already the site-wide default from the root
 * layout; repeated here so it can never regress independently of that. */

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · SRN Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-mist min-h-full">{children}</div>;
}
