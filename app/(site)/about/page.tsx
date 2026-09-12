import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText } from "@/components/ui/RichText";
import { Thread } from "@/components/ui/Thread";
import { CTABand } from "@/components/ui/Cards";
import { getPageBySlug, getMedia } from "@/lib/queries";

/* Sprint 2.2 — About. Story/mission/values from the editable `pages.about`
   row (rendered through <RichText>), and a partner CTA. ISR 3600s.
   The leadership preview that used to sit here is hidden — see the comment
   further down — so this no longer needs team_members at all. */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "From ACSRM to the Systematic Reviews Network. Building capacity for systematic reviews and meta-analyses across low- and middle-income countries.",
};

export default async function AboutPage() {
  const [page, headerPhoto] = await Promise.all([
    getPageBySlug("about"),
    getMedia("drive-selected/2026-09/ghana1.jpg"),
  ]);

  if (!page) notFound();

  return (
    <>
      <PageHeader
        eyebrow="About SRN"
        title="Better evidence, built where it's needed most."
        lede="Formerly ACSRM, SRN launched in 2022 as a network strengthening the capacity of researchers and policymakers across Africa and beyond to produce, interpret, and apply systematic reviews and meta-analyses that stand up to scrutiny and inform real-world decisions."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      {/* Story / mission / values, from the editable page body. */}
      <Section surface="paper">
        <Prose>
          <RichText body={page.body_rich} />
        </Prose>
      </Section>

      <Container>
        <Thread />
      </Container>

      {/* Leadership preview → full team is hidden while Team is unlinked
          from nav (bios are still placeholders and the roster structure is
          unresolved with Fortune). Restore alongside re-adding /team to nav —
          both were done in the same change and should come back together. */}

      {/* Partner CTA. */}
      <Section surface="paper">
        <Container>
          <CTABand
            heading="Bring evidence synthesis training to your institution."
            body="Host a workshop, sponsor researchers, or co-create evidence with SRN. We work with institutions and funders across low- and middle-income countries."
            buttonLabel="Partner with SRN"
            buttonHref="/partner"
          />
        </Container>
      </Section>
    </>
  );
}
