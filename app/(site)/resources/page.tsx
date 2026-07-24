import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceCard, CTABand } from "@/components/ui/Cards";
import { getResources, getMedia } from "@/lib/queries";
import {
  RESOURCE_CATEGORIES,
  categoryLabel,
  isResourceCategory,
  resourceHref,
  resourceKind,
} from "@/lib/resources";

/* Sprint 2.4 — Resources library. Category filter lives in the URL query, so
   filtered views are shareable and the back button works. Server-rendered:
   the whole page reads correctly with zero JS. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free guides, templates, recorded webinars, and tool walkthroughs for systematic reviews — open to anyone.",
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active =
    category && isResourceCategory(category) ? category : undefined;

  const [resources, headerPhoto] = await Promise.all([
    getResources(active),
    getMedia("workshop-participants.jpg"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Open method, freely shared."
        lede="Guides, templates, recorded sessions, and tool walkthroughs — everything here is free to use. Good method shouldn't sit behind a paywall."
        imageUrl={headerPhoto?.url}
        imageAlt={headerPhoto?.alt ?? ""}
      />

      <Section surface="paper">
        <Container>
          {/* Filter chips — plain links, so they're shareable and no-JS safe. */}
          <nav aria-label="Filter resources by category">
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterChip href="/resources" active={!active}>
                  All
                </FilterChip>
              </li>
              {RESOURCE_CATEGORIES.map((c) => (
                <li key={c.value}>
                  <FilterChip
                    href={`/resources?category=${c.value}`}
                    active={active === c.value}
                  >
                    {c.label}
                  </FilterChip>
                </li>
              ))}
            </ul>
          </nav>

          {resources.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <ResourceCard
                  key={r.id}
                  title={r.title}
                  description={r.description}
                  category={r.category}
                  categoryLabel={categoryLabel(r.category)}
                  href={resourceHref(r)}
                  kind={resourceKind(r)}
                />
              ))}
            </div>
          ) : (
            <div className="border-hairline mt-10 border border-dashed p-10 text-center">
              <p className="text-ink font-semibold">Nothing here yet</p>
              <p className="text-slate text-small mt-1">
                There are no resources in this category right now.{" "}
                <Link href="/resources" className="text-ink underline">
                  See all resources
                </Link>
                .
              </p>
            </div>
          )}
        </Container>
      </Section>

      <Section surface="mist">
        <Container>
          <CTABand
            heading="New to systematic reviews?"
            body="Start with the beginner guide, then join a course when you're ready to put it into practice."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center px-4 py-2 text-small font-semibold transition-colors ${
        active
          ? "bg-ink text-paper"
          : "border-hairline text-slate hover:border-ink hover:text-ink border"
      }`}
    >
      {children}
    </Link>
  );
}
