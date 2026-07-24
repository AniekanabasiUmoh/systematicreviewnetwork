import type { Metadata } from "next";
import {
  BookOpen,
  GraduationCap,
  Users,
  Handshake,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeader, Eyebrow } from "@/components/ui/SectionHeader";
import { StatCounter } from "@/components/ui/StatCounter";
import { ReachMap } from "@/components/ui/ReachMap";
import { PartnerLogoBar } from "@/components/ui/PartnerLogoBar";
import { PlaceholderBlock, OverlayImage } from "@/components/ui/Media";
import { Tag, StatusBadge } from "@/components/ui/Tag";
import {
  EventCard,
  ProgrammeCard,
  PersonCard,
  ResourceCard,
  TestimonialBlock,
  CTABand,
} from "@/components/ui/Cards";
import {
  TextField,
  SelectField,
  TextareaField,
  FormMessage,
  Honeypot,
} from "@/components/ui/FormField";
import { registrationLabel, type RegistrationState } from "@/lib/events";

export const metadata: Metadata = {
  title: "Component kit",
  robots: { index: false, follow: false },
};

/* Sprint 1.1 "Done when": every §4 component in every state — default, hover,
   focus-visible, disabled, empty, error. Internal only, noindex. */

const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

function Row({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-hairline border-t py-12">
      <h2 className="text-eyebrow-style text-evidence">{title}</h2>
      {note ? (
        <p className="text-slate prose-measure text-small mt-2">{note}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const states: RegistrationState[] = [
  "open",
  "not_yet_open",
  "closed",
  "full",
  "past",
];

export default function ComponentKitPage() {
  return (
    <main className="mx-auto max-w-[var(--container-content)] px-6 py-16">
      <header className="mb-4">
        <Eyebrow tone="slate">Internal</Eyebrow>
        <h1 className="text-display-tight text-ink mt-2 text-[length:var(--text-hero-mobile)] leading-[1.1] md:text-[length:var(--text-hero)] md:leading-[1.05]">
          Component kit
        </h1>
        <p className="text-slate prose-measure mt-4">
          Every §4 component, in every state, built against the shape of real
          seed data. Tab through the page to check focus rings; toggle your OS
          reduced-motion setting to confirm animation stops.{" "}
          <a href="/styleguide" className="text-evidence font-medium underline">
            Palette and type live here →
          </a>
        </p>
      </header>

      <Row
        title="SectionHeader"
        note="Eyebrow + h2 + optional lede. Sentence case everywhere except the eyebrow."
      >
        <div className="space-y-10">
          <SectionHeader
            eyebrow="What we do"
            heading="Training that builds lasting capacity"
            lede="A lede sentence sits under the headline, capped at 68 characters per line so it stays readable at any width."
          />
          <SectionHeader
            eyebrow="Centred"
            heading="The same header, centred"
            lede="Used where a section has no accompanying media column."
            align="center"
          />
        </div>
      </Row>

      <Row
        title="StatCounter"
        note="Server-renders the real number; the count-up only enhances it. Disable JavaScript and the correct figures are still on the page — the ESI bug this exists to avoid."
      >
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <StatCounter value="200+" label="Researchers trained" />
          <StatCounter value="19,500" label="Webinar attendees" />
          <StatCounter value="24" label="Workshops delivered" />
          <StatCounter value="6" label="Countries reached" />
        </div>
      </Row>

      <Row
        title="EventCard — all five registration states"
        note="§2.6 state machine. Capacity counts confirmed payments only, so abandoned checkouts never hold a seat."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {states.map((s, i) => (
            <EventCard
              key={s}
              href="#"
              title={`[PLACEHOLDER] Event in the "${registrationLabel[s]}" state`}
              type={
                ["course", "webinar", "workshop", "mentorship", "workshop"][i]
              }
              starts_at={days(s === "past" ? -30 : 20 + i)}
              ends_at={days(s === "past" ? -28 : 22 + i)}
              locationType={i % 2 ? "in_person" : "online"}
              state={s}
              price_kobo={i % 2 ? 2500000 : null}
              capacity={s === "full" ? 20 : 40}
              seatsTaken={s === "full" ? 20 : 12}
            />
          ))}
        </div>
      </Row>

      <Row title="ProgrammeCard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProgrammeCard
            href="#"
            icon={GraduationCap}
            title="Beginner Academy"
            blurb="[PLACEHOLDER] A short description of the programme, two or three lines long, explaining what it covers."
            audience="For students new to reviews"
          />
          <ProgrammeCard
            href="#"
            icon={Users}
            title="Mentorship Programme"
            blurb="[PLACEHOLDER] A short description of the programme, two or three lines long, explaining what it covers."
            audience="For active review teams"
          />
          <ProgrammeCard
            href="#"
            icon={BookOpen}
            title="Resource Library"
            blurb="[PLACEHOLDER] A short description of the programme, two or three lines long, explaining what it covers."
            audience="For everyone"
          />
          <ProgrammeCard
            href="#"
            icon={Handshake}
            title="Institutional Training"
            blurb="[PLACEHOLDER] A short description of the programme, two or three lines long, explaining what it covers."
            audience="For institutions"
          />
        </div>
      </Row>

      <Row
        title="PersonCard"
        note="Greyscale, returning to colour on hover — headshots taken in wildly different conditions still read as one set. Photos are absent here, so the placeholder block shows."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          <PersonCard
            name="[PLACEHOLDER] Team Member"
            role="Executive Director"
            affiliation="[PLACEHOLDER] Institution"
            linkedinUrl="#"
            orcidUrl="#"
          />
          <PersonCard
            name="[PLACEHOLDER] Team Member"
            role="Scientific Committee"
            affiliation="[PLACEHOLDER] Institution"
            linkedinUrl="#"
          />
          <PersonCard
            name="[PLACEHOLDER] Team Member"
            role="Country Lead"
            affiliation="[PLACEHOLDER] Institution"
          />
          <PersonCard name="[PLACEHOLDER] Team Member" role="Mentor" />
        </div>
      </Row>

      <Row title="ResourceCard">
        <div className="grid gap-4 md:grid-cols-3">
          <ResourceCard
            title="[PLACEHOLDER] What is a systematic review?"
            description="[PLACEHOLDER] A one- or two-sentence description of the resource."
            category="guide"
            href="#"
            kind="article"
          />
          <ResourceCard
            title="[PLACEHOLDER] PRISMA flow diagram template"
            description="[PLACEHOLDER] A one- or two-sentence description of the resource."
            category="template"
            href="#"
            kind="download"
          />
          <ResourceCard
            title="[PLACEHOLDER] Recorded webinar"
            description="[PLACEHOLDER] A one- or two-sentence description of the resource."
            category="webinar"
            href="#"
            kind="external"
          />
        </div>
      </Row>

      <Row
        title="Tags and status badges"
        note="§3.1 — the one sanctioned echo of the logo's four mark colours."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Tag hue="blue">webinar</Tag>
            <Tag hue="green">course</Tag>
            <Tag hue="orange">workshop</Tag>
            <Tag hue="yellow">mentorship</Tag>
            <Tag hue="neutral">publication</Tag>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "received",
                "under_review",
                "accepted",
                "waitlisted",
                "rejected",
              ] as const
            ).map((s) => (
              <StatusBadge key={s} status={s} label={s.replace("_", " ")} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              ["paid", "pending", "failed", "expired", "refunded"] as const
            ).map((s) => (
              <StatusBadge key={s} status={s} label={s} />
            ))}
          </div>
        </div>
      </Row>

      <Row
        title="ReachMap"
        note="§3.4 — static inline SVG, no map library. Hover or Tab to a dot for the country name. A visually-hidden list carries the same information with zero JavaScript."
      >
        <div className="border-hairline rounded-[var(--radius-card)] border p-4">
          <ReachMap
            countries={[
              {
                country_code: "NG",
                country_name: "Nigeria",
                note: "[PLACEHOLDER] note",
              },
              { country_code: "GH", country_name: "Ghana" },
              { country_code: "RW", country_name: "Rwanda" },
              { country_code: "CM", country_name: "Cameroon" },
              { country_code: "KE", country_name: "Kenya" },
              { country_code: "UG", country_name: "Uganda" },
              { country_code: "PK", country_name: "Pakistan" },
              { country_code: "BD", country_name: "Bangladesh" },
              { country_code: "BR", country_name: "Brazil" },
            ]}
          />
        </div>
        <p className="text-slate text-small mt-4">
          The monochrome echo, as used behind the homepage impact strip:
        </p>
        <div className="bg-brand mt-3 overflow-hidden rounded-[var(--radius-card)]">
          <ReachMap
            variant="echo"
            countries={[
              { country_code: "NG", country_name: "Nigeria" },
              { country_code: "GH", country_name: "Ghana" },
              { country_code: "RW", country_name: "Rwanda" },
              { country_code: "PK", country_name: "Pakistan" },
              { country_code: "BR", country_name: "Brazil" },
            ]}
          />
        </div>
      </Row>

      <Row title="TestimonialBlock">
        <TestimonialBlock
          quote="[PLACEHOLDER] A quote of two or three sentences from someone who took part in SRN training, specific enough to be credible."
          name="[PLACEHOLDER] Participant"
          role="Research Fellow, Institution"
        />
      </Row>

      <Row
        title="PartnerLogoBar"
        note="Greyscale, colour on hover. Logos absent, so placeholders show."
      >
        <PartnerLogoBar
          partners={[
            { name: "[PLACEHOLDER] Partner One" },
            { name: "[PLACEHOLDER] Partner Two" },
            { name: "[PLACEHOLDER] Partner Three" },
            { name: "[PLACEHOLDER] Partner Four" },
          ]}
        />
      </Row>

      <Row
        title="CTABand"
        note="Ink background, one gold button — the single highlighted CTA per page."
      >
        <CTABand
          heading="Bring evidence synthesis training to your institution."
          body="[PLACEHOLDER] A supporting sentence explaining what partnering involves."
          buttonLabel="Partner with SRN"
          buttonHref="#"
        />
      </Row>

      <Row
        title="Hero overlay"
        note="§3.3 — navy multiply at 62%, so white text stays legible on real photos and mixed-quality sources unify. No photo yet, so the ink surface stands in."
      >
        <OverlayImage
          src={null}
          alt=""
          width={2400}
          height={900}
          className="rounded-[var(--radius-card)]"
        >
          <div className="px-8 py-20 md:px-14 md:py-28">
            <Eyebrow tone="paper">Systematic Reviews Network</Eyebrow>
            <h2 className="text-display-tight text-paper mt-3 max-w-[18ch] text-[2.25rem] leading-[1.05] md:text-[3.5rem]">
              Better evidence. Smarter decisions.
            </h2>
            <p className="text-paper/80 mt-5 max-w-[46ch]">
              [PLACEHOLDER] The capacity-building sentence from the brief.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg">
                Explore programmes
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="border-paper/40 text-paper hover:border-paper hover:bg-paper/10"
              >
                Partner with SRN
              </Button>
            </div>
          </div>
        </OverlayImage>
      </Row>

      <Row
        title="Form fields — all states"
        note="Errors say what went wrong and how to fix it. Never apologise, never vague."
      >
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <TextField
            id="sg-name"
            label="Full name"
            required
            placeholder="Your name"
          />
          <TextField
            id="sg-email"
            label="Email address"
            required
            type="email"
            defaultValue="not-an-email"
            error="Enter an email address, like name@university.edu"
          />
          <TextField
            id="sg-inst"
            label="Institution"
            hint="Where you work or study."
            placeholder="University or organisation"
          />
          <SelectField id="sg-country" label="Country" required defaultValue="">
            <option value="" disabled>
              Select your country
            </option>
            <option>Nigeria</option>
            <option>Ghana</option>
            <option>Rwanda</option>
          </SelectField>
          <TextField
            id="sg-disabled"
            label="Disabled field"
            disabled
            defaultValue="Registration has closed"
          />
          <div className="md:col-span-2">
            <TextareaField
              id="sg-motivation"
              label="Why do you want to join this programme?"
              required
              maxLength={2000}
              defaultValue="[PLACEHOLDER] A partial answer, showing the character counter in use."
              hint="Tell us what you hope to achieve."
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <FormMessage tone="success">
              You&apos;re registered. Check your email for the joining link.
            </FormMessage>
            <FormMessage tone="error">
              This event is fully booked. Join the waiting list and we&apos;ll
              email you if a place opens.
            </FormMessage>
          </div>
          <Honeypot />
        </div>
      </Row>

      <Row
        title="Empty states"
        note="Invitations, not dead ends (§4 writing rules)."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-hairline rounded-[var(--radius-card)] border border-dashed p-8 text-center">
            <p className="text-ink font-semibold">No events yet</p>
            <p className="text-slate text-small mt-1">
              Create your first event to see it here.
            </p>
            <Button variant="primary" className="mt-4">
              Create an event
            </Button>
          </div>
          <div className="border-hairline rounded-[var(--radius-card)] border border-dashed p-8 text-center">
            <p className="text-ink font-semibold">
              No resources match those filters
            </p>
            <p className="text-slate text-small mt-1">
              Try clearing a filter to see more.
            </p>
            <Button variant="secondary" className="mt-4">
              Clear filters
            </Button>
          </div>
        </div>
      </Row>

      <Row
        title="Placeholder blocks"
        note="§7 — never stock. Dimension-labelled blocks, so nothing fake can ship."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlaceholderBlock width={2400} height={900} label="hero" />
          <PlaceholderBlock width={800} height={800} label="headshot" />
          <PlaceholderBlock width={1600} height={900} label="event photo" />
        </div>
      </Row>

      <footer className="border-hairline mt-8 border-t pt-8">
        <a
          href="/styleguide"
          className="text-evidence inline-flex items-center gap-1.5 font-medium"
        >
          Palette, type, and spacing
          <ArrowRight size={16} strokeWidth={1.5} />
        </a>
      </footer>
    </main>
  );
}
