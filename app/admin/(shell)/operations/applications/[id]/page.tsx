import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { getSubmission, getSubmissionRow } from "@/lib/admin/submissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ApplicationStatusControl,
  ApplicationNotes,
} from "@/components/admin/ApplicationWorkflow";
import type { ApplicationStatus } from "@/lib/admin/applications";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const resource = getSubmission("applications")!;
  const row = await getSubmissionRow(resource, id);
  if (!row) notFound();

  const notes = Array.isArray(row.internal_notes)
    ? (row.internal_notes as Array<{ body: string; author_email: string; at: string }>)
    : [];

  return (
    <>
      <AdminPageHeader
        title={String(row.full_name)}
        description={`Applied to ${row.programme}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="border-hairline bg-paper border p-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                  Email
                </dt>
                <dd className="text-ink text-small mt-1">{String(row.email)}</dd>
              </div>
              <div>
                <dt className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                  Institution
                </dt>
                <dd className="text-ink text-small mt-1">
                  {String(row.institution ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                  Country
                </dt>
                <dd className="text-ink text-small mt-1">
                  {String(row.country ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                  Applied
                </dt>
                <dd className="text-ink text-small mt-1">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Lagos",
                  }).format(new Date(String(row.created_at)))}
                </dd>
              </div>
            </dl>
            {row.motivation ? (
              <div className="mt-4">
                <dt className="text-slate text-[0.75rem] font-medium tracking-[0.08em] uppercase">
                  Motivation
                </dt>
                <dd className="text-ink text-small mt-1 whitespace-pre-wrap">
                  {String(row.motivation)}
                </dd>
              </div>
            ) : null}
          </div>

          <ApplicationNotes id={id} notes={notes} />
        </div>

        <div>
          <ApplicationStatusControl
            id={id}
            status={row.status as ApplicationStatus}
          />
        </div>
      </div>
    </>
  );
}
