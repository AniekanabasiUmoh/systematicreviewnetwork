import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { escapePostgrestSearch } from "@/lib/admin/queries";

/* Sprint 5.6 — read/export descriptors for the five public-form submission
 * tables. Deliberately NOT an extension of AdminResource (lib/admin/resources.ts):
 * that type is a WRITE descriptor — fields, schema, publishable, slugColumn,
 * revalidate are all meaningless here, and formResource/saveResource/ResourceForm
 * assume they exist. A `readOnly` flag would grow an `if` branch through every
 * one of those paths for no shared behaviour. AdminResourceKey is also about to
 * shrink by four keys in Sprint 5.9a; growing it by five submission keys at the
 * same time would put two opposing pressures on one union.
 *
 * The `columns` array is the single source of truth for both the on-screen
 * table AND the CSV export — that's what makes "export matches the screen"
 * structural rather than a discipline someone can forget. */

export type SubmissionKey =
  | "registrations"
  | "applications"
  | "newsletter"
  | "contact"
  | "donations";

export type SubmissionColumnKind =
  | "text"
  | "email"
  | "datetime"
  | "money"
  | "status"
  | "longtext";

export type SubmissionColumn = {
  name: string;
  label: string;
  kind: SubmissionColumnKind;
  inList?: boolean;
  inExport?: boolean;
};

/* Supabase's builder type changes shape with every .eq/.gte/.order call in a
   way that's not worth fighting for glue code — the runtime behaviour (a
   PostgREST query builder) is well understood even where the type is `any`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

export type SubmissionResource = {
  key: SubmissionKey;
  table:
    | "registrations"
    | "applications"
    | "newsletter_signups"
    | "contact_messages"
    | "donations";
  labelSingular: string;
  labelPlural: string;
  columns: ReadonlyArray<SubmissionColumn>;
  searchColumns: ReadonlyArray<string>;
  orderBy: { column: string; ascending?: boolean };
  statusColumn?: string;
  statusOptions?: ReadonlyArray<{ value: string; label: string }>;
  // Hook for Sprint 5.11's unsubscribed-row exclusion — living on the
  // descriptor means it cannot be forgotten by a screen or the export route.
  exportExclude?: (query: SupabaseQuery) => SupabaseQuery;
  detailHref?: (id: string) => string;
};

const SUBMISSION_DEFINITIONS = {
  registrations: {
    key: "registrations",
    table: "registrations",
    labelSingular: "Registration",
    labelPlural: "Registrations",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["full_name", "email", "institution", "country"],
    statusColumn: "payment_status",
    statusOptions: [
      { value: "not_required", label: "Not required" },
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "failed", label: "Failed" },
      { value: "expired", label: "Expired" },
      { value: "refunded", label: "Refunded" },
    ],
    columns: [
      { name: "full_name", label: "Name", kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "institution", label: "Institution", kind: "text" },
      { name: "country", label: "Country", kind: "text" },
      { name: "payment_status", label: "Payment status", kind: "status" },
      { name: "amount_kobo", label: "Amount", kind: "money" },
      { name: "created_at", label: "Registered", kind: "datetime" },
      // Shown in the actions column instead of the list, per §5.11 — kept
      // in the export as a plain yes/no so finance/attendance reporting has it.
      { name: "attended_at", label: "Attended", kind: "text", inList: false },
    ],
  },
  applications: {
    key: "applications",
    table: "applications",
    labelSingular: "Application",
    labelPlural: "Applications",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["full_name", "email", "programme", "institution", "country"],
    statusColumn: "status",
    statusOptions: [
      { value: "received", label: "Received" },
      { value: "under_review", label: "Under review" },
      { value: "accepted", label: "Accepted" },
      { value: "waitlisted", label: "Waitlisted" },
      { value: "rejected", label: "Rejected" },
    ],
    columns: [
      { name: "full_name", label: "Name", kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "programme", label: "Programme", kind: "text" },
      { name: "institution", label: "Institution", kind: "text" },
      { name: "country", label: "Country", kind: "text" },
      { name: "status", label: "Status", kind: "status" },
      { name: "motivation", label: "Motivation", kind: "longtext", inList: false },
      { name: "created_at", label: "Applied", kind: "datetime" },
    ],
    detailHref: (id: string) => `/admin/operations/applications/${id}`,
  },
  newsletter: {
    key: "newsletter",
    table: "newsletter_signups",
    labelSingular: "Subscriber",
    labelPlural: "Newsletter subscribers",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["email"],
    columns: [
      { name: "email", label: "Email", kind: "email" },
      { name: "created_at", label: "Subscribed", kind: "datetime" },
      // A real column, but never in the export — see exportExclude below.
      // SubmissionList renders this one specially (subscribed/unsubscribed
      // badge) rather than the raw timestamp, since staff need the status,
      // not the moment it happened.
      { name: "unsubscribed_at", label: "Status", kind: "status", inExport: false },
    ],
    /* §5.11 — the export must never include an unsubscribed address. Living
       on the descriptor is what makes this impossible to forget: every
       consumer of this resource (the screen, the export route) shares it. */
    exportExclude: (query) => query.is("unsubscribed_at", null),
  },
  contact: {
    key: "contact",
    table: "contact_messages",
    labelSingular: "Message",
    labelPlural: "Contact messages",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["name", "email", "subject", "message"],
    statusColumn: "type",
    statusOptions: [
      { value: "general", label: "General" },
      { value: "partnership", label: "Partnership" },
    ],
    columns: [
      { name: "name", label: "Name", kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "type", label: "Type", kind: "status" },
      { name: "subject", label: "Subject", kind: "text" },
      { name: "message", label: "Message", kind: "longtext", inList: false },
      { name: "created_at", label: "Received", kind: "datetime" },
    ],
  },
  donations: {
    key: "donations",
    table: "donations",
    labelSingular: "Donation",
    labelPlural: "Donations",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["donor_name", "email"],
    statusColumn: "payment_status",
    statusOptions: [
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "failed", label: "Failed" },
      { value: "expired", label: "Expired" },
      { value: "refunded", label: "Refunded" },
    ],
    columns: [
      { name: "donor_name", label: "Donor", kind: "text" },
      { name: "email", label: "Email", kind: "email" },
      { name: "amount_kobo", label: "Amount", kind: "money" },
      { name: "payment_status", label: "Status", kind: "status" },
      { name: "created_at", label: "Given", kind: "datetime" },
    ],
  },
} as const satisfies Record<string, SubmissionResource>;

