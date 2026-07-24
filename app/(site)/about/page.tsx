import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Section, Container, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText } from "@/components/ui/RichText";
import { Thread } from "@/components/ui/Thread";
import { PersonCard, CTABand } from "@/components/ui/Cards";
import { Icon } from "@/components/ui/Icon";
import { Eyebrow } from "@/components/ui/SectionHeader";
import {
  getPageBySlug,
  getTeamMembers,
  getMedia,
} from "@/lib/queries";

/* Sprint 2.2 — About. Story/mission/values from the editable `pages.about`
   row (rendered through <RichText>), a short leadership preview drawn from
   team_members, and a partner CTA. ISR 60s. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About",
  description:
    "From ACSRM to the Systematic Reviews Network — building capacity for systematic reviews and meta-analyses across low- and middle-income countries.",
};

export default async function AboutPage() {
  const [page, team, headerPhoto] = await Promise.all([
    getPageBySlug("about"),
    getTeamMembers(),
    getMedia("team-at-workshop-banner.jpg"),
  ]);

  if (!page) notFound();

  /* Leadership preview: the executive group, in sort order. */
  const leaders = team.filter((m) => m.group === "executive").slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="About SRN"
        title="Better evidence, built where it's needed most."
        lede="Formerly ACSRM. Launched in 2022. A network training researchers to produce systematic reviews that stand up to scrutiny — across Africa and beyond."
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

      {/* Leadership preview → full team. */}
      {leaders.length > 0 ? (
        <Section surface="mist">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>Leadership</Eyebrow>
                <h2 className="text-display text-ink mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
                  The people behind the network
                </h2>
              </div>
              <Link
                href="/team"
                className="text-ink hover:text-evidence inline-flex items-center gap-1.5 font-semibold"
              >
                Meet the full team
                <Icon icon={ArrowRight} size="sm" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {leaders.map((m) => (
                <PersonCard
                  key={m.id}
                  name={m.name}
                  role={m.role}
                  affiliation={m.affiliation}
                  photoUrl={m.photo_url}
                  linkedinUrl={m.linkedin_url}
                  orcidUrl={m.orcid_url}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

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
