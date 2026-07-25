import type { Metadata } from "next";
import { Mail, MessageSquare, Clock } from "lucide-react";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/site/ContactForm";

/* Sprint 4.3 — Contact. A real form (stored + forwarded to SRN with reply-to
 * set to the sender), the direct email, and the social links. The last of the
 * public routes; no longer stubbed in the nav. */

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

                <div>
                  <dt className="flex items-center gap-2">
                    <span className="bg-evidence-tint flex h-9 w-9 items-center justify-center">
                      <Icon icon={MessageSquare} size="sm" color="evidence" />
                    </span>
                    <span className="text-ink font-semibold">Follow SRN</span>
                  </dt>
                  <dd className="mt-3 flex gap-3">
                    <a
                      href="#"
                      aria-label="SRN on LinkedIn"
                      className="border-hairline text-slate hover:border-evidence hover:text-evidence inline-flex h-10 w-10 items-center justify-center border transition-colors"
                    >
                      <LinkedInMark />
                    </a>
                    <a
                      href="#"
                      aria-label="SRN on X"
                      className="border-hairline text-slate hover:border-evidence hover:text-evidence inline-flex h-10 w-10 items-center justify-center border transition-colors"
                    >
                      <XMark />
                    </a>
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

/* Same inline brand marks as the footer — Lucide v1 dropped brand glyphs. */
function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden>
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.24 2.25h6.83l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.08 4.13H5.11l11.97 15.64z" />
    </svg>
  );
}
