import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdminResource } from "@/lib/admin/resources";

export type AdminRow = Record<string, unknown> & { id: string };

export function escapePostgrestSearch(value: string) {
  return value
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[,().]/g, "")
    .trim();
}

export async function listRows(
  resource: AdminResource,
  options: {
    search?: string;
    status?: "draft" | "published";
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabaseAdmin
    .from(resource.table)
    .select("*", { count: "exact" })
    .order(resource.orderBy.column as never, {
      ascending: resource.orderBy.ascending ?? true,
    })
    .range(from, to);

  if (resource.publishable && options.status) {
    query = query.eq("status" as never, options.status as never);
  }
  const term = escapePostgrestSearch(options.search ?? "");
  if (term && resource.searchColumns.length) {
    query = query.or(
      resource.searchColumns
        .map((column) => `${column}.ilike.%${term}%`)
        .join(","),
    );
  }

  const { data, error, count } = await query;
  if (error)
    throw new Error(`Could not load ${resource.labelPlural.toLowerCase()}.`);
  return {
    rows: (data ?? []) as unknown as AdminRow[],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getRow(resource: AdminResource, id: string) {
  const { data, error } = await supabaseAdmin
    .from(resource.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(
      `Could not load this ${resource.labelSingular.toLowerCase()}.`,
    );
  return data as unknown as AdminRow | null;
}

export async function slugTaken(
  resource: AdminResource,
  slug: string,
  excludeId?: string,
) {
  if (!resource.slugColumn) return false;
  let query = supabaseAdmin
    .from(resource.table)
    .select("id")
    .eq(resource.slugColumn as never, slug)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error("Could not check that URL slug.");
  return (data?.length ?? 0) > 0;
}

export type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  resource: string;
  resource_id: string | null;
  summary: string;
  created_at: string;
};

/** Sprint 5.10 — surfaces admin_audit, which has recorded every mutation
 * since Sprint 5.1 with no screen displaying it until now. */
export async function recentAudit(limit = 20): Promise<AuditRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_audit")
    .select("id, actor_email, action, resource, resource_id, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data as unknown as AuditRow[];
}

export async function auditForResource(
  resource: string,
  resourceId: string,
  limit = 20,
): Promise<AuditRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_audit")
    .select("id, actor_email, action, resource, resource_id, summary, created_at")
    .eq("resource", resource)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data as unknown as AuditRow[];
}

export async function getDashboardCounts() {
  const [events, news, resources, media, team, applications] =
    await Promise.all([
      supabaseAdmin.from("events").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("news").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("resources")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin.from("media").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("team_members")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("applications")
        .select("id", { count: "exact", head: true }),
    ]);
  return {
    events: events.count ?? 0,
    news: news.count ?? 0,
    resources: resources.count ?? 0,
    media: media.count ?? 0,
    team: team.count ?? 0,
    applications: applications.count ?? 0,
  };
}
