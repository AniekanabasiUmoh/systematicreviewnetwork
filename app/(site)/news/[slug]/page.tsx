import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import { getAllNews, getNewsBySlug } from "@/lib/queries";

/* Sprint 2.6 — news article. Body is TipTap JSON rendered through <RichText>.
   An article whose body hasn't been written yet 404s rather than showing an
   empty page — the excerpt lives on the hub, but a bodyless article is not a
   destination. This shares the `news/[slug]` namespace with `news/events/...`;
   Next resolves the more specific `events` segment first, so an event slug
   never falls through to here. */

export const revalidate = 60;

export async function generateStaticParams() {
  const news = await getAllNews();
  return news
    .filter((n) => !richTextIsEmpty(n.body_rich))
    .map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) return { title: "News" };
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article || richTextIsEmpty(article.body_rich)) notFound();

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow={[article.author, date].filter(Boolean).join(" · ") || "News"}
        title={article.title}
        imageUrl={article.featured_image_url}
        imageAlt={article.featured_image_url ? article.title : ""}
      />

      <Section surface="paper">
        <Prose>
          <RichText body={article.body_rich} />
        </Prose>
      </Section>

      <Section surface="mist">
        <Container>
          <p className="mb-10">
            <Link
              href="/news"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon icon={ArrowRight} size="sm" className="rotate-180" />
              All news &amp; events
            </Link>
          </p>
          <CTABand
            heading="Be part of the next story."
            body="Join a course or apply for mentorship and start building evidence skills that stay with you."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}
