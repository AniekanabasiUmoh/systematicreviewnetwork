import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import { getPageBySlug, getImpactStories } from "@/lib/queries";

/* Sprint 2.5 — impact story detail. The story bodies live in `pages` under the
   `impact-story-*` slug convention (§5); this route renders one through
   <RichText>. Only slugs that both match the convention and have a non-empty
   body resolve — anything else 404s, so a half-written draft never leaks. */

export const revalidate = 60;

export async function generateStaticParams() {
  const stories = await getImpactStories();
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug.startsWith("impact-story-")) return { title: "Impact story" };
  const page = await getPageBySlug(slug);
  if (!page) return { title: "Impact story" };
  return { title: page.title };
}

export default async function ImpactStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Guard the route to the slug convention so /impact/about (a real page)
     cannot be rendered here as though it were an impact story. */
  if (!slug.startsWith("impact-story-")) notFound();

  const page = await getPageBySlug(slug);
  if (!page || richTextIsEmpty(page.body_rich)) notFound();

  return (
    <>
      <PageHeader eyebrow="Story of change" title={page.title} />

      <Section surface="paper">
        <Prose>
          <RichText body={page.body_rich} />
        </Prose>
      </Section>

      <Section surface="mist">
        <Container>
          <p className="mb-10">
            <Link
              href="/impact"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon icon={ArrowRight} size="sm" className="rotate-180" />
              All of our impact
            </Link>
          </p>
          <CTABand
            heading="This is what the training makes possible."
            body="Join a course or apply for mentorship and start your own review with guidance from people who've done it."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}
