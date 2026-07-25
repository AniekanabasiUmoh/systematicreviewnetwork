"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  initializeTransaction,
  isConfigured as paystackConfigured,
  newReference,
} from "@/lib/paystack";
import { fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* §13.5 — donations, live Paystack. Same trust rules as registration: the row
 * is created 'pending' (no fulfilment), a transaction is initialized, and the
 * webhook — verified server-side — flips it to 'paid' and sends the receipt.
 * Anonymous giving is allowed (donor_name nullable). Amount is entered in the
 * major unit and stored as minor-unit integer (§13.1). */

type DonationResult = ActionState | { status: "redirect"; url: string };

const schema = z.object({
  amount: z.coerce
    .number({ message: "Enter an amount." })
    .positive("Enter an amount greater than zero.")
    .max(10_000_000, "Please enter a smaller amount."),
  currency: z.enum(["NGN", "USD"]).default("NGN"),
  donor_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined)),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address for your receipt.")
    .max(254)
    .email("Enter a valid email address, like name@example.org."),
  message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  anonymous: z.coerce.boolean().optional(),
});

export async function submitDonation(
  _prev: DonationResult,
  form: FormData,
): Promise<DonationResult> {
  if (isHoneypotTripped(form)) {
    return {
      status: "error",
      formError: "Something went wrong. Please try again.",
    };
  }

  const parsed = schema.safeParse({
    amount: form.get("amount"),
    currency: form.get("currency") ?? "NGN",
    donor_name: form.get("donor_name") ?? undefined,
    email: form.get("email"),
    message: form.get("message") ?? undefined,
    anonymous: form.get("anonymous") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("donation", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  if (!paystackConfigured()) {
    return {
      status: "error",
      formError:
        "Secure online giving is being switched on. In the meantime, please email info@systematicreviewsnetwork.org and we'll arrange your gift with you.",
    };
  }

  const { amount, currency, donor_name, email, message, anonymous } =
    parsed.data;
  const amount_kobo = Math.round(amount * 100);
  const reference = newReference("don");

  const { error } = await supabaseAdmin.from("donations").insert({
    amount_kobo,
    currency,
    donor_name: anonymous ? null : (donor_name ?? null),
    email,
    message: message ?? null,
    paystack_reference: reference,
    payment_status: "pending",
  });

  if (error) {
    console.error("[donation] insert failed:", error.message);
    return {
      status: "error",
      formError: "Something went wrong. Please try again in a moment.",
    };
  }

  const init = await initializeTransaction({
    email,
    amount: amount_kobo,
    currency,
    reference,
    callbackUrl: `${siteUrl()}/partner/thank-you?ref=${reference}`,
    metadata: { kind: "donation" },
  });

  if (!init.ok) {
    console.error("[donation] paystack init failed:", init.error);
    return {
      status: "error",
      formError:
        "We couldn't start the payment just now. Please try again in a moment.",
    };
  }

  return { status: "redirect", url: init.authorizationUrl };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}
