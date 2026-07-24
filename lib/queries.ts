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
