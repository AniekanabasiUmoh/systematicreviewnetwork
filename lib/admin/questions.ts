import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { EventQuestion } from "@/lib/events/questions";

/* Sprint 7.2 — staff-side read of an event's questions.
 *
 * Service role, and ARCHIVED questions are included. Staff need to see that a
 * question exists but is no longer asked — otherwise a column appearing in the
 * CSV export has no explanation anywhere in the admin, and someone will try to
 * "fix" it by adding the question back.
 */

export async function listEventQuestions(
  eventId: string,
): Promise<EventQuestion[]> {
  const { data, error } = await supabaseAdmin
    .from("event_questions")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[questions] admin read failed:", error.message);
    return [];
  }
  return (data ?? []) as EventQuestion[];
}
