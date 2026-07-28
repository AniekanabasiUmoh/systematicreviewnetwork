import { NextResponse } from "next/server";

import { getEnrolledCohort } from "@/lib/academy/courses";
import { getLearner } from "@/lib/academy/auth";
import { getEnrolment } from "@/lib/academy/curriculum";
import { getSessionsForLearner, recordAttendance } from "@/lib/academy/sessions";

/* Sprint 6.5 — joining a live session.
 *
 * A redirect rather than a printed link, for one reason: it is the only place
 * attendance can be recorded honestly. A link on the page tells us nothing
 * about who clicked it.
 *
 * The join URL is resolved through getSessionsForLearner(), which has already
 * stripped it for anyone without an ACTIVE enrolment on this cohort and outside
 * the join window. So this route cannot hand out a URL its caller was not
 * entitled to even if the id in the path is right.
 *
 * Every refusal is a 404. §6.5's done-when names the two callers who must fail:
 * a signed-out visitor, and an enrolled learner on a DIFFERENT cohort. Both
 * land here, and both get the same nothing. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  new NextResponse("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(
  _request: Request,
  ctx: {
    params: Promise<{ course: string; cohort: string; session: string }>;
  },
) {
  const { course: courseSlug, cohort: cohortSlug, session: sessionId } =
    await ctx.params;

  const learner = await getLearner();
  if (!learner?.verified_at) return NOT_FOUND();

  const found = await getEnrolledCohort(courseSlug, cohortSlug);
  if (!found) return NOT_FOUND();
  const { cohort } = found;

  const sessions = await getSessionsForLearner(learner.id, {
    id: cohort.id,
    pacing: cohort.pacing,
  });
  if (!sessions) return NOT_FOUND();

  const session = sessions.find((row) => row.id === sessionId);
  /* join_url is null when they may not have it — no enrolment, wrong cohort,
     or outside the window. All indistinguishable from a bad id, on purpose. */
  if (!session?.join_url) return NOT_FOUND();

  const enrolment = await getEnrolment(learner.id, cohort.id);
  if (enrolment) await recordAttendance(session.id, enrolment.id);

  return NextResponse.redirect(session.join_url, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
