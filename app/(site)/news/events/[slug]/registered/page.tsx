import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { getEventBySlug } from "@/lib/queries";
import { verifyTransaction } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase/server";

/* §13.3 — the checkout callback. The browser landing here is a UX signal, NOT
 * proof of payment: we call /transaction/verify server-side and show status
 * from that. The webhook remains the source of truth that holds the seat and
 * sends the receipt; this page only reflects reality, it never fulfils. Always
 * dynamic — it reads a live payment status. */

export const dynamic = "force-dynamic";

export default async function RegisteredPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  // Verify server-side. Also reconcile our row if the webhook hasn't landed yet
  // — but only ever from a *verified* success, never from the redirect alone.
  let confirmed = false;
  if (ref) {
    const result = await verifyTransaction(ref);
    if (result.ok && result.status === "success") {
      confirmed = true;
      await supabaseAdmin
        .from("registrations")
        .update({ payment_status: "paid", paid_at: result.paidAt ?? new Date().toISOString() })
        .eq("paystack_reference", ref)
        .eq("payment_status", "pending");
    }
  }

  const eventHref = `/news/events/${event.slug}`;

  return (
    <>
      <PageHeader
        eyebrow="Registration"
        title={confirmed ? "You're registered." : "Almost there."}
      />
      <Section surface="paper">
        <Container>
          <div className="mx-auto max-w-[var(--container-prose)]">
            {confirmed ? (
              <div className="flex flex-col items-start gap-4">
                <span className="bg-evidence-tint flex h-12 w-12 items-center justify-center">
                  <Icon icon={CheckCircle2} size="lg" color="evidence" />
                </span>
                <p className="text-ink text-[1.15rem] leading-relaxed">
                  Your payment is confirmed and your place at{" "}
                  <strong>{event.title}</strong> is held. A confirmation email
                  with a calendar invite is on its way.
                </p>
                <Link
                  href={eventHref}
                  className="bg-evidence text-paper hover:bg-evidence-ink mt-2 inline-flex items-center gap-2 px-5 py-3 font-semibold transition-colors"
                >
                  Back to the event
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <span className="bg-mist flex h-12 w-12 items-center justify-center">
                  <Icon icon={Clock} size="lg" className="text-slate" />
                </span>
                <p className="text-ink text-[1.15rem] leading-relaxed">
                  We&apos;re confirming your payment. This can take a moment — if
                  it went through, you&apos;ll get a confirmation email shortly
                  and your place will be held automatically. There&apos;s nothing
                  more you need to do.
                </p>
                <p className="text-slate text-small leading-relaxed">
                  If you closed the payment window without paying, your details
                  are safe but no place is held yet. You can{" "}
                  <Link href={eventHref} className="text-ink underline">
                    start the registration again
                  </Link>{" "}
                  any time, or email us and we&apos;ll help.
                </p>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
