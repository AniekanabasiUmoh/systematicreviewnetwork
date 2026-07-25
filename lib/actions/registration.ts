"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, SRN_INBOX } from "@/lib/email/client";
import {
  RegistrationConfirmation,
  RegistrationPaymentPending,
  InternalSubmissionNotification,
} from "@/lib/email/templates";
import { buildEventIcs } from "@/lib/ics";
import {
  registrationState,
  formatEventDateTime,
  formatPrice,
  isFree,
} from "@/lib/events";
import {
  initializeTransaction,
  isConfigured as paystackConfigured,
  newReference,
} from "@/lib/paystack";
import { z } from "zod";
import { fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* Sprint 4.1 — event registration. The write is atomic-in-intent: every gate
 * (published? window open? capacity? duplicate?) is checked server-side against
 * live data before insert, and the unique index (event_id, lower(email)) is the
 * final backstop against a race, surfaced as a friendly "already registered".
 *
 * Free events (§13.1): insert payment_status='not_required' — the seat is held
 * immediately — then send the confirmation with an .ics attachment.
 *
 * Paid events (§13.2): insert payment_status='pending' (NO seat held), init a
 * Paystack transaction, and return its checkout URL for the client to redirect
 * to. The seat is held only when the charge.success webhook flips the row to
 * 'paid'. If Paystack isn't configured yet, we don't fake a checkout — we tell
 * the user to enquire, honestly. */

const schema = z.object({
  event_id: z.string().uuid(),
  full_name: z
    .string()
    .trim()
    .min(1, "Enter your full name.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .max(254)
    .email("Enter a valid email address, like name@example.org."),
  institution: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v ? v : undefined)),
  country: z
    .string()
    .trim()
    .min(1, "Select your country.")
    .max(80),
});

type RegResult =
  | ActionState
  | { status: "redirect"; url: string };

