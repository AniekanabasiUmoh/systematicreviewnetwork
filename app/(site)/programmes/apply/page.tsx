import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { getProgramme } from "@/lib/programmes";

/* Application intake stub. The real form (validation, rate-limiting,
   server-action write to `applications`) lands in Phase 4.2. Until then this is
   an honest placeholder page — it never pretends to accept a submission — so
   the programme CTAs route somewhere real rather than 404. */

export const metadata: Metadata = {
  title: "Apply",
  robots: { index: false, follow: false },
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const programme = p ? getProgramme(p) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title={
          programme ? `Apply — ${programme.title}` : "Apply to a programme"
        }
        lede="Applications open shortly. In the meantime, get in touch and we'll make sure you hear the moment they do."
      />

      <Section surface="paper">
        <Container>
          <div className="border-hairline bg-mist max-w-[var(--container-prose)] border p-8 md:p-10">
            <p className="text-eyebrow-style text-slate">Coming soon</p>
            <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-tight">
              The online application form is on its way.
            </h2>
            <p className="text-slate mt-4 leading-relaxed">
              We&apos;re building a proper application process — one that lets you
              tell us about your review and matches you to the right programme or
              mentor. Until it&apos;s ready, the fastest way to start is to send us
              a message. Mention
              {programme ? ` the ${programme.title}` : " the programme"} you&apos;re
              interested in and we&apos;ll take it from there.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="bg-evidence text-paper hover:bg-evidence-ink inline-flex items-center gap-2 px-6 py-3 font-semibold transition-colors"
              >
                Get in touch
                <Icon icon={ArrowRight} size="sm" />
              </Link>
              <Link
                href="/programmes"
                className="text-ink hover:text-evidence inline-flex items-center gap-1.5 px-2 py-3 font-semibold"
              >
                Back to programmes
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
