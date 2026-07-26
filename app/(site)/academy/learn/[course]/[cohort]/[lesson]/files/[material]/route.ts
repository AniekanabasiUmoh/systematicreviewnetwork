import { NextResponse } from "next/server";

import { getCohort } from "@/lib/academy/courses";
import { getLearner } from "@/lib/academy/auth";
import { getMaterial } from "@/lib/academy/curriculum";

/* Sprint 6.3 — the material download.
 *
 * This route is the only way bytes leave the private `course-materials` bucket.
 * It never streams the file itself and never exposes a storage path: it checks
 * the enrolment, mints a short-lived signed URL, and redirects.
 *
 * Two different failures, two different answers:
 *
 *   403 — the learner IS enrolled, but drip has not released this module. They
 *         already know the course and its modules exist, so naming the lock
 *         leaks nothing, and a blank "not found" here is just confusing.
 *
 *   404 — everything else: no enrolment, wrong cohort, unknown id, signed out.
 *         All collapse into one answer so that walking material ids cannot map
 *         a paid course's contents by the difference between the two.
 *
 * `no-store` matters here: without it a CDN or a shared browser cache could
 * hold the redirect and hand the signed URL to the next person. */

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
    params: Promise<{
      course: string;
      cohort: string;
      lesson: string;
      material: string;
    }>;
  },
) {
  const { course: courseSlug, cohort: cohortSlug, material } = await ctx.params;

  /* Not requireVerifiedLearner(): that redirects, and a redirect to a sign-in
     page from a file URL is both a confusing download and a signal that the
     file is real. A signed-out request gets the same 404 as a wrong id. */
  const learner = await getLearner();
  if (!learner?.verified_at) return NOT_FOUND();

  const found = await getCohort(courseSlug, cohortSlug);
  if (!found) return NOT_FOUND();
  const { course, cohort } = found;

  const result = await getMaterial(
    learner.id,
    { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
    material,
  );

  if (result.status === "notfound") return NOT_FOUND();

  if (result.status === "locked") {
    return new NextResponse(result.reason, {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.redirect(result.url, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
