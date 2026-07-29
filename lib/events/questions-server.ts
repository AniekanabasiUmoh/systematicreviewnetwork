import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { EventQuestion } from "@/lib/events/questions";

/* Sprint 7.2 — reading an event's questions for the public form.
 *
 * On the ANON key, matching lib/queries.ts and every other public read. The RLS
 * policy on `event_questions` allows non-archived questions on PUBLISHED events
 * only, so a draft event's questions cannot leak even if a caller here forgot a
 * filter — the database is the backstop rather than this function.
 *
 * Kept separate from lib/events/questions.ts because that module is pure and
 * imported by a client component; this one creates a Supabase client and must
 * never be pulled into a browser bundle.
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

export async function getEventQuestions(
  eventId: string,
): Promise<EventQuestion[]> {
  const { data, error } = await db
    .from("event_questions")
    .select("*")
    .eq("event_id", eventId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[questions] public read failed:", error.message);
    return [];
  }
  return (data ?? []) as EventQuestion[];
}
