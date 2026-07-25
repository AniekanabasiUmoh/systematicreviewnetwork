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

/* Sprint 4.2 — programme applications. Validated with zod (§6 fields), stored
 * with status 'received', confirmed by email ("what happens next"). The form
 * keeps the user's input on a validation error, so nothing is retyped.
 *
 * Sprint 5.7 moved programmes into the database, which moved the validation
 * boundary of this live public form. See findProgrammeByTitle below. */

const schema = z.object({
  programme: z
    .string()
    .trim()
    .min(1, "Choose the programme you're applying to.")
    .max(180),
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

/**
 * Resolves a submitted programme title to its row — deliberately WITHOUT
 * filtering on status or archived_at.
 *
 * This looks like a missing filter. It is not. The rule is: reject the
 * *unknown*, accept the *retired*. A programme can be retired or unpublished
 * between the moment someone loads the form and the moment they submit it;
 * refusing that submission would lose a real application and tell the
 * applicant, wrongly, that they picked something invalid. An unrecognised
 * title (a crafted request, a stale bookmark from a deleted programme) still
 * gets rejected, because no row comes back at all.
 *
 * Runs on the service role so it can see draft/retired rows that RLS hides
 * from anon. It returns only an id, never content.
 */
async function findProgrammeByTitle(title: string) {
  const { data } = await supabaseAdmin
    .from("programmes")
    .select("id")
    .eq("title", title)
    .limit(1)
    .maybeSingle();
  return data;
}

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

  // Zod cannot do an async lookup, so the programme check sits here — after
  // shape validation, before the rate-limit call (a bad programme name is a
  // validation error, not something to spend a rate-limit token on).
  const programmeRow = await findProgrammeByTitle(parsed.data.programme);
  if (!programmeRow) {
    return {
      status: "error",
      fieldErrors: { programme: "Choose a listed programme." },
    };
  }

  const limit = await checkRateLimit("application", await clientIp());
  if (!limit.ok) return { status: "error", formError: RATE_LIMITED_MESSAGE };

  const { programme, full_name, email, institution, country, motivation } =
    parsed.data;

  const { error } = await supabaseAdmin.from("applications").insert({
    programme, // text snapshot — never rewritten, so a later rename cannot
    // relabel this application (§5.7 constraint 3).
    programme_id: programmeRow.id,
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
