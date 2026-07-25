import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { getPageBySlug } from "@/lib/queries";

/* Sprint 2.7 — Privacy policy, rendered from the editable `pages` row so staff
   can revise it without a deploy. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How the Systematic Reviews Network collects and uses personal information, and the choices you have.",
};

export default async function PrivacyPage() {
  const page = await getPageBySlug("privacy");
  if (!page || richTextIsEmpty(page.body_rich)) notFound();

  return (
    <>
      <PageHeader eyebrow="Legal" title={page.title} />
      <Section surface="paper">
        <Prose>
          <RichText body={page.body_rich} />
        </Prose>
      </Section>
    </>
  );
}
