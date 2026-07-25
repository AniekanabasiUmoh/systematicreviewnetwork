"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, SRN_INBOX } from "@/lib/email/client";
import { InternalEnquiryNotification } from "@/lib/email/templates";
import { partnershipSchema, fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";

/* §3.1 / §2.7 — partnership enquiry. Stored in contact_messages with
 * type=partnership (§6). §6 has no `interest`/`institution` columns of its own,
 * so both are folded into the message body and a subject line, keeping the row
 * self-describing for whoever reads it in the admin. */

export async function submitPartnership(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: SUCCESS };
  }

  const parsed = partnershipSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    institution: form.get("institution") ?? undefined,
    interest: form.get("interest"),
    message: form.get("message"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("partnership", await clientIp());
  if (!limit.ok) {
    return { status: "error", formError: RATE_LIMITED_MESSAGE };
  }

  const { name, email, institution, interest, message } = parsed.data;
  const body = [
    `Interest: ${interest}`,
    institution ? `Institution: ${institution}` : null,
    "",
    message,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name,
    email,
    subject: `Partnership enquiry — ${interest}`,
    message: body,
    type: "partnership",
  });

  if (error) {
    console.error("[partnership] insert failed:", error.message);
    return {
      status: "error",
      formError:
        "Something went wrong sending your enquiry. Please try again, or email us directly at info@systematicreviewsnetwork.org.",
    };
  }

  // §4.3 — forward to SRN with reply-to = the enquirer.
  void sendEmail({
    to: SRN_INBOX,
    replyTo: email,
    subject: `[Partnership] ${interest} — ${name}`,
    react: InternalEnquiryNotification({
      kind: "partnership",
      name,
      email,
      subject: `Partnership enquiry — ${interest}`,
      message: body,
    }),
  });

  return { status: "success", message: SUCCESS };
}

const SUCCESS =
  "Thanks — your enquiry has reached us. The right person will be in touch soon to talk it through.";