export async function submitRegistration(
  _prev: RegResult,
  form: FormData,
): Promise<RegResult> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: HONEYPOT_MESSAGE };
  }

  const parsed = schema.safeParse({
    event_id: form.get("event_id"),
    full_name: form.get("full_name"),
    email: form.get("email"),
    institution: form.get("institution") ?? undefined,
    country: form.get("country"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;

  const limit = await checkRateLimit("registration", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  // Load the event fresh (service role: we need it regardless of RLS, and to
  // read the true, current state).
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", input.event_id)
    .maybeSingle();

  if (!event || event.status !== "published") {
    return {
      status: "error",
      formError: "This event is no longer available for registration.",
    };
  }

  // Confirmed-seat count (paid + not_required), then the state machine — the
  // same logic the page shows, evaluated at submit time so a just-closed or
  // just-filled event is caught.
  const { data: heldRows } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .eq("event_id", event.id)
    .in("payment_status", ["paid", "not_required"]);
  const seatsTaken = heldRows?.length ?? 0;

  const state = registrationState(event, seatsTaken);
  if (state !== "open") {
    return { status: "error", formError: STATE_MESSAGE[state] };
  }

  const free = isFree(event.price_kobo);
  const reference = free ? null : newReference();

  // Insert. Duplicate (unique index) → friendly already-registered message.
  const { error: insertError } = await supabaseAdmin.from("registrations").insert({
    event_id: event.id,
    full_name: input.full_name,
    email: input.email,
    institution: input.institution ?? null,
    country: input.country,
    payment_status: free ? "not_required" : "pending",
    paystack_reference: reference,
    amount_kobo: free ? null : event.price_kobo,
    currency: free ? null : event.currency,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        status: "error",
        formError:
          "You're already registered for this event — check your email for the confirmation. If you can't find it, reply to us and we'll resend it.",
      };
    }
    console.error("[registration] insert failed:", insertError.message);
    return {
      status: "error",
      formError:
        "Something went wrong saving your registration. Please try again in a moment.",
    };
  }

  const whenLabel = formatEventDateTime(event.starts_at, event.ends_at);
  const whereLabel =
    event.location_or_link ??
    (event.location_type === "online" ? "Online" : "In person");
  const eventUrl = `${siteUrl()}/news/events/${event.slug}`;

  // Sprint 5.10 — instant internal notification, fire-and-forget. Never
  // awaited into the response path: a notification failure must not affect
  // the person registering. No digest, no cron — every submission notifies.
  void sendEmail({
    to: SRN_INBOX,
    subject: `New registration — ${event.title}`,
    react: InternalSubmissionNotification({
      kind: "registration",
      heading: "New registration",
      rows: [
        { label: "Event", value: event.title },
        { label: "Name", value: input.full_name },
        { label: "Email", value: input.email },
        { label: "Status", value: free ? "Confirmed (free)" : "Awaiting payment" },
      ],
      adminUrl: `${siteUrl()}/admin/operations/registrations`,
    }),
  });

  // ── Free: seat held now, send the confirmation with calendar file. ────────
  if (free) {
    await sendConfirmation(event, input, whenLabel, whereLabel, eventUrl);
    return { status: "success", message: successMessage(false) };
  }

  // ── Paid: hold nothing yet; take them to checkout. ────────────────────────
  const priceLabel = formatPrice(event.price_kobo, event.currency);

  if (!paystackConfigured()) {
    // No fake checkout. The pending row is harmless (holds no seat) and lets
    // staff follow up. Tell the truth.
    return {
      status: "error",
      formError: `Online payment for this ${priceLabel} event is being switched on. Please email info@systematicreviewsnetwork.org to complete your registration and we'll help you straight away.`,
    };
  }

  const init = await initializeTransaction({
    email: input.email,
    amount: event.price_kobo as number,
    currency: (event.currency ?? "NGN") as "NGN" | "USD",
    reference: reference as string,
    callbackUrl: `${siteUrl()}/news/events/${event.slug}/registered?ref=${reference}`,
    metadata: { event_id: event.id, full_name: input.full_name },
  });

  if (!init.ok) {
    console.error("[registration] paystack init failed:", init.error);
    return {
      status: "error",
      formError:
        "We couldn't start the payment just now. Please try again in a moment.",
    };
  }

  // Optional: nudge email with the pay link (fire-and-forget).
  void sendEmail({
    to: input.email,
    subject: `Complete your payment — ${event.title}`,
    react: RegistrationPaymentPending({
      fullName: input.full_name,
      eventTitle: event.title,
      priceLabel,
      payUrl: init.authorizationUrl,
    }),
  });

  return { status: "redirect", url: init.authorizationUrl };
}

async function sendConfirmation(
  event: { title: string; id: string; starts_at: string; ends_at: string | null; location_or_link: string | null; slug: string; price_kobo: number | null; currency: "NGN" | "USD" | null },
  input: { full_name: string; email: string },
  whenLabel: string,
  whereLabel: string,
  eventUrl: string,
) {
  const ics = buildEventIcs({
    uid: `${event.id}@systematicreviewsnetwork.org`,
    title: event.title,
    location: whereLabel,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    url: eventUrl,
  });

  await sendEmail({
    to: input.email,
    subject: `You're registered — ${event.title}`,
    react: RegistrationConfirmation({
      fullName: input.full_name,
      eventTitle: event.title,
      whenLabel,
      whereLabel,
      paid: false,
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

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}

function successMessage(paid: boolean): string {
  return paid
    ? "Payment confirmed — you're registered. A confirmation email is on its way."
    : "You're registered! A confirmation email with a calendar invite is on its way.";
}

const HONEYPOT_MESSAGE =
  "You're registered! A confirmation email is on its way.";

const STATE_MESSAGE: Record<string, string> = {
  not_yet_open: "Registration for this event hasn't opened yet.",
  closed: "Registration for this event has closed.",
  full: "This event filled up while you were registering — it's now fully booked.",
  past: "This event has already taken place.",
};
