"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireAdminAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.8 — assigning instructors to cohorts.
 *
 * requireAdminAction, not requireStaffAction: assignment is the ONLY thing that
 * widens an instructor beyond seeing nothing, so it belongs with user
 * management rather than with content editing. An editor who can assign
 * teaching rights is an editor who can grant access to learner data. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const assignSchema = z.object({
  cohort_id: z.string().trim().min(1, "Choose a cohort."),
  email: z
    .string()
    .trim()
    .min(1, "Enter the instructor's email address.")
    .email("That does not look like an email address."),
});

export async function assignInstructor(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;

  const parsed = assignSchema.safeParse({
    cohort_id: formValue(form, "cohort_id"),
    email: formValue(form, "email"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const email = parsed.data.email.toLowerCase();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      status: "error",
      fieldErrors: {
        email: `Nobody with a staff account uses ${email}. Invite them first, then assign them here.`,
      },
    };
  }

  /* Assigning does not GRANT the role. Someone has to be an instructor before
     they can be assigned one, so an admin cannot accidentally turn an editor
     into an instructor — or quietly demote one — by typing an email here. */
  if (profile.role !== "instructor") {
    return {
      status: "error",
      fieldErrors: {
        email: `${email} is an ${profile.role}, not an instructor. Change their role first if they should be teaching.`,
      },
    };
  }

  const { error } = await supabaseAdmin.from("cohort_instructors").insert({
    instructor_id: profile.id,
    cohort_id: parsed.data.cohort_id,
    assigned_by: auth.user.email,
  } as never);

  if (error) {
    // 23505 — already assigned. Not a failure worth alarming anyone about.
    if ((error as { code?: string }).code === "23505") {
      return {
        status: "success",
        message: `${email} already teaches this cohort.`,
      };
    }
    console.error("[instructors] assign failed:", error.message);
    return { status: "error", formError: "We could not assign them." };
  }

  revalidatePath(`/admin/courses`);
  void recordAudit(
    auth.user,
    "create",
    "cohort_instructors",
    parsed.data.cohort_id,
    `Assigned ${email} to teach a cohort`,
  );
  return {
    status: "success",
    message: `${email} can now see this cohort's learners and mark their work.`,
  };
}

export async function unassignInstructor(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: row } = await supabaseAdmin
    .from("cohort_instructors")
    .select("id, cohort_id, profiles (email)")
    .eq("id", id)
    .maybeSingle();
  if (!row)
    return { status: "error", formError: "That assignment no longer exists." };

  const { error } = await supabaseAdmin
    .from("cohort_instructors")
    .delete()
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not remove them." };

  const email =
    (row as unknown as { profiles: { email: string } | null }).profiles?.email ??
    "That instructor";

  revalidatePath("/admin/courses");
  void recordAudit(
    auth.user,
    "delete",
    "cohort_instructors",
    id,
    `Unassigned ${email} from a cohort`,
  );
  return {
    status: "success",
    message: `${email} can no longer see this cohort. Marks they already gave are unchanged.`,
  };
}
