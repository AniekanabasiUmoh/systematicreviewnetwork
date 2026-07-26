import { z } from "zod";
import { email, optionalText } from "./schemas";

/* Learner-account schemas (Design.md §9 Sprint 6.1).
 *
 * Reuses `email` and `optionalText` from ./schemas rather than redefining them,
 * so a change to the site's email rules applies everywhere at once.
 *
 * Password rules match setPasswordSchema (§5.10): real complexity is enforced
 * where a password is SET, never on sign-in — a length rule on a sign-in form
 * only tells an attacker about your policy while annoying legitimate users
 * whose existing password predates it.
 */

/** Countries come from the shared list; validated as a non-empty string here
 *  and checked against lib/countries.ts at the call site, matching how the
 *  registration form already works. */
const country = z
  .string()
  .trim()
  .min(1, "Select your country.")
  .max(80, "That value is too long.");

const fullName = z
  .string()
  .trim()
  .min(1, "Enter your full name.")
  .max(120, "That name is too long — 120 characters max.");

/**
 * ORCID: four groups of four digits, final character may be X (the ISO 7064
 * checksum character). Mirrors the CHECK constraint on `learners.orcid`, so a
 * value that passes here cannot then be refused by the database.
 */
const orcid = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,
    "Enter an ORCID like 0000-0002-1825-0097.",
  )
  .optional()
  .or(z.literal("").transform(() => undefined));

export const learnerSignUpSchema = z.object({
  full_name: fullName,
  email,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "That password is too long."),
  country,
  institution: optionalText(160),
});
export type LearnerSignUpInput = z.infer<typeof learnerSignUpSchema>;

/** Sign-in: no complexity rules, for the reason given above. */
export const learnerSignInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

/**
 * Profile edit. Email is deliberately ABSENT: changing the address that
 * identifies an account is a re-verification flow, not a text field, and
 * `registrations.email` is a historical snapshot that must not be rewritten
 * by a profile edit (Phase 6 decision 5).
 */
export const learnerProfileSchema = z.object({
  full_name: fullName,
  country,
  institution: optionalText(160),
  orcid,
});
export type LearnerProfileInput = z.infer<typeof learnerProfileSchema>;
