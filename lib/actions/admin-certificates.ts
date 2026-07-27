"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.7 — revoking a certificate.
 *
 * Never a delete. A withdrawn credential must verify as WITHDRAWN, so the
 * employer holding a printed copy learns the truth rather than being told the
 * certificate never existed — which would look like a forgery and would hide
 * that SRN issued it in the first place.
 *
 * The reason is required and is shown publicly on the verification page. A
 * withdrawal with no stated reason is not something an organisation should be
 * able to do quietly. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const revokeSchema = z.object({
  id: z.string().trim().min(1),
  reason: z
    .string()
    .trim()
    .min(
      1,
      "Say why this is being withdrawn — whoever checks the code will see it.",
    )
    .max(300),
});

export async function revokeCertificate(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = revokeSchema.safeParse({
    id: formValue(form, "id"),
    reason: formValue(form, "reason"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { data: certificate } = await supabaseAdmin
    .from("certificates")
    .select("id, code, learner_name, revoked_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!certificate)
    return { status: "error", formError: "That certificate no longer exists." };
  if (certificate.revoked_at)
    return {
      status: "error",
      formError: "That certificate has already been withdrawn.",
    };

  const { error } = await supabaseAdmin
    .from("certificates")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: parsed.data.reason,
      revoked_by: auth.user.email,
    } as never)
    .eq("id", parsed.data.id);

  if (error)
    return { status: "error", formError: "We could not withdraw that." };

  revalidatePath("/admin/certificates");
  void recordAudit(
    auth.user,
    "update",
    "certificates",
    parsed.data.id,
    `Withdrew ${certificate.code} (${certificate.learner_name}) — ${parsed.data.reason}`,
  );
  return {
    status: "success",
    message:
      "Withdrawn. Anyone checking that code now sees that it is no longer valid.",
  };
}

export async function restoreCertificate(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: certificate } = await supabaseAdmin
    .from("certificates")
    .select("id, code, learner_name")
    .eq("id", id)
    .maybeSingle();
  if (!certificate)
    return { status: "error", formError: "That certificate no longer exists." };

  const { error } = await supabaseAdmin
    .from("certificates")
    .update({
      revoked_at: null,
      revoked_reason: null,
      revoked_by: null,
    } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not restore that." };

  revalidatePath("/admin/certificates");
  void recordAudit(
    auth.user,
    "update",
    "certificates",
    id,
    `Restored ${certificate.code} (${certificate.learner_name})`,
  );
  return { status: "success", message: "Restored. The code verifies again." };
}
