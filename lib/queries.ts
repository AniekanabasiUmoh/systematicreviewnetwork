import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* Server-side reads for the public site.
 *
 * Uses the ANON key, not the service role: RLS then guarantees only published
 * content can come back, so a query bug cannot leak a draft. The service-role
 * client is reserved for writes and admin (§1).
 *
 * Every read is a server component concern — nothing here runs in the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

const db = createClient<Database>(url, anonKey, {
  auth: { persistSession: false },
});

/** ISR: content pages revalidate every 60s (§9 Phase 2). */
export const REVALIDATE = 60;

export async function getHomepage() {
  const { data } = await db.from("homepage").select("*").limit(1).maybeSingle();
  return data;
}

export async function getImpactStats() {
  const { data } = await db
    .from("impact_stats")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getPartners() {
  const { data } = await db
    .from("partners")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getReachCountries() {
  const { data } = await db
    .from("reach_countries")
    .select("*")
    .order("country_name", { ascending: true });
  return data ?? [];
}

export async function getTestimonials(limit?: number) {
  let q = db
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return data ?? [];
}

/**
 * Upcoming published events, soonest first.
 *
 * Filters on ends_at where present so a multi-day event stays "upcoming" for
 * its whole run rather than dropping off the list on day one.
 */
export async function getUpcomingEvents(limit = 3) {
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("events")
    .select("*")
    .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`)
    .order("starts_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/**
 * Every published event, soonest first. The /news hub splits these into
 * upcoming and past itself (a single ordered list is cheaper than two queries
 * and keeps the past/upcoming boundary in one place — the request time). The
 * explicit status filter is defence-in-depth alongside RLS: a draft event never
 * reaches the public list even if a policy is loosened.
 */
export async function getAllEvents() {
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  return data ?? [];
}

/** A single published event by slug, or null (so the detail route can 404). */
export async function getEventBySlug(slug: string) {
  const { data } = await db
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

/** Every published news article, newest first, for the /news article list. */
export async function getAllNews() {
  const { data } = await db
    .from("news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return data ?? [];
}

/** A single published news article by slug, or null (so the route can 404). */
export async function getNewsBySlug(slug: string) {
  const { data } = await db
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

/**
 * All resources, newest first, optionally filtered to one category. The filter
 * is applied in the query (not the page) so an unknown category simply returns
 * nothing rather than erroring.
 */
export async function getResources(
  category?: Database["public"]["Enums"]["resource_category"],
) {
  let q = db
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return data ?? [];
}

/** A single resource by slug (for the article / detail page). */
export async function getResourceBySlug(slug: string) {
  const { data } = await db
    .from("resources")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getLatestResources(limit = 3) {
  const { data } = await db
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Looks up a media row by its storage path and returns the public URL plus the
 * stored alt text. Going through the table rather than hardcoding a URL means
 * alt text travels with the image and staff can swap the file from the admin
 * (Sprint 5.2) without a code change.
 */
export async function getMedia(storagePath: string) {
  const { data } = await db
    .from("media")
    .select("storage_path, alt_text, width, height")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (!data) return null;
  return {
    url: `${url}/storage/v1/object/public/media/${data.storage_path}`,
    alt: data.alt_text,
    width: data.width,
    height: data.height,
  };
}

/**
 * Resolves a stored public media URL back to its media row so the alt text
 * always describes the image actually shown. Used where the displayed image can
 * differ from a hardcoded fallback (e.g. homepage.hero_image_url): pass the URL,
 * get the matching alt. Falls back to null if the URL isn't a media object.
 */
export async function getMediaByUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/media/";
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  const storagePath = publicUrl.slice(i + marker.length);
  return getMedia(storagePath);
}

/**
 * A single editable content page (About, FAQ, Privacy, Terms, impact stories)
 * by slug. `body_rich` is TipTap JSON; render it with <RichText>. Returns null
 * for an unknown slug so callers can 404.
 */
export async function getPageBySlug(slug: string) {
  const { data } = await db
    .from("pages")
    .select("slug, title, body_rich")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

/**
 * The impact stories, in slug order (impact-story-1, impact-story-2, …). These
 * live in `pages` under an `impact-story-*` slug convention (§5) rather than a
 * dedicated table, so staff edit them like any other content page. Returns
 * slug + title + body for the Impact page's "stories of change" section and the
 * per-story detail route. Filters empty bodies so a half-written draft never
 * surfaces as a broken card.
 */
export async function getImpactStories() {
  const { data } = await db
    .from("pages")
    .select("slug, title, body_rich")
    .like("slug", "impact-story-%")
    .order("slug", { ascending: true });
  return (data ?? []).filter((row) => {
    const body = row.body_rich as { content?: unknown[] } | null;
    return Array.isArray(body?.content) && body.content.length > 0;
  });
}

/**
 * All team members, ordered by group then sort_order. Grouping is done by the
 * caller so the page controls the group order and headings; staff control the
 * within-group order from `sort_order` alone.
 */
export async function getTeamMembers() {
  const { data } = await db
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getLatestNews(limit = 3) {
  const { data } = await db
    .from("news")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Seats held per event — confirmed payments plus free registrations (§13.2).
 * Pending payments deliberately do NOT count, so an abandoned checkout never
 * consumes capacity on a sold-out course.
 *
 * Anon cannot read `registrations` (RLS denies it outright), so this runs with
 * the service role. That is safe here because it returns counts only, never
 * personal data, and it is called from server components.
 */
export async function getSeatCounts(
  eventIds: string[],
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return {};

  const admin = createClient<Database>(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await admin
    .from("registrations")
    .select("event_id, payment_status")
    .in("event_id", eventIds)
    .in("payment_status", ["paid", "not_required"]);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }
  return counts;
}
