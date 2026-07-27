import Link from "next/link";

import { requireStaff } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CertificateRow } from "@/components/admin/CertificateActions";
import type { CertificatesRow } from "@/lib/database.types";

/* Sprint 6.7 — the certificate register.
 *
 * Every certificate ever issued, newest first, withdrawn ones included and
 * labelled. This is the record SRN answers questions from, so nothing
 * disappears from it. */

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  await requireStaff();

  const { data } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false })
    .limit(200);

  const certificates = (data ?? []) as CertificatesRow[];
  const live = certificates.filter((row) => !row.revoked_at).length;

  return (
    <>
      <AdminPageHeader
        title="Certificates"
        description="Everything the Academy has issued. Withdrawn certificates stay listed — a code that was real must never look like it never existed."
      />

      {certificates.length === 0 ? (
        <div className="border-hairline bg-paper border px-6 py-8">
          <p className="text-slate text-small">
            No certificates yet. They appear here as learners finish their
            courses and claim them.
          </p>
        </div>
      ) : (
        <>
          <p className="text-slate text-small mb-5">
            {live} valid · {certificates.length - live} withdrawn ·{" "}
            <Link href="/verify" className="underline underline-offset-2">
              the public check page
            </Link>
          </p>
          <ul className="space-y-3">
            {certificates.map((row) => (
              <CertificateRow key={row.id} row={row} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
