import { requireStaff } from "@/lib/admin/auth";
import { getDashboardCounts, recentAudit } from "@/lib/admin/queries";
import { StatCard } from "@/components/admin/StatCard";
import { AuditList } from "@/components/admin/AuditList";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireStaff();
  const [counts, audit] = await Promise.all([
    getDashboardCounts(),
    recentAudit(10),
  ]);

  return (
    <div>
      <h1 className="text-h2 text-ink font-semibold">
        Welcome, {user.full_name || user.email}
      </h1>
      <p className="text-slate text-small mt-2">
        Add events and news, or check who has registered and applied. Save
        changes as drafts until they are ready for the public site.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href="/admin/events/new">Add event</ButtonLink>
        <ButtonLink href="/admin/news/new" variant="secondary">
          Add news
        </ButtonLink>
        <ButtonLink href="/admin/operations" variant="secondary">
          View submissions
        </ButtonLink>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Events" value={counts.events} href="/admin/events" />
        <StatCard
          label="News articles"
          value={counts.news}
          href="/admin/news"
        />
        <StatCard
          label="Resources"
          value={counts.resources}
          href="/admin/resources"
        />
        <StatCard label="Team members" value={counts.team} href="/admin/team" />
        <StatCard
          label="Media files"
          value={counts.media}
          href="/admin/media"
        />
        <StatCard
          label="Applications"
          value={counts.applications}
          href="/admin/operations/applications"
        />
      </div>

      <div className="mt-10">
        <h2 className="text-ink text-h4 font-semibold">Recent changes</h2>
        <div className="mt-3">
          <AuditList
            rows={audit}
            emptyText="Changes staff make across the admin will appear here."
          />
        </div>
      </div>
    </div>
  );
}
