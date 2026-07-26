import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* §13.2 — scheduled job that expires abandoned pending checkouts. Runs on a
 * schedule (vercel.json cron, every 10 min). Protected by CRON_SECRET so it
 * can't be triggered by the public: Vercel Cron sends it as a Bearer token; a
 * manual call must supply the same. */

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
