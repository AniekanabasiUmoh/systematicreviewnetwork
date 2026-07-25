"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { contactSchema, fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* §3.1 — contact / general-enquiry write. Server action on the service-role
 * client (contact_messages has no anon policy). Validates with zod, rate-limits
 * per IP, honours the honeypot. Resend forwarding is wired in Sprint 4.3; for
 * now the message is stored so nothing is lost. */

export async function submitContact(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  // Honeypot: feign success so a bot learns nothing (§3.2).
  if (isHoneypotTripped(form)) {
    return { status: "success", message: SUCCESS };
  }

  const parsed = contactSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    subject: form.get("subject") ?? undefined,
    message: form.get("message"),
    type: form.get("type") ?? "general",
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("contact", await clientIp());
  if (!limit.ok) {
    return { status: "error", formError: RATE_LIMITED_MESSAGE };
  }

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject ?? null,
    message: parsed.data.message,
    type: parsed.data.type,
  });

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return {
      status: "error",
      formError:
        "Something went wrong saving your message. Please try again, or email us directly at info@systematicreviewsnetwork.org.",
    };
  }

  return { status: "success", message: SUCCESS };
}

const SUCCESS =
  "Thanks for getting in touch — your message has reached us and the right person will reply soon.";
