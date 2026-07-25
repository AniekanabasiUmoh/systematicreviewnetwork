import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { EventReminder } from "@/lib/email/templates";
import { formatEventDateTime } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Sprint 5.11 — event reminders, 48-72h before the event starts.
 *
 * Runs on a schedule (vercel.json cron). Only registrations with a HELD seat
 * (paid or not_required), not cancelled, and not already reminded are
 * candidates. reminder_sent_at is stamped per-row immediately after each send
 * — not in a single batched update at the end — so a mid-run failure (the
 * process dying between row 40 and row 41) cannot cause a full re-send to
 * everyone on the next run. Protected by CRON_SECRET like the existing
 * expire-registrations job. */

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("events")
    .select("id, title, slug, starts_at, ends_at, location_type, location_or_link")
    .gte("starts_at", windowStart)
    .lt("starts_at", windowEnd);

  if (eventsError) {
    console.error("[cron] event-reminders: could not load events:", eventsError.message);
    return NextResponse.json({ ok: false, error: eventsError.message }, { status: 500 });
  }
  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org";

  let sent = 0;
  for (const event of events) {
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("registrations")
      .select("id, full_name, email")
      .eq("event_id", event.id)
      .in("payment_status", ["paid", "not_required"])
      .is("cancelled_at", null)
      .is("reminder_sent_at", null);

    if (regError || !registrations) continue;

    const whenLabel = formatEventDateTime(event.starts_at, event.ends_at);
    const whereLabel =
      event.location_or_link ??
      (event.location_type === "online" ? "Online" : "In person");
    const eventUrl = `${siteUrl}/news/events/${event.slug}`;

    for (const reg of registrations) {
      const result = await sendEmail({
        to: reg.email,
        subject: `Reminder: ${event.title}`,
        react: EventReminder({
          fullName: reg.full_name,
          eventTitle: event.title,
          whenLabel,
          whereLabel,
          eventUrl,
        }),
      });
      // Stamp immediately, win or lose the send: a failed send should not
      // retry forever on every future run for an address that's bouncing.
      await supabaseAdmin
        .from("registrations")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", reg.id);
      if (result.ok) sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
