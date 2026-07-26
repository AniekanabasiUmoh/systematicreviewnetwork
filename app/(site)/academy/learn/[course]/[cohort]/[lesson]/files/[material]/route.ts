import { NextResponse } from "next/server";

import { getCohort } from "@/lib/academy/courses";
import { getLearner } from "@/lib/academy/auth";
import { getMaterialUrl } from "@/lib/academy/curriculum";

/* Sprint 6.3 — the material download.
 *
 * This route is the only way bytes leave the private `course-materials` bucket.
 * It never streams the file itself and never exposes a storage path: it checks
 * the enrolment, mints a short-lived signed URL, and redirects.
 *
 * Every failure is a 404, never a 403. A 403 would confirm "this material
 * exists and you are not allowed it" — enough to enumerate a course's contents
 * by id. A 404 says nothing, whether the id is wrong, the learner is not
 * enrolled, or the module has not been released yet.
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

  const url = await getMaterialUrl(
    learner.id,
    { id: cohort.id, course_id: course.id, pacing: cohort.pacing },
    material,
  );
  if (!url) return NOT_FOUND();

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store, private" },
  });
}
