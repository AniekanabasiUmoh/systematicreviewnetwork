"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { ApplicationConfirmation } from "@/lib/email/templates";
import { fieldErrorsFrom } from "./schemas";
import {
  checkRateLimit,
  clientIp,
  isHoneypotTripped,
  RATE_LIMITED_MESSAGE,
} from "./guard";
import type { ActionState } from "./types";
import { PROGRAMMES } from "@/lib/programmes";

/* Sprint 4.2 — programme applications. Validated with zod (§6 fields), stored
 * with status 'received', confirmed by email ("what happens next"). The form
 * keeps the user's input on a validation error, so nothing is retyped. */

const PROGRAMME_TITLES = PROGRAMMES.map((p) => p.title);

const schema = z.object({
  programme: z
    .string()
    .trim()
    .min(1, "Choose the programme you're applying to.")
    .refine((v) => PROGRAMME_TITLES.includes(v), "Choose a listed programme."),
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
  country: z.string().trim().min(1, "Select your country.").max(80),
  motivation: z
    .string()
    .trim()
    .min(1, "Tell us briefly why you'd like to join.")
    .max(2000, "Please keep this under 2,000 characters."),
});

export async function submitApplication(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: SUCCESS };
  }

  const parsed = schema.safeParse({
    programme: form.get("programme"),
    full_name: form.get("full_name"),
    email: form.get("email"),
    institution: form.get("institution") ?? undefined,
    country: form.get("country"),
    motivation: form.get("motivation"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const limit = await checkRateLimit("application", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  const { programme, full_name, email, institution, country, motivation } =
    parsed.data;

  const { error } = await supabaseAdmin.from("applications").insert({
    programme,
    full_name,
    email,
    institution: institution ?? null,
    country,
    motivation,
    status: "received",
  });

  if (error) {
    console.error("[application] insert failed:", error.message);
    return {
      status: "error",
      formError:
        "Something went wrong submitting your application. Please try again in a moment.",
    };
  }

  void sendEmail({
    to: email,
    subject: `Application received — ${programme}`,
    react: ApplicationConfirmation({ fullName: full_name, programme }),
  });

  return { status: "success", message: SUCCESS };
}

const SUCCESS =
  "Your application is in. We've sent a confirmation to your email with what happens next.";
