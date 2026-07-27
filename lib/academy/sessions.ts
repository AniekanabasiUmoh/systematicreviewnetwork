import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getEnrolment } from "@/lib/academy/curriculum";
import type { LiveSessionsRow, CohortAnnouncementsRow } from "@/lib/database.types";

/* Sprint 6.5 — live sessions and announcements.
 *
 * `join_url` is the most sensitive field in the Academy. A live meeting link on
 * a public page lets anyone who finds it walk into the session, which is why
 * lib/admin/embeds.ts refuses to frame one and renders it as an explicit
 * external link instead.
 *
 * Design.md §6.5 is emphatic: "Do not add an Academy bypass to that module:
 * paying for a course is not a reason to inline a meeting." So this module does
 * not touch the embed rules. What it adds is one narrower question — may THIS
 * learner see THIS cohort's join URL — and the answer requires an ACTIVE
 * enrolment on that exact cohort. Not any cohort of the course; not a completed
 * enrolment from last term.
 *
 * That last distinction is deliberate and differs from materials. Course
 * materials outlive the cohort (decision 3) because they are the thing bought.
 * A live session is an event happening now; someone who took the course in
 * March has no business in this week's call.
 */

export type LiveSession = LiveSessionsRow;
export type Announcement = CohortAnnouncementsRow;

/** A session as a learner may see it — join_url present only when permitted. */
export type LearnerSession = Omit<LiveSession, "join_url"> & {
  join_url: string | null;
  /** True while the link is worth showing: from 15 minutes before, to the end. */
  joinable: boolean;
};

/** Links appear shortly before, not days early — a stale link invites confusion. */
const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;

export function isJoinable(
  session: Pick<LiveSession, "starts_at" | "duration_minutes">,
  now: Date = new Date(),
): boolean {
  const start = new Date(session.starts_at).getTime();
  const end = start + session.duration_minutes * 60 * 1000;
  const t = now.getTime();
  return t >= start - JOIN_WINDOW_BEFORE_MS && t <= end;
}

/**
 * Sessions for a cohort, as a specific learner may see them.
 *
 * Returns null without an active enrolment — the caller turns that into a 404,
 * so the existence of a session schedule is not confirmed to a stranger.
 *
 * Self-paced cohorts have no sessions at all (decision 1): the caller does not
 * render the section, and this returns an empty list rather than pretending.
 */
export async function getSessionsForLearner(
  learnerId: string,
  cohort: { id: string; pacing: string },
  now: Date = new Date(),
): Promise<LearnerSession[] | null> {
  if (cohort.pacing === "self_paced") return [];

  const enrolment = await getEnrolment(learnerId, cohort.id);
  if (!enrolment) return null;

  /* Only an ACTIVE enrolment gets join links. `completed` is enough to read the
     materials forever, but not to walk into a live call months later. */
  const active = enrolment.state === "active";

  const { data } = await supabaseAdmin
    .from("live_sessions")
    .select("*")
    .eq("cohort_id", cohort.id)
    .order("starts_at", { ascending: true });

  return ((data ?? []) as LiveSession[]).map((session) => {
    const joinable = isJoinable(session, now);
    return {
      ...session,
      /* The URL is STRIPPED here, server-side, rather than hidden in the
         template. A field that never enters the payload cannot leak through a
         React prop, a serialised server component, or a view-source. */
      join_url: active && joinable ? session.join_url : null,
      joinable,
    };
  });
}

/** Published announcements for a cohort, newest first. */
export async function getAnnouncementsForLearner(
  learnerId: string,
  cohortId: string,
): Promise<Announcement[] | null> {
  const enrolment = await getEnrolment(learnerId, cohortId);
  if (!enrolment) return null;

  const { data } = await supabaseAdmin
    .from("cohort_announcements")
    .select("*")
    .eq("cohort_id", cohortId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return (data ?? []) as Announcement[];
}

/** Records that this learner joined a session. Idempotent. */
export async function recordAttendance(
  sessionId: string,
  enrolmentId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("session_attendance").upsert(
    { session_id: sessionId, enrolment_id: enrolmentId } as never,
    { onConflict: "session_id,enrolment_id", ignoreDuplicates: true },
  );
  if (error) console.error("[sessions] attendance failed:", error.message);
}
