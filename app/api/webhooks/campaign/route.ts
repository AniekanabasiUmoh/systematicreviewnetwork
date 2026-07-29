import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 7.5 — an unsubscribe in the campaign tool reaching us.
 *
 * §7.5: "Two-way unsubscribe sync is mandatory, not optional: an unsubscribe in
 * the campaign tool must propagate back, or SRN mails people who opted out."
 *
 * That is the compliance half of the integration. Someone who clicks
 * unsubscribe in a Brevo email has withdrawn consent; if that only lands in
 * Brevo, SRN's own transactional list still has them, and the next newsletter
 * exported from our admin mails a person who said no. So this route exists
 * before any campaign has been sent.
 *
 * AUTHENTICATION: a shared secret in the path is not enough on its own — it
 * ends up in logs — so it is compared in constant time against
 * CAMPAIGN_WEBHOOK_SECRET and the route fails closed when that is unset. Brevo
 * does not sign its webhooks, so a secret is what is available; the blast
 * radius is bounded because the only thing this endpoint can do is UNSUBSCRIBE
 * someone, never subscribe them.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(provided: string | null): boolean {
  const expected = process.env.CAMPAIGN_WEBHOOK_SECRET;
  // Fail closed. An unset secret must not mean "let everyone in".
  if (!expected || !provided) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-campaign-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { event?: string; email?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "no email" }, { status: 400 });
  }

  /* Only unsubscribes and hard bounces are acted on. A campaign tool sends many
     event types — opens, clicks, deliveries — and none of them should change
     anything here. Ignoring the rest with a 200 keeps the tool from retrying
     events we simply do not care about. */
  const event = payload.event ?? "";
  if (!["unsubscribed", "hard_bounce", "spam", "blocked"].includes(event)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const { error } = await supabaseAdmin
    .from("newsletter_signups")
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .ilike("email", email)
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[campaign webhook] update failed:", error.message);
    /* 500 so the campaign tool RETRIES. Losing an unsubscribe is the failure
       this route exists to prevent, so a transient database error must not be
       silently swallowed with a 200. */
    return NextResponse.json({ error: "could not record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event, email });
}
