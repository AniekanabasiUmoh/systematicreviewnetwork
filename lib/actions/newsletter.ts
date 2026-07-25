"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { newsletterSchema, fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* §3.1 / §4.3 — newsletter signup. Deduped by lower(email) via the unique
 * index; a repeat signup is a friendly no-op, never an error, and never reveals
 * whether the address was already on the list. */

const SUCCESS =
  "You're on the list — we'll email you when new training and opportunities open.";

export async function subscribeNewsletter(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: SUCCESS };
  }

  const parsed = newsletterSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("newsletter", await clientIp());
  if (!limit.ok) {
    return { status: "error", formError: RATE_LIMITED_MESSAGE };
  }

  const { error } = await supabaseAdmin
    .from("newsletter_signups")
    .insert({ email: parsed.data.email });

  // 23505 = unique violation: already subscribed. Treat as success (§4.3).
  if (error && error.code !== "23505") {
    console.error("[newsletter] insert failed:", error.message);
    return {
      status: "error",
      formError: "Something went wrong. Please try again in a moment.",
    };
  }

  return { status: "success", message: SUCCESS };
}
