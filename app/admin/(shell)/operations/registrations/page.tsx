import { requireStaff } from "@/lib/admin/auth";
import { getSubmission, listSubmissions } from "@/lib/admin/submissions";
import { getSeatCounts } from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OperationsTabs } from "@/components/admin/OperationsTabs";
import { SubmissionFilters } from "@/components/admin/SubmissionFilters";
import { SubmissionList } from "@/components/admin/SubmissionList";
import { Pagination } from "@/components/admin/Pagination";
import { CapacityMeter } from "@/components/admin/CapacityMeter";
import { RegistrantMessageForm } from "@/components/admin/RegistrantMessageForm";
import { RegistrationRowActions } from "@/components/admin/RegistrationRowActions";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireStaff();
  const search = await searchParams;
  const resource = getSubmission("registrations")!;
  const page = Number(search.page) || 1;

  const { rows, count, pageSize } = await listSubmissions(resource, {
    search: search.q,
    status: search.status,
    from: search.from,
    to: search.to,
    page,
  });

  // Upcoming events with a capacity — shown so staff can see who's filling up
  // without opening each event individually.
  const { data: upcomingEvents } = await supabaseAdmin
    .from("events")
    .select("id, title, capacity, starts_at")
    .not("capacity", "is", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(6);

  const seatCounts = await getSeatCounts(
    (upcomingEvents ?? []).map((e) => e.id),
  );

  return (
    <>
      <AdminPageHeader
        title="Registrations"
        description="Everyone who has registered for an event, across every event."
      />
      <OperationsTabs />

      {upcomingEvents && upcomingEvents.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="border-hairline bg-paper border p-4">
              <p className="text-ink text-small font-semibold">{event.title}</p>
              <div className="mt-2">
                <CapacityMeter
                  taken={seatCounts[event.id] ?? 0}
                  capacity={event.capacity}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <RegistrantMessageForm
        recipients={rows
          .filter((row) => !row.cancelled_at)
          .map((row) => ({
            full_name: String(row.full_name),
            email: String(row.email),
          }))}
      />

      <SubmissionFilters resource={resource} search={search} />
      <SubmissionList
        resource={resource}
        rows={rows}
        emptyBody="No one has registered for an event yet. Registrations appear here as soon as someone signs up."
        rowActions={(row) => (
          <RegistrationRowActions
            id={row.id}
            attended={Boolean(row.attended_at)}
            cancelled={Boolean(row.cancelled_at)}
          />
        )}
      />
      <Pagination page={page} pageSize={pageSize} count={count} searchParams={search} />
    </>
  );
}
