import { NextResponse } from "next/server";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import {
  RegistrationConfirmation,
  DonationReceipt,
} from "@/lib/email/templates";
import { buildEventIcs } from "@/lib/ics";
import { formatEventDateTime, formatPrice } from "@/lib/events";
import type { Json } from "@/lib/database.types";

/* §13.4 — the Paystack webhook. THE source of truth for payment (§13.3).
 *
 * Non-negotiables implemented here:
 *   - read the RAW body (req.text) and verify x-paystack-signature as
 *     HMAC-SHA512 before any parse or DB write; 401 on failure.
 *   - idempotent by paystack event id (paystack_events ledger, unique PK): the
 *     same charge.success may arrive more than once and must never double-hold
 *     a seat or double-email.
 *   - acknowledge with 200 fast; verify + email happen inline but are cheap.
 *
 * The Node runtime is required so we get the unparsed body and node:crypto. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let evt: {
    event?: string;
    data?: { id?: number | string; reference?: string; status?: string };
  };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const eventId = evt.data?.id != null ? String(evt.data.id) : null;
  const reference = evt.data?.reference ?? null;
  const type = evt.event ?? "unknown";

  // Idempotency: record the event id first. A duplicate insert (unique PK) means
  // we've already processed this one — acknowledge and stop.
  if (eventId) {
    const { error: ledgerError } = await supabaseAdmin
      .from("paystack_events")
      .insert({
        id: eventId,
        event_type: type,
        reference,
        payload: JSON.parse(raw) as Json,
      });
    if (ledgerError) {
      if (ledgerError.code === "23505") {
        return NextResponse.json({ status: "already-processed" });
      }
      console.error("[webhook] ledger insert failed:", ledgerError.message);
      // Fall through: better to risk a rare duplicate than drop a payment.
    }
  }

  // We only act on successful charges. Everything else is acknowledged (200) so
  // Paystack stops retrying, but changes nothing.
  if (type === "charge.success" && reference) {
    // Re-verify server-side rather than trusting the payload's status field.
    const verified = await verifyTransaction(reference);
    if (verified.ok && verified.status === "success") {
      await fulfil(reference, verified.paidAt);
    }
  }

  return NextResponse.json({ status: "ok" });
}

/* Flip the matching registration OR donation to paid, and send its receipt.
   Scoped to still-pending rows so a replay can't re-fire the email. */
async function fulfil(reference: string, paidAt: string | null) {
  const paid_at = paidAt ?? new Date().toISOString();

  // ── Registration ──────────────────────────────────────────────────────────
  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .update({ payment_status: "paid", paid_at })
    .eq("paystack_reference", reference)
    .eq("payment_status", "pending")
    .select("id, event_id, full_name, email, amount_kobo, currency")
    .maybeSingle();

  if (reg) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title, slug, starts_at, ends_at, location_or_link, location_type")
      .eq("id", reg.event_id)
      .maybeSingle();

    if (event) {
      const whenLabel = formatEventDateTime(event.starts_at, event.ends_at);
      const whereLabel =
        event.location_or_link ??
        (event.location_type === "online" ? "Online" : "In person");
      const eventUrl = `${siteUrl()}/news/events/${event.slug}`;
      const ics = buildEventIcs({
        uid: `${reg.event_id}@systematicreviewsnetwork.org`,
        title: event.title,
        location: whereLabel,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        url: eventUrl,
      });
      await sendEmail({
        to: reg.email,
        subject: `You're registered — ${event.title}`,
        react: RegistrationConfirmation({
          fullName: reg.full_name,
          eventTitle: event.title,
          whenLabel,
          whereLabel,
          paid: true,
          priceLabel: formatPrice(reg.amount_kobo, (reg.currency ?? "NGN") as "NGN" | "USD"),
          eventUrl,
        }),
        attachments: [
          {
            filename: "event.ics",
            content: Buffer.from(ics, "utf8").toString("base64"),
          },
        ],
      });
    }
    return;
  }

  // ── Donation (§13.5) ───────────────────────────────────────────────────────
  const { data: donation } = await supabaseAdmin
    .from("donations")
    .update({ payment_status: "paid", paid_at })
    .eq("paystack_reference", reference)
    .eq("payment_status", "pending")
    .select("donor_name, email, amount_kobo, currency")
    .maybeSingle();

  if (donation) {
    await sendEmail({
      to: donation.email,
      subject: "Thank you for your donation",
      react: DonationReceipt({
        donorName: donation.donor_name ?? "there",
        amountLabel: formatPrice(
          donation.amount_kobo,
          (donation.currency ?? "NGN") as "NGN" | "USD",
        ),
        reference,
      }),
    });
  }
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}
