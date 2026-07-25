import "server-only";
import { Resend } from "resend";

/* Resend transport (§4). One place that reads the key and the From identity, so
 * every email in the app goes out the same door with the same sender.
 *
 * The key may be absent in some environments (e.g. a preview without secrets);
 * rather than crash a server action, `sendEmail` degrades to a logged no-op and
 * reports failure to the caller, which decides whether that is fatal. For a
 * confirmation email it is NOT fatal — the registration/application still
 * succeeds; the user simply doesn't get the receipt, and we log it. */

const apiKey = process.env.RESEND_API_KEY;

/* Verified sender. Until the domain is verified in Sprint 6.3, override with
 * RESEND_FROM (e.g. Resend's onboarding@resend.dev sandbox) so test sends work.
 * The display name stays constant. */
export const FROM =
  process.env.RESEND_FROM ??
  "Systematic Reviews Network <no-reply@systematicreviewsnetwork.org>";

export const SRN_INBOX =
  process.env.SRN_INBOX ?? "info@systematicreviewsnetwork.org";

const resend = apiKey ? new Resend(apiKey) : null;

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}): Promise<SendResult> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping send: "${opts.subject}"`,
    );
    return { ok: false, error: "email-not-configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
    });
    if (error) {
      console.error("[email] send failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown send error";
    console.error("[email] send threw:", msg);
    return { ok: false, error: msg };
  }
}
