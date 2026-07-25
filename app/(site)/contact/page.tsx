import type { Metadata } from "next";
import { Mail, Clock } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/site/ContactForm";

/* Sprint 4.3 — Contact. A real form (stored + forwarded to SRN with reply-to
 * set to the sender) and the direct email. The last of the public routes; no
 * longer stubbed in the nav. Social links removed in Sprint 5.5 — no verified
 * SRN LinkedIn/X URL exists yet. */

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Systematic Reviews Network — about training, partnerships, or anything else. We read every message.",
};

const EMAIL = "info@systematicreviewsnetwork.org";

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch."
        lede="A question about a course, a partnership idea, or something else entirely — send it over and the right person will reply. We read every message."
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
            {/* Form */}
            <div>
              <Eyebrow>Send a message</Eyebrow>
              <h2 className="text-display text-ink mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1]">
                Tell us how we can help
              </h2>
              <p className="text-slate mt-4 leading-relaxed">
                Fill in a few details below. If your enquiry is about working
                with us on training or funding, the{" "}
                <a
                  href="/partner"
                  className="text-ink hover:text-evidence font-semibold underline"
                >
                  Partner with SRN
                </a>{" "}
                page has a form tailored to that.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>

            {/* Direct details */}
            <aside className="lg:pt-2">
              <dl className="space-y-8">
                <div>
                  <dt className="flex items-center gap-2">
                    <span className="bg-evidence-tint flex h-9 w-9 items-center justify-center">
                      <Icon icon={Mail} size="sm" color="evidence" />
                    </span>
                    <span className="text-ink font-semibold">Email us</span>
                  </dt>
                  <dd className="mt-3">
                    <a
                      href={`mailto:${EMAIL}`}
                      className="text-slate hover:text-evidence text-small break-words underline"
                    >
                      {EMAIL}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-2">
                    <span className="bg-evidence-tint flex h-9 w-9 items-center justify-center">
                      <Icon icon={Clock} size="sm" color="evidence" />
                    </span>
                    <span className="text-ink font-semibold">
                      When you&apos;ll hear back
                    </span>
                  </dt>
                  <dd className="text-slate text-small mt-3 leading-relaxed">
                    We aim to reply within two working days. Course and
                    application questions may take a little longer during an
                    intake.
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
