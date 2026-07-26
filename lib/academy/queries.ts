import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/* Learner-side reads (Design.md §9 Sprint 6.1).
 *
 * These run on the SERVICE ROLE, always filtered by a learner id that came
 * from a JWT-verified session (lib/academy/auth.ts). That is deliberate and
 * matches how the rest of the site works (§1): `registrations` is a submissions
 * table with no anon or authenticated policies at all, and opening a direct
 * read path to it for the convenience of one page would be a real regression.
 *
 * The rule for every function here: the learner id is a REQUIRED argument and
 * is always applied as a filter. Never add a variant that reads "all rows" —
 * this is the module where such a function would leak one learner's data to
 * another.
 */

export type LearnerRegistration = {
  id: string;
  event_slug: string;
  event_title: string;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
};

/**
 * Events this learner has registered for, soonest first.
 *
 * Only rows already linked by the verified-email backfill are returned — an
 * unverified learner has no linked rows by construction (Phase 6 decision 5),
 * so this cannot show someone else's registration to a person who merely typed
 * their address.
 */
export async function getLearnerRegistrations(
  learnerId: string,
): Promise<LearnerRegistration[]> {
  const { data, error } = await supabaseAdmin
    .from("registrations")
    .select("id, cancelled_at, events (slug, title, starts_at, ends_at)")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[academy] registrations read failed:", error.message);
    return [];
  }

  type Row = {
    id: string;
    cancelled_at: string | null;
    events: {
      slug: string;
      title: string;
      starts_at: string;
      ends_at: string | null;
    } | null;
  };

  return (data as unknown as Row[])
    .filter((row) => row.events !== null)
    .map((row) => ({
      id: row.id,
      event_slug: row.events!.slug,
      event_title: row.events!.title,
      starts_at: row.events!.starts_at,
      ends_at: row.events!.ends_at,
      cancelled_at: row.cancelled_at,
    }))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}
