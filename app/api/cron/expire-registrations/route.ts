import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* §13.2 — scheduled job that expires abandoned pending checkouts. Protected by
 * CRON_SECRET so it can't be triggered by the public: Vercel Cron sends it as a
 * Bearer token; a manual call must supply the same.
 *
 * THIS ROUTE IS NO LONGER SCHEDULED. The every-10-minutes sweep runs in the
 * database via pg_cron (20260728000001), which keeps the interval §13.2 wants
 * on the Supabase free tier — Vercel's Hobby plan caps crons at one run per day
 * and REJECTS the whole deployment rather than degrading, which is what left
 * the site three days and thirty-one commits stale in July.
 *
 * The route stays as a manual lever: send the Bearer token to force an
 * immediate sweep without waiting for the next tick. Keeping it also means the
 * job has a second way to run if pg_cron is ever disabled. */

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
