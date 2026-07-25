import "server-only";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";

export type StaffUser = {
  id: string;
  email: string;
  role: "admin" | "editor";
  full_name: string | null;
};

export const SIGNED_OUT_MESSAGE =
  "Your session has expired. Sign in again and your work will be here.";
export const NOT_PERMITTED_MESSAGE =
  "You don't have permission to do that. Ask an administrator if you need access.";

/**
 * Who is signed in, with their role — or null. Never throws, never
 * redirects. Use in layouts/nav where "signed out" is a renderable state.
 */
export async function getSessionUser(): Promise<StaffUser | null> {
  const db = await createSessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  // Role is read on the SERVICE ROLE client, from the id the verified JWT
  // gave us. Never trust a role from the client, a cookie, or JWT metadata:
  // app_metadata is settable by any path that can mint a token.
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!data) return null; // authenticated but not staff — treat as signed out
  if (data.role !== "admin" && data.role !== "editor") return null;

  return {
    id: data.id,
    email: data.email ?? auth.user.email ?? "",
    role: data.role,
    full_name: data.full_name,
  };
}

/**
 * Admin OR editor. Redirects to login when absent. Call at the top of every
 * admin page.
 */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * Admin only. An editor hitting an admin-only URL gets a forbidden notice,
 * not a redirect loop — they ARE signed in, they simply may not be here.
 * §5.1 done-when: "editor cannot reach user management by URL".
 */
export async function requireAdmin(): Promise<StaffUser> {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin?denied=1");
  return user;
}

/**
 * Non-redirecting variant for server actions, which must return an
 * ActionState rather than throw a redirect into a form submission.
 */
export async function requireStaffAction(): Promise<
  { ok: true; user: StaffUser } | { ok: false; state: ActionState }
> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, state: { status: "error", formError: SIGNED_OUT_MESSAGE } };
  }
  return { ok: true, user };
}

export async function requireAdminAction(): Promise<
  { ok: true; user: StaffUser } | { ok: false; state: ActionState }
> {
  const staff = await requireStaffAction();
  if (!staff.ok) return staff;
  if (staff.user.role !== "admin") {
    return { ok: false, state: { status: "error", formError: NOT_PERMITTED_MESSAGE } };
  }
  return staff;
}
