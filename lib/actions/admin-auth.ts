"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/ssr";
import { getSessionUser, requireStaffAction } from "@/lib/admin/auth";
import {
  adminLoginSchema,
  forgotPasswordSchema,
  setPasswordSchema,
} from "./schemas";
import { checkRateLimit, clientIp, isHoneypotTripped } from "./guard";
import type { ActionState } from "./types";

/* §5.1 — admin sign-in / sign-out. Same shape as every public form action:
 * honeypot, zod, rate limit, then the actual work. One generic error covers
 * both a wrong email and a wrong password, so a failed attempt never
 * discloses which one was wrong (account enumeration). */

const INVALID_CREDENTIALS =
  "That email and password don't match an account. Check both and try again.";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

export async function signIn(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  // A bot must not learn the honeypot dropped it, but a human must not be
  // told sign-in "worked" either — return the same generic failure.
  if (isHoneypotTripped(form)) {
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  const parsed = adminLoginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    next: form.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  // This is the brute-force gate — reuse the shared 5/hour limiter verbatim.
  const limit = await checkRateLimit("admin-login", await clientIp());
  if (!limit.ok) {
    return {
      status: "error",
      formError:
        "Too many sign-in attempts. Please wait a while and try again.",
    };
  }

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  // An auth user without a `profiles` row is not staff.
  const staff = await getSessionUser();
  if (!staff) {
    await db.auth.signOut();
    return { status: "error", formError: INVALID_CREDENTIALS };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://systematicreviewsnetwork.org"
  );
}

const RESET_REQUESTED_MESSAGE =
  "If that email has an account, we've sent a link to reset the password. It expires in an hour.";

/**
 * §5.10 — request a password reset.
 *
 * Returns the SAME message whether or not the address has an account. A
 * message that varies by outcome ("no account with that email" vs "check
 * your inbox") is an account-enumeration oracle — it lets anyone learn which
 * email addresses are staff accounts just by trying them here.
 */
export async function requestPasswordReset(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isHoneypotTripped(form)) {
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) {
    // Even a malformed email gets the same generic message, for the same
    // enumeration reason — the field error would only tell an attacker the
    // form is validating, not leak an account, so this is a stricter choice
    // than strictly required, applied for consistency with the rest of the flow.
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const limit = await checkRateLimit("admin-forgot-password", await clientIp());
  if (!limit.ok) {
    // Still the same message: a rate-limit-specific error would itself leak
    // that *something* about this address triggered extra scrutiny.
    return { status: "success", message: RESET_REQUESTED_MESSAGE };
  }

  const db = await createSessionClient();
  await db.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/admin/reset`,
  });

  return { status: "success", message: RESET_REQUESTED_MESSAGE };
}

/**
 * §5.10 — set a new password. Used by BOTH the reset-email link (the user
 * arrives already signed into a short-lived recovery session established by
 * Supabase Auth from the emailed link) and, with requireStaffAction added at
 * the call site's discretion, could be reused for a normal change — but
 * account.ts calls this directly because Supabase's updateUser works the
 * same way for a signed-in user in either case.
 */
export async function setNewPassword(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = setPasswordSchema.safeParse({
    password: form.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: { password: parsed.error.issues[0]?.message ?? "Enter a password." } };
  }

  const db = await createSessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) {
    return {
      status: "error",
      formError:
        "This reset link has expired or was already used. Request a new one.",
    };
  }

  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      formError: "We could not set that password. Please try again.",
    };
  }

  return { status: "success", message: "Password updated. You can sign in now." };
}

/** §5.10 — change your own password from inside the admin, with the current one required. */
export async function changeOwnPassword(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const currentPassword = form.get("current_password");
  if (typeof currentPassword !== "string" || !currentPassword) {
    return {
      status: "error",
      fieldErrors: { current_password: "Enter your current password." },
    };
  }
  const parsed = setPasswordSchema.safeParse({
    password: form.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { password: parsed.error.issues[0]?.message ?? "Enter a password." },
    };
  }

  const db = await createSessionClient();
  // Re-authenticate with the current password before allowing the change —
  // a staffer who steps away from an unlocked session should not let anyone
  // who finds it silently take over the account.
  const { error: verifyError } = await db.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return {
      status: "error",
      fieldErrors: { current_password: "That is not your current password." },
    };
  }

  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      formError: "We could not update your password. Please try again.",
    };
  }

  return { status: "success", message: "Password updated." };
}
