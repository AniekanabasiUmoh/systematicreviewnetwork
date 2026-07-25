"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/ssr";
import { getSessionUser } from "@/lib/admin/auth";
import { adminLoginSchema } from "./schemas";
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