export const SUBMISSION_RESOURCES: Record<SubmissionKey, SubmissionResource> =
  SUBMISSION_DEFINITIONS;

export function getSubmission(key: string | null | undefined): SubmissionResource | null {
  /* Object.hasOwn, not `in`: this key comes straight off the URL path in the
     export route, and `in` walks the prototype chain. */
  return key && Object.hasOwn(SUBMISSION_RESOURCES, key)
    ? SUBMISSION_RESOURCES[key as SubmissionKey]
    : null;
}

export type SubmissionFilters = {
  search?: string;
  status?: string;
  from?: string; // yyyy-mm-dd, Lagos wall-clock date, inclusive
  to?: string; // yyyy-mm-dd, Lagos wall-clock date, inclusive
  page?: number;
  pageSize?: number;
};

/** Lagos (UTC+01:00, no DST) wall-clock start-of-day as an inclusive UTC lower bound. */
export function inclusiveLowerBound(from: string | undefined): string | null {
  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return null;
  return new Date(`${from}T00:00:00+01:00`).toISOString();
}

/**
 * Lagos wall-clock end-of-day as an EXCLUSIVE UTC upper bound: `to=2026-07-25`
 * must include everything through the last instant of the 25th in Lagos time.
 * That instant is midnight the 26th in Lagos, i.e. 2026-07-25T23:00:00.000Z —
 * apply with `.lt()`, never `.lte()` on the same-day string, or the last
 * 23h59m of the day silently drops off the report.
 */
export function exclusiveUpperBound(to: string | undefined): string | null {
  if (!to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const nextDay = new Date(`${to}T00:00:00+01:00`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
}

/** Shared by both the list screen and the export route — filters must match exactly. */
export function applySubmissionFilters(
  query: SupabaseQuery,
  resource: SubmissionResource,
  filters: SubmissionFilters,
): SupabaseQuery {
  let q = query;
  const term = escapePostgrestSearch(filters.search ?? "");
  if (term && resource.searchColumns.length) {
    q = q.or(
      resource.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(","),
    ) as SupabaseQuery;
  }
  if (filters.status && resource.statusColumn) {
    q = q.eq(resource.statusColumn as never, filters.status as never) as SupabaseQuery;
  }
  const lower = inclusiveLowerBound(filters.from);
  const upper = exclusiveUpperBound(filters.to);
  if (lower) q = q.gte("created_at" as never, lower) as SupabaseQuery;
  if (upper) q = q.lt("created_at" as never, upper) as SupabaseQuery;
  return q;
}

export async function listSubmissions(
  resource: SubmissionResource,
  filters: SubmissionFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from(resource.table)
    .select("*", { count: "exact" })
    .order(resource.orderBy.column as never, {
      ascending: resource.orderBy.ascending ?? true,
    })
    .range(from, to) as SupabaseQuery;

  query = applySubmissionFilters(query, resource, filters);

  const { data, error, count } = await query;
  if (error)
    throw new Error(`Could not load ${resource.labelPlural.toLowerCase()}.`);
  return {
    rows: (data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>,
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSubmissionRow(resource: SubmissionResource, id: string) {
  const { data, error } = await supabaseAdmin
    .from(resource.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`Could not load this ${resource.labelSingular.toLowerCase()}.`);
  return data as unknown as (Record<string, unknown> & { id: string }) | null;
}
