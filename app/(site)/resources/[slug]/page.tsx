import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download, ExternalLink } from "lucide-react";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText } from "@/components/ui/RichText";
import { CTABand } from "@/components/ui/Cards";
import { Tag } from "@/components/ui/Tag";
import { Icon } from "@/components/ui/Icon";
import { getResourceBySlug } from "@/lib/queries";
import { categoryLabel, resourceKind } from "@/lib/resources";

/* Sprint 2.4 — resource detail. Three shapes:
   - article  → the guide body, rendered in Prose;
   - download/external → a clear link out (with the file/URL);
   - pending  → an honest "coming soon" state (never a dead link),
                because several seeded resources don't have a file yet. */

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getResourceBySlug(slug);
  if (!r) return { title: "Resource" };
  return { title: r.title, description: r.description ?? undefined };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getResourceBySlug(slug);
  if (!r) notFound();

  const kind = resourceKind(r);

  return (
    <>
      <PageHeader eyebrow={categoryLabel(r.category)} title={r.title} lede={r.description ?? undefined} />

      {kind === "article" ? (
        <Section surface="paper">
          <Prose>
            <Tag hue="neutral">{categoryLabel(r.category)}</Tag>
            <div className="mt-6">
              <RichText body={r.body_rich} />
            </div>
          </Prose>
        </Section>
      ) : (
        <Section surface="paper">
          <Container>
            <div className="border-hairline bg-mist max-w-[var(--container-prose)] border p-8 md:p-10">
              {kind === "download" && r.file_url ? (
                <>
                  <p className="text-eyebrow-style text-slate">Download</p>
                  <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-tight">
                    {r.title} is ready to download.
                  </h2>
                  <a
                    href={r.file_url}
                    className="bg-evidence text-paper hover:bg-evidence-ink mt-6 inline-flex items-center gap-2 px-6 py-3 font-semibold transition-colors"
                  >
                    <Icon icon={Download} size="sm" />
                    Download the file
                  </a>
                </>
              ) : kind === "external" && r.external_url ? (
                <>
                  <p className="text-eyebrow-style text-slate">
                    {categoryLabel(r.category)}
                  </p>
                  <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-tight">
                    This resource is hosted elsewhere.
                  </h2>
                  <a
                    href={r.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-evidence text-paper hover:bg-evidence-ink mt-6 inline-flex items-center gap-2 px-6 py-3 font-semibold transition-colors"
                  >
                    <Icon icon={ExternalLink} size="sm" />
                    Open the resource
                  </a>
                </>
              ) : (
                <>
                  <p className="text-eyebrow-style text-slate">Coming soon</p>
                  <h2 className="text-display text-ink mt-3 text-[1.5rem] leading-tight">
                    This one isn&apos;t available to download just yet.
                  </h2>
                  <p className="text-slate mt-4 leading-relaxed">
                    We&apos;re preparing {r.title.toLowerCase()} for the library.
                    Join the newsletter and we&apos;ll let you know the moment
                    it&apos;s ready — or browse what&apos;s already here.
                  </p>
                  <Link
                    href="/resources"
                    className="text-ink hover:text-evidence mt-6 inline-flex items-center gap-1.5 font-semibold"
                  >
                    Browse the library
                    <Icon icon={ArrowRight} size="sm" />
                  </Link>
                </>
              )}
            </div>
          </Container>
        </Section>
      )}

      <Section surface="mist">
        <Container>
          <p className="mb-10">
            <Link
              href="/resources"
              className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
            >
              <Icon icon={ArrowRight} size="sm" className="rotate-180" />
              All resources
            </Link>
          </p>
          <CTABand
            heading="Put it into practice."
            body="Our courses and mentorship turn method you've read about into a review you've finished."
            buttonLabel="Explore programmes"
            buttonHref="/programmes"
          />
        </Container>
      </Section>
    </>
  );
}
