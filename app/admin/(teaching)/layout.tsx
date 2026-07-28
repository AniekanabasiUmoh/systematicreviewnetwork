import Link from "next/link";

import { requireInstructor } from "@/lib/admin/auth";

/* Sprint 6.8 — the instructor shell.
 *
 * A SEPARATE route group from (shell), and that separation is the boundary.
 *
 * (shell)/layout.tsx opens with requireStaff(), which returns null for an
 * instructor — so every page under it is already closed to them without any of
 * those pages knowing instructors exist. This group is the mirror image:
 * requireInstructor() here, and staff get nothing from it either.
 *
 * The nav is deliberately minimal. An instructor has one job in this system,
 * and a sidebar full of links they cannot follow would be worse than no
 * sidebar. */

export const dynamic = "force-dynamic";

export default async function TeachingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const instructor = await requireInstructor();

  return (
    <div className="bg-mist min-h-screen">
      <header className="border-hairline bg-paper border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/admin/teaching" className="text-ink font-semibold">
            SRN Academy — teaching
          </Link>
          <p className="text-slate text-small">
            {instructor.full_name ?? instructor.email}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
