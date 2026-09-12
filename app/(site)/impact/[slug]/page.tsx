import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getImpactStories, getPageBySlug } from "@/lib/queries";

/* Sprint 2.5 — impact story detail. The story bodies live in `pages` under the
   `impact-story-*` slug convention (§5); this route renders one through
   <RichText>. Only slugs that both match the convention and have a non-empty
   body resolve — anything else 404s, so a half-written draft never leaks. */

export const revalidate = 3600;

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

  /* The current recovered stories are intentionally held for evidence and
     editorial approval. Their titles remain visible on /impact as Coming soon,
     but no unpublished detail page should be reachable by guessing its slug. */
  notFound();
}
