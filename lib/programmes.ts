import {
  GraduationCap,
  Users,
  BookOpen,
  Presentation,
  Building2,
  type LucideIcon,
} from "lucide-react";

/* The five SRN programmes (§5.2). Programmes are NOT a database entity — they
   are structural offerings whose shape rarely changes — so they live here as
   the single source of truth shared by the homepage index, the Programmes hub,
   and each subpage. Content is real and grounded in what SRN does; no invented
   figures.

   CTA `kind` decides where the button routes:
     - "apply"   → /programmes/apply (application intake, wired in Phase 4)
     - "interest"→ /programmes/apply?p=<slug> (register interest, same form)
     - "partner" → /partner (institutional request)
   Until Phase 4 the apply route is a stub; the links are correct now. */

export type ProgrammeCTA = "apply" | "interest" | "partner";

export type Programme = {
  slug: string;
  icon: LucideIcon;
  title: string;
  /** One-line summary for cards and the index. */
  tagline: string;
  audience: string;
  format: string;
  duration: string;
  /** Lead paragraph on the subpage. */
  intro: string;
  /** "What you'll learn / what it covers" — 4–6 concrete points. */
  covers: string[];
  /** Who it's for, expanded. */
  forWho: string[];
  cta: { kind: ProgrammeCTA; label: string };
};

export const PROGRAMMES: Programme[] = [
  {
    slug: "beginner-academy",
    icon: GraduationCap,
    title: "Beginner Academy",
    tagline: "For researchers taking on their first systematic review.",
    audience: "Students & early-career researchers",
    format: "Online, cohort-based",
    duration: "4 weeks",
    intro:
      "The Beginner Academy takes you from a first, answerable question to a clear plan for a systematic review — the foundations, taught plainly, by people who do this work. No prior review experience is assumed.",
    covers: [
      "Framing a clear, answerable review question (PICO and its cousins)",
      "Writing a protocol and why pre-registration matters",
      "Building and running a reproducible literature search",
      "Screening studies against explicit inclusion criteria",
      "What critical appraisal is, and where bias hides",
      "How the pieces fit into a review you can finish",
    ],
    forWho: [
      "Postgraduate students starting a review as part of their work",
      "Early-career researchers new to evidence synthesis",
      "Anyone who wants the foundations before joining a live review",
    ],
    cta: { kind: "interest", label: "Register your interest" },
  },
  {
    slug: "practical-course",
    icon: BookOpen,
    title: "Practical Course",
    tagline: "Hands-on methods for teams with a review underway.",
    audience: "Active review teams",
    format: "In person or hybrid",
    duration: "3 days, intensive",
    intro:
      "The Practical Course is for researchers who are past the basics and into the work. Three intensive days on the methods that decide whether a review holds up — worked on your own question, with facilitators alongside.",
    covers: [
      "Search strategy design and peer review of searches",
      "Screening at scale and managing reviewer agreement",
      "Risk-of-bias assessment with standard tools",
      "Data extraction that survives scrutiny",
      "The principles of meta-analysis and when not to pool",
      "Reporting to PRISMA and preparing for submission",
    ],
    forWho: [
      "Teams with a protocol and a review in progress",
      "Researchers who have completed the Beginner Academy",
      "Groups wanting facilitated time on their own review",
    ],
    cta: { kind: "apply", label: "Apply for the next course" },
  },
  {
    slug: "mentorship",
    icon: Users,
    title: "Mentorship Programme",
    tagline: "Paired guidance from an experienced reviewer, through a live review.",
    audience: "Researchers running a review",
    format: "Online, one-to-one",
    duration: "Up to 6 months",
    intro:
      "The Mentorship Programme pairs you with an experienced reviewer for the length of a live review — so the methodological choices that usually cause second-guessing are made with someone who has made them before.",
    covers: [
      "A mentor matched to your topic and method",
      "Regular one-to-one sessions across the review",
      "Review of your protocol, search, and screening decisions",
      "Guidance through synthesis and, where relevant, meta-analysis",
      "Support preparing the manuscript for submission",
    ],
    forWho: [
      "Researchers with a review underway and a clear question",
      "Teams who want continuity of guidance, not one-off advice",
      "Graduates of the Practical Course ready to go it (nearly) alone",
    ],
    cta: { kind: "apply", label: "Apply for mentorship" },
  },
  {
    slug: "webinar-series",
    icon: Presentation,
    title: "Webinar Series",
    tagline: "Open sessions on method and evidence, free to attend.",
    audience: "Open to everyone",
    format: "Online, live + recorded",
    duration: "Ongoing",
    intro:
      "The Webinar Series brings method and evidence into the open — short, focused live sessions on the questions reviewers actually face, free to attend and recorded for anyone who misses them.",
    covers: [
      "Focused sessions on specific methods and tools",
      "Practical clinics on common review problems",
      "Guest speakers from the wider evidence community",
      "Recordings added to the open resources library",
    ],
    forWho: [
      "Anyone curious about systematic reviews",
      "Researchers wanting to keep methods current",
      "Past participants staying connected to the network",
    ],
    cta: { kind: "interest", label: "Hear about upcoming webinars" },
  },
  {
    slug: "institutional-training",
    icon: Building2,
    title: "Institutional Training",
    tagline: "Review capacity built across a department or faculty.",
    audience: "Institutions & funders",
    format: "Bespoke, on-site or online",
    duration: "Scoped to your needs",
    intro:
      "Institutional Training brings SRN to your department, faculty, or programme — a curriculum scoped to your people and their work, delivered where it's needed and designed to leave lasting capacity behind.",
    covers: [
      "A curriculum scoped to your researchers and their questions",
      "Delivery on-site, online, or hybrid",
      "Train-the-trainer options so capacity stays after we leave",
      "Cohorts sized to your department or programme",
      "Ongoing mentorship pathways for participants",
    ],
    forWho: [
      "Universities and research institutes",
      "Programmes and funders building synthesis capacity",
      "Departments wanting a cohort trained together",
    ],
    cta: { kind: "partner", label: "Request training for your institution" },
  },
];

export function getProgramme(slug: string): Programme | undefined {
  return PROGRAMMES.find((p) => p.slug === slug);
}

/** Resolves a CTA to its href. Apply/interest route to the (Phase 4) intake. */
export function ctaHref(p: Programme): string {
  switch (p.cta.kind) {
    case "partner":
      return "/partner";
    case "interest":
      return `/programmes/apply?p=${p.slug}`;
    case "apply":
    default:
      return `/programmes/apply?p=${p.slug}`;
  }
}
