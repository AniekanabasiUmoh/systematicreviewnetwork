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

/* Sprint 6.8 — instructors.
 *
 * Deliberately a SEPARATE type from StaffUser, and getSessionUser() below still
 * returns null for them. An instructor is not a weaker staff member; they are a
 * different kind of user who signs in through the same door.
 *
 * Keeping them out of StaffUser is what makes the boundary hold by
 * construction: every `requireStaff()` in the admin — dozens of pages, every
 * content action — refuses an instructor without any of those call sites
 * needing to know instructors exist. The alternative, a third role inside
 * StaffUser, would mean each of those places had to remember to exclude it,
 * and one forgotten check is a content-management leak.
 *
 * Their access comes only from being assigned to a cohort. See
 * is_instructor_for() in 20260728000002. */
export type InstructorUser = {
  id: string;
  email: string;
  full_name: string | null;
  /** Cohort ids they teach. Empty means they can reach nothing. */
  cohortIds: string[];
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

/* -------------------------------------------------------------------------- */
/* Instructors (Sprint 6.8)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Who is signed in as an instructor, with the cohorts they teach — or null.
 *
 * Same posture as getSessionUser(): identity comes from the verified JWT, but
 * the role and the assignments are read on the SERVICE ROLE client using that
 * id. Never from a cookie or a token claim.
 */
export async function getInstructor(): Promise<InstructorUser | null> {
  const db = await createSessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "instructor") return null;

  const { data: assignments } = await supabaseAdmin
    .from("cohort_instructors")
    .select("cohort_id")
    .eq("instructor_id", profile.id);

  return {
    id: profile.id,
    email: profile.email ?? auth.user.email ?? "",
    full_name: profile.full_name,
    cohortIds: (assignments ?? []).map((row) => row.cohort_id),
  };
}

/** Signed in as an instructor, or sent to the login page. */
export async function requireInstructor(): Promise<InstructorUser> {
  const instructor = await getInstructor();
  if (!instructor) redirect("/admin/login");
  return instructor;
}

/**
 * The gate that matters: does this instructor teach THIS cohort?
 *
 * Called at the top of every instructor route that names a cohort in its URL.
 * A cohort id in a path is a claim, not a permission — this is what checks it.
 */
export function teachesCohort(
  instructor: InstructorUser,
  cohortId: string,
): boolean {
  return instructor.cohortIds.includes(cohortId);
}

/** Action-side variant, returning an ActionState rather than redirecting. */
export async function requireInstructorAction(): Promise<
  { ok: true; instructor: InstructorUser } | { ok: false; state: ActionState }
> {
  const instructor = await getInstructor();
  if (!instructor) {
    return { ok: false, state: { status: "error", formError: SIGNED_OUT_MESSAGE } };
  }
  return { ok: true, instructor };
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
