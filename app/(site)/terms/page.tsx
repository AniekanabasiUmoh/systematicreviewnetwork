import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { getPageBySlug } from "@/lib/queries";

/* Sprint 2.7 — Terms of use, rendered from the editable `pages` row. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms that cover your use of the Systematic Reviews Network website and services.",
};

export default async function TermsPage() {
  const page = await getPageBySlug("terms");
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
