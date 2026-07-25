"use server";

import { email, fieldErrorsFrom, optionalText } from "@/lib/actions/schemas";
import { type ActionState } from "@/lib/actions/types";
import { requireAdminAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { inviteStaffUser } from "@/lib/admin/invite";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const inviteSchema = z.object({
  email,
  role: z.enum(["admin", "editor"]),
  full_name: optionalText(160),
});

async function adminCount() {
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export async function inviteUser(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;
  const parsed = inviteSchema.safeParse({
    email: form.get("email"),
    role: form.get("role"),
    full_name: form.get("full_name"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const result = await inviteStaffUser({
    email: parsed.data.email,
    role: parsed.data.role,
    fullName: parsed.data.full_name,
  });
  if (!result.ok)
    return { status: "error", formError: "We could not invite that user." };
  void recordAudit(
    auth.user,
    "create",
    "users",
    result.id,
    `Invited ${parsed.data.email} as ${parsed.data.role}`,
  );
  return {
    status: "success",
    message: result.reused
      ? "The existing account's role was updated."
      : `Account created. Share this password over a secure channel: ${result.password}`,
  };
}

export async function changeUserRole(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;
  const id = String(form.get("id") ?? "");
  const role = String(form.get("role") ?? "");
  if (!id || (role !== "admin" && role !== "editor"))
    return { status: "error", formError: "That role change was not valid." };
  if (id === auth.user.id)
    return { status: "error", formError: "You cannot change your own role." };
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("role, email")
    .eq("id", id)
    .maybeSingle();
  if (!target)
    return { status: "error", formError: "That user no longer exists." };
  if (target.role === "admin" && role !== "admin" && (await adminCount()) <= 1)
    return {
      status: "error",
      formError: "Keep at least one administrator account.",
    };
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not update this role." };
  void recordAudit(
    auth.user,
    "update",
    "users",
    id,
    `${target.email ?? "User"} is now ${role}`,
  );
  return { status: "success", message: "Role updated." };
}

export async function removeUser(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;
  const id = String(form.get("id") ?? "");
  if (!id)
    return { status: "error", formError: "That user could not be identified." };
  if (id === auth.user.id)
    return {
      status: "error",
      formError: "You cannot remove your own account.",
    };
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("role, email")
    .eq("id", id)
    .maybeSingle();
  if (!target)
    return { status: "error", formError: "That user no longer exists." };
  if (target.role === "admin" && (await adminCount()) <= 1)
    return {
      status: "error",
      formError: "Keep at least one administrator account.",
    };
  const { error } = await supabaseAdmin.from("profiles").delete().eq("id", id);
  if (error)
    return {
      status: "error",
      formError: "We could not remove this staff profile.",
    };
  void recordAudit(
    auth.user,
    "delete",
    "users",
    id,
    `Removed ${target.email ?? "user"}`,
  );
  return { status: "success", message: "Staff access removed." };
}
