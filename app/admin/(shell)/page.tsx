import { requireStaff } from "@/lib/admin/auth";
import { getDashboardCounts } from "@/lib/admin/queries";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireStaff();
  const counts = await getDashboardCounts();

  return (
    <div>
      <h1 className="text-h2 text-ink font-semibold">
        Welcome, {user.full_name || user.email}
      </h1>
      <p className="text-slate text-small mt-2">
        Start with the content that visitors see most often, then publish when
        it is ready.
      </p>
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
          href="/admin/applications"
        />
      </div>
    </div>
  );
}
