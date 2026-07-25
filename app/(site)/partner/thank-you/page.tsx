import Link from "next/link";
import { Heart, Clock } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { verifyTransaction } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase/server";

/* §13.5 donation callback. Like the registration callback (§13.3): verify
 * server-side, never fulfil on the redirect alone. The webhook remains the
 * source of truth for the receipt. */

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function DonationThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  let confirmed = false;
  if (ref) {
    const result = await verifyTransaction(ref);
    if (result.ok && result.status === "success") {
      confirmed = true;
      await supabaseAdmin
        .from("donations")
        .update({
          payment_status: "paid",
          paid_at: result.paidAt ?? new Date().toISOString(),
        })
        .eq("paystack_reference", ref)
        .eq("payment_status", "pending");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Donate"
        title={confirmed ? "Thank you." : "Confirming your gift…"}
      />
      <Section surface="paper">
        <Container>
          <div className="mx-auto flex max-w-[var(--container-prose)] flex-col items-start gap-4">
            <span
              className={`flex h-12 w-12 items-center justify-center ${
                confirmed ? "bg-evidence-tint" : "bg-mist"
              }`}
            >
              <Icon
                icon={confirmed ? Heart : Clock}
                size="lg"
                color={confirmed ? "evidence" : undefined}
                className={confirmed ? "" : "text-slate"}
              />
            </span>
            {confirmed ? (
              <p className="text-ink text-[1.15rem] leading-relaxed">
                Your donation is confirmed — thank you for helping evidence
                skills take root where they&apos;re needed most. A receipt is on
                its way to your email.
              </p>
            ) : (
              <p className="text-ink text-[1.15rem] leading-relaxed">
                We&apos;re confirming your payment. If it went through,
                you&apos;ll receive a receipt by email shortly — there&apos;s
                nothing more you need to do.
              </p>
            )}
            <Link
              href="/partner"
              className="text-ink hover:text-evidence mt-2 font-semibold underline"
            >
              Back to Partner with SRN
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
