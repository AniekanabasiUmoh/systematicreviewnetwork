import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { formResource, getResource } from "@/lib/admin/resources";
import { getRow, auditForResource } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { QuestionList as EventQuestionsEditor } from "@/components/admin/EventQuestionsEditor";
import { listEventQuestions } from "@/lib/admin/questions";
import { listAttendees } from "@/lib/events/certificates";
import { TranslationFields } from "@/components/admin/TranslationFields";
import { TRANSLATABLE_FIELDS, frTranslation } from "@/lib/admin/translatable";
import { AttendanceCertificates } from "@/components/admin/AttendanceCertificates";
import { PublishControl } from "@/components/admin/PublishControl";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { RetireButton } from "@/components/admin/RetireButton";
import { ArchiveButton } from "@/components/admin/ArchiveButton";
import { AuditList } from "@/components/admin/AuditList";

export const dynamic = "force-dynamic";

export default async function EditAdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  await requireStaff();
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource || resource.singleton) notFound();
  const row = await getRow(resource, id);
  if (!row) notFound();
  const questions =
    resource.key === "events" ? await listEventQuestions(id) : [];
  const attendees = resource.key === "events" ? await listAttendees(id) : [];
  const history = await auditForResource(resource.key, id);
  const status =
    row.status === "draft" || row.status === "published" ? row.status : null;
  return (
    <>
      <AdminPageHeader
        title={`Edit ${resource.labelSingular}`}
        description="Changes are saved immediately to the draft copy. Publish only when the content is ready for the public site."
      />
      {resource.publishable && status ? (
        <PublishControl resource={resource.key} id={id} status={status} />
      ) : null}
      <ResourceForm resource={formResource(resource)} initial={row} />
      {resource.key === "events" ? (
        <section className="mt-10">
          <h2 className="text-display text-ink text-h3">Registration questions</h2>
          <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
            Extra questions on this event&rsquo;s registration form. Answers appear in
            the CSV export as their own columns.
          </p>
          <EventQuestionsEditor eventId={id} questions={questions} />
        </section>
      ) : null}

      {resource.key === "events" ? (
        <section className="mt-10">
          <h2 className="text-display text-ink text-h3">
            Attendance certificates
          </h2>
          <p className="text-slate text-small mt-2 mb-5 max-w-2xl">
            Mark attendance on the registrations list first. Everyone who
            attended can then be issued a certificate with a verifiable code,
            the same one an Academy course uses.
          </p>
          <AttendanceCertificates
            eventId={id}
            eventTitle={String(row.title ?? "this event")}
            attendees={attendees}
          />
        </section>
      ) : null}

      {TRANSLATABLE_FIELDS[resource.key] ? (
        <TranslationFields
          table={resource.table}
          id={id}
          fields={TRANSLATABLE_FIELDS[resource.key]!.map((f) => ({
            ...f,
            english: String(row[f.name] ?? ""),
          }))}
          existing={frTranslation(row.translations)}
        />
      ) : null}

      {resource.key === "programmes" ? (
        <RetireButton
          id={id}
          name={String(row.title ?? resource.labelSingular)}
          archived={Boolean(row.archived_at)}
        />
      ) : null}
      {resource.key === "events" ? (
        <ArchiveButton
          resource={resource.key}
          id={id}
          name={String(row.title ?? resource.labelSingular)}
          archived={Boolean(row.archived_at)}
        />
      ) : null}
      <DeleteButton
        resource={resource.key}
        id={id}
        name={String(row.title ?? row.name ?? resource.labelSingular)}
      />

      <div className="mt-8">
        <h2 className="text-ink text-small font-semibold">History</h2>
        <div className="mt-3">
          <AuditList
            rows={history}
            emptyText="No recorded changes yet."
          />
        </div>
      </div>
    </>
  );
}
