"use client";

import { ActionForm } from "./AcademyActions";
import { syncNewsletterToCampaign } from "@/lib/actions/admin-campaign";

/* Sprint 7.5 — the manual sync control.
 *
 * The count is named in the confirm text before the click. Pushing personal
 * data to a third party should never be a leap of faith about how much. */

export function SyncAllButton({ count }: { count: number }) {
  return (
    <ActionForm
      action={syncNewsletterToCampaign}
      fields={{}}
      label={`Sync ${count} ${count === 1 ? "subscriber" : "subscribers"}`}
      pendingLabel="Syncing…"
      variant="primary"
      confirm={`Send ${count} ${count === 1 ? "address" : "addresses"} to the campaign tool?\n\nEach one goes with the date they consented and the form they used. Anyone who has unsubscribed is not included.`}
    />
  );
}
