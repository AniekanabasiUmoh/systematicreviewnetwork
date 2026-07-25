import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { StaffUser } from "./auth";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "status_change"
  | "reorder"
  | "export";

/**
 * Fire-and-forget audit write. Never blocks or fails a mutation: the content
 * change is the user's work, the audit line is ours.
 */
export async function recordAudit(
  actor: StaffUser,
  action: AuditAction,
  resource: string,
  resourceId: string | null,
  summary: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    resource,
    resource_id: resourceId,
    summary,
  });
  if (error) console.error("[audit] write failed:", error.message);
}
