import { requireAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { isConfigured } from "@/lib/email/campaign";
import { SyncAllButton } from "@/components/admin/CampaignSync";

/* Sprint 7.5 — the campaign tool's status, and a way to repair drift.
 *
 * requireAdmin rather than requireStaff: this pushes personal data to a third
 * party, which belongs with user management rather than content editing.
 *
 * The page is honest about not being connected. An integration that silently
 * no-ops looks identical to one that is working until someone checks the
 * campaign tool and finds it empty. */

export const dynamic = "force-dynamic";

export default async function NewsletterSyncPage() {
  await requireAdmin();

  const [total, unsubscribed] = await Promise.all([
    supabaseAdmin
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .not("unsubscribed_at", "is", null),
  ]);

  const all = total.count ?? 0;
  const gone = unsubscribed.count ?? 0;
  const active = all - gone;
  const connected = isConfigured();

  return (
    <>
      <AdminPageHeader
        title="Newsletter sync"
        description="Keeping the campaign tool's list in step with this one, in both directions."
      />

      {!connected ? (
        <div className="border-hairline bg-mist/60 mb-6 border p-5">
          <p className="text-ink text-small font-semibold">
            No campaign tool is connected.
          </p>
          <p className="text-slate text-small mt-2 max-w-2xl leading-relaxed">
            Signups are being recorded here as normal — nothing is being lost.
            What is not happening is the push to a campaign tool for designed
            sends and analytics. Set BREVO_API_KEY and BREVO_LIST_ID in the
            deployment&rsquo;s environment variables and this page starts
            working; no code change is needed.
          </p>
          <p className="text-slate text-small mt-3 max-w-2xl leading-relaxed">
            Set CAMPAIGN_WEBHOOK_SECRET too, and point Brevo&rsquo;s
            unsubscribe webhook at /api/webhooks/campaign. Without it, someone
            who unsubscribes inside a Brevo email stays subscribed here, and the
            next export would mail a person who opted out.
          </p>
        </div>
      ) : null}

      <div className="border-hairline bg-paper mb-8 border p-5">
        <p className="text-ink text-small font-semibold">The list</p>
        <p className="text-slate text-small mt-2">
          {active} {active === 1 ? "person is" : "people are"} subscribed ·{" "}
          {gone} unsubscribed · {all} total
        </p>
        <p className="text-slate text-small mt-2 max-w-2xl leading-relaxed">
          Unsubscribed people stay listed here so the export can exclude them
          and so a later re-subscribe is not mistaken for a new one. They are
          never included in a send.
        </p>
      </div>

      {connected ? (
        <section>
          <h2 className="text-ink text-small mb-2 font-semibold">
            Push everyone across
          </h2>
          <p className="text-slate text-small mb-4 max-w-2xl leading-relaxed">
            Sends every subscribed address to the campaign tool with the date
            they consented and the form they used. Safe to run more than once —
            existing contacts are updated, not duplicated. Use it for the first
            load, or after an outage.
          </p>
          <SyncAllButton count={active} />
        </section>
      ) : null}
    </>
  );
}
