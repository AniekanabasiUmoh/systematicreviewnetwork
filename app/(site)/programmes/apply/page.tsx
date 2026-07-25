import type { Metadata } from "next";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApplicationForm } from "@/components/site/ApplicationForm";
import { getProgrammes } from "@/lib/queries";

/* Sprint 4.2 — programme application. A real form: validated, rate-limited,
 * written to `applications` with status 'received', confirmed by email. Arriving
 * from a programme page prefills that programme via ?p=<slug>.
 * Sprint 5.7 — the selectable programmes come from the database. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply to a programme",
  description:
    "Apply to an SRN programme — tell us about your background and the review you have in mind, and we'll match you to the right course or mentor.",
  robots: { index: false, follow: false },
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const programmes = await getProgrammes();
  const titles = programmes.map((row) => row.title);
  const programme = p ? programmes.find((row) => row.slug === p) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title={programme ? `Apply — ${programme.title}` : "Apply to a programme"}
        lede="Tell us a little about yourself and the review you'd like to work on. We read every application and reply once the intake review is complete."
      />

      <Section surface="paper">
        <Container>
          <div className="mx-auto max-w-[var(--container-prose)]">
            <ApplicationForm
              programmes={titles}
              defaultProgramme={programme?.title}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
