import "server-only";

/* Sprint 7.5 — campaign tool integration.
 *
 * §7.5 asks for `newsletter_signups` synced to a real campaign tool for
 * designed sends, segmentation and analytics — and is explicit that the
 * transactional Resend path from Phase 4 "is deliberately NOT a campaign tool
 * and should not be stretched into one".
 *
 * Written to Brevo's REST contract. Brevo rather than Mailchimp for two
 * reasons that matter here: a free tier that does not expire, and no
 * per-contact charge, which suits a list that grows slowly and sends rarely.
 * The interface below is small enough that swapping providers is one file.
 *
 * NO ACCOUNT EXISTS TODAY, so `isConfigured()` is false and every function
 * degrades to a logged no-op — exactly the posture lib/paystack.ts takes. The
 * moment BREVO_API_KEY and BREVO_LIST_ID are set, sync works with no code
 * change. Nothing here is verified against a live account, and that must be
 * reported rather than assumed.
 *
 * THE TWO-WAY UNSUBSCRIBE IS THE POINT. §7.5: "an unsubscribe in the campaign
 * tool must propagate back, or SRN mails people who opted out." That is a
 * compliance failure, not a missing feature, so it is built here rather than
 * left for later — see the webhook route.
 */

const BASE = "https://api.brevo.com/v3";

const apiKey = process.env.BREVO_API_KEY;
const listId = process.env.BREVO_LIST_ID;

/** True once the key and list are present. Gate every caller on this. */
export function isConfigured(): boolean {
  return Boolean(apiKey && listId);
}

type Result = { ok: true } | { ok: false; error: string };

async function call(
  path: string,
  init: RequestInit & { method: string },
): Promise<Result> {
  if (!apiKey) return { ok: false, error: "campaign-tool-not-configured" };

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    /* 204 for a successful delete, 201 for a create, 400 with a
       "duplicate_parameter" code when the contact already exists — which is a
       success for our purposes, not an error. */
    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => ({}))) as { code?: string };
    if (body.code === "duplicate_parameter") return { ok: true };

    return { ok: false, error: body.code ?? `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "request failed",
    };
  }
}

/**
 * Add or update a subscriber.
 *
 * Consent provenance travels with the contact (§7.5: "Consent and provenance
 * fields (when, from which form) for GDPR/NDPR defence"). Storing it only in
 * our own database would leave the campaign tool unable to answer "why is this
 * person on the list", which is the question that actually gets asked.
 */
export async function syncSubscriber(subscriber: {
  email: string;
  consentedAt: string;
  source: string;
}): Promise<Result> {
  if (!isConfigured()) {
    console.info("[campaign] not configured; skipping sync");
    return { ok: false, error: "campaign-tool-not-configured" };
  }

  return call("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: subscriber.email,
      listIds: [Number(listId)],
      updateEnabled: true,
      attributes: {
        CONSENTED_AT: subscriber.consentedAt,
        CONSENT_SOURCE: subscriber.source,
      },
    }),
  });
}

/**
 * Remove a subscriber from the list.
 *
 * Called when someone unsubscribes on OUR site, so the campaign tool stops
 * mailing them. The reverse direction — an unsubscribe in Brevo reaching us —
 * is the webhook.
 */
export async function removeSubscriber(email: string): Promise<Result> {
  if (!isConfigured()) {
    console.info("[campaign] not configured; skipping removal");
    return { ok: false, error: "campaign-tool-not-configured" };
  }

  return call(`/contacts/lists/${listId}/contacts/remove`, {
    method: "POST",
    body: JSON.stringify({ emails: [email] }),
  });
}

/**
 * Push everyone who has not unsubscribed.
 *
 * For the initial load, and for repairing drift after an outage. Sequential
 * rather than parallel: the list is small, the endpoint is rate-limited, and a
 * burst of parallel writes is how an integration gets throttled on its first
 * real run.
 */
export async function syncAll(
  subscribers: ReadonlyArray<{
    email: string;
    consentedAt: string;
    source: string;
  }>,
): Promise<{ synced: number; failed: number; errors: string[] }> {
  if (!isConfigured()) {
    return {
      synced: 0,
      failed: 0,
      errors: ["No campaign tool is connected."],
    };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const subscriber of subscribers) {
    const result = await syncSubscriber(subscriber);
    if (result.ok) synced += 1;
    else {
      failed += 1;
      if (errors.length < 5) errors.push(`${subscriber.email}: ${result.error}`);
    }
  }

  return { synced, failed, errors };
}
