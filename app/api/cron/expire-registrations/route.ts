import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* §13.2 — scheduled job that expires abandoned pending checkouts. Protected by
 * CRON_SECRET so it can't be triggered by the public: Vercel Cron sends it as a
 * Bearer token; a manual call must supply the same.
 *
 * SCHEDULE: daily at 06:00, not every 10 minutes as originally written.
 * Vercel's Hobby plan permits at most one run per day, and the sub-daily
 * expression silently failed EVERY deployment from 25 July onward — the site
 * was three days and thirty commits stale before anyone noticed, because a
 * rejected deploy still leaves the previous one serving happily.
 *
 * The cost is real and worth stating: an abandoned checkout can now hold a seat
 * for up to 24 hours instead of 10 minutes. That only bites a cohort that is
 * genuinely full, where it could turn someone away from a seat nobody took.
 * Moving to Pro and restoring a short interval is the fix; until then this is
 * the honest trade, and it is better than a schedule that stops all deploys. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "expire_pending_registrations" as never,
  );
  if (error) {
    console.error("[cron] expire failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  /* Sprint 6.4 — the same rule for cohorts. Deliberately this route rather than
     a second cron entry: it is the same job on the same schedule, and one
     abandoned checkout holding a seat forever is the same bug in both places. */
  const { data: enrolData, error: enrolError } = await supabaseAdmin.rpc(
    "expire_pending_enrolments" as never,
  );
  if (enrolError) {
    console.error("[cron] expire enrolments failed:", enrolError.message);
    // The registration sweep already succeeded; report both rather than
    // discarding that result.
    return NextResponse.json(
      { ok: false, expired: data ?? 0, error: enrolError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    expired: data ?? 0,
    enrolmentsExpired: enrolData ?? 0,
  });
}
