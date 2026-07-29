"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireAdminAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isConfigured, syncAll } from "@/lib/email/campaign";

/* Sprint 7.5 — pushing the list to the campaign tool.
 *
 * requireAdminAction, not requireStaffAction: this sends personal data to a
 * third party. That is a user-management decision, not a content one. */

export async function syncNewsletterToCampaign(
  _prev: ActionState = idle,
  _form: FormData,
): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;

  if (!isConfigured()) {
    return {
      status: "error",
      formError:
        "No campaign tool is connected. Set BREVO_API_KEY and BREVO_LIST_ID first.",
    };
  }

  /* Unsubscribed people are excluded by the QUERY rather than filtered
     afterwards — the one place this could go wrong is the one that matters, so
     their addresses never enter memory here at all. */
  const { data, error } = await supabaseAdmin
    .from("newsletter_signups")
    .select("email, created_at")
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[campaign] read failed:", error.message);
    return { status: "error", formError: "We could not read the list." };
  }

  const subscribers = (data ?? []).map((row) => ({
    email: row.email,
    consentedAt: row.created_at,
    source: "website",
  }));

  if (subscribers.length === 0) {
    return {
      status: "error",
      formError: "Nobody is subscribed, so there is nothing to send.",
    };
  }

  const result = await syncAll(subscribers);

  revalidatePath("/admin/newsletter-sync");
  void recordAudit(
    auth.user,
    "export",
    "newsletter_signups",
    null,
    `Synced ${result.synced} subscribers to the campaign tool (${result.failed} failed)`,
  );

  if (result.failed > 0 && result.synced === 0) {
    return {
      status: "error",
      formError: `Nothing synced. ${result.errors[0] ?? "The campaign tool refused every address."}`,
    };
  }

  return {
    status: "success",
    message:
      result.failed === 0
        ? `${result.synced} ${result.synced === 1 ? "address" : "addresses"} synced.`
        : `${result.synced} synced, ${result.failed} failed. ${result.errors.slice(0, 2).join("; ")}`,
  };
}
