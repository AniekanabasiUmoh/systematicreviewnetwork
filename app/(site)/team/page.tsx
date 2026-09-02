import type { Metadata } from "next";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonCard, CTABand } from "@/components/ui/Cards";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { getTeamMembers } from "@/lib/queries";
import type { Database } from "@/lib/database.types";

/* Sprint 2.2 — Team. Grouped by the four §6 groups in a fixed order; within a
   group, order comes from sort_order alone (staff-controllable). Headshots are
   greyscale, returning to colour on hover (PersonCard); where a photo is not
   yet uploaded, a labelled placeholder shows rather than a stock face. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Team",
  description:
    "The people behind the Systematic Reviews Network: executive, scientific committee, country leads, and mentors.",
};

type Group = Database["public"]["Enums"]["team_group"];

/* Group display order + headings. The map fixes the on-page order; the DB only
   controls order within each group. */
/* The six organisation groups are intentionally ordered here so the public
   page remains stable while admins control order within each group. */
const GROUPS: { key: Group; label: string; blurb: string }[] = [
  {
    key: "executive",
    label: "Executive",
    blurb: "Leading the network's direction and day-to-day work.",
  },
  {
    key: "scientific",
    label: "Scientific & advisory committee",
    blurb: "Guiding method, quality, and the standards behind the training.",
  },
  {
    key: "country_lead",
    label: "Country leads",
    blurb: "Anchoring SRN's work in the countries where it happens.",
  },
  {
    key: "mentor",
    label: "Mentors & facilitators",
    blurb: "The reviewers who teach the courses and guide live reviews.",
  },
  {
    key: "programmes",
    label: "Programmes committee",
    blurb: "Designing the learning pathways, cohorts, and support that make SRN's programmes useful.",
  },
  {
    key: "communications",
    label: "Communications team",
    blurb: "Sharing SRN's work, opportunities, and evidence with the wider community.",
  },
];

/* Every team member currently carries a generated placeholder bio of the form
   "<Name> is part of the Systematic Reviews Network team, contributing to
   SRN's training, mentorship, and research programmes." It is filler, and
   showing it behind a "Read more" would promise a biography and deliver
   nothing. Real bios have been requested from the team.

   So: recognise the template and treat it as absent. Cards fall back to name,
   role and affiliation, exactly as before. As each real bio is written through
   the admin, that person's disclosure appears on its own — no code change and
   no all-or-nothing switch. Delete this once every bio is real. */
const PLACEHOLDER_BIO =
  /is part of the Systematic Reviews Network team, contributing to SRN's training, mentorship, and research programmes\.?$/;

function realBio(bio: string | null): string | null {
  if (!bio) return null;
  return PLACEHOLDER_BIO.test(bio.trim()) ? null : bio;
}

export default async function TeamPage() {
  const team = await getTeamMembers();

  const byGroup = (g: Group) => team.filter((m) => m.group === g);

  return (
    <>
      <PageHeader
        eyebrow="Our team"
        title="A network of reviewers, across many countries."
        lede="SRN is run by researchers who do this work themselves. The people who teach the courses, guide the reviews, and hold the standards."
      />

      {GROUPS.map(({ key, label, blurb }, i) => {
        const members = byGroup(key);
        if (members.length === 0) return null;
        return (
          <Section key={key} surface={i % 2 === 0 ? "paper" : "mist"}>
            <Container>
              <Eyebrow>{label}</Eyebrow>
              <p className="text-slate mt-3 max-w-[52ch]">{blurb}</p>
              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {members.map((m) => (
                  <PersonCard
                    key={m.id}
                    name={m.name}
                    role={m.role}
                    affiliation={m.affiliation}
                    photoUrl={m.photo_url}
                    linkedinUrl={m.linkedin_url}
                    orcidUrl={m.orcid_url}
                    bio={realBio(m.bio)}
                  />
                ))}
              </div>
            </Container>
          </Section>
        );
      })}

      <Section surface="paper">
        <Container>
          <CTABand
            heading="Want to teach, mentor, or join a cohort?"
            body="SRN grows through its people. If you'd like to contribute as a mentor or facilitator, or train with us, we'd like to hear from you."
            buttonLabel="Get in touch"
            buttonHref="/contact"
          />
        </Container>
      </Section>
    </>
  );
}
