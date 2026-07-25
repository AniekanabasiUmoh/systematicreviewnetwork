import { z } from "zod";

/* Zod schemas for public form writes (§3.1) — fields exactly per §6, with the
 * server-side length caps §3.2 requires. These are the authoritative validation
 * boundary: the browser checks are a convenience, these are the guarantee.
 *
 * Every string is trimmed first; empties then read as missing. Optional fields
 * that come in blank are normalized to undefined so we store null, not "".
 * Length caps are generous for humans, tight enough to blunt payload abuse. */

export const email = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address, like name@example.org.");

const name = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(120, "That name is too long — 120 characters max.");

/** Optional free-text: blank → undefined, capped. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

// §6 contact_messages — type=general (contact page) or partnership.
export const contactSchema = z.object({
  name,
  email,
  subject: optionalText(160),
  message: z
    .string()
    .trim()
    .min(1, "Enter a message so we know how to help.")
    .max(2000, "Please keep your message under 2,000 characters."),
  type: z.enum(["general", "partnership"]).default("general"),
});
export type ContactInput = z.infer<typeof contactSchema>;

// The partnership form collects an "interest" line; it is prepended to the
// stored message, since contact_messages has no dedicated interest column (§6).
export const partnershipSchema = z.object({
  name,
  email,
  institution: optionalText(160),
  interest: z
    .string()
    .trim()
    .min(1, "Choose what you're interested in.")
    .max(120, "That value is too long."),
  message: z
    .string()
    .trim()
    .min(1, "Tell us a little about what you have in mind.")
    .max(2000, "Please keep your message under 2,000 characters."),
});
export type PartnershipInput = z.infer<typeof partnershipSchema>;

// §6 newsletter_signups — email only.
export const newsletterSchema = z.object({ email });
export type NewsletterInput = z.infer<typeof newsletterSchema>;

// Admin sign-in (§5.1). No complexity rules on sign-in — those belong on
// invite/password-set, not on every login attempt.
export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// Sprint 5.10 — password reset request. Email only; the response is
// identical whether or not the address has an account (see admin-auth.ts).
export const forgotPasswordSchema = z.object({ email });

// Sprint 5.10 — setting a new password, either from the reset-email link or
// from a signed-in staffer's own account page. Real complexity rules here,
// unlike sign-in, because this is where an account's password is actually
// set for the first time under real conditions.
export const setPasswordSchema = z.object({
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "That password is too long."),
});

/** Turn a ZodError into { field: firstMessage } for the ActionState. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}
